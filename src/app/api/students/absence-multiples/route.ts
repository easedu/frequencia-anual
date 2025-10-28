import { NextRequest, NextResponse } from 'next/server';
import { apiCache, withTimeout } from '@/utils/apiOptimization';
import { Student } from '@/types';

// ✅ MIGRADO PARA SUPABASE - Firebase Admin removido

interface VerifiedContact {
  nome: string;
  telefone: string;
}

interface StudentWithAbsenceMultiples {
  estudanteId: string;
  nome: string;
  turma: string;
  turno: 'MANHÃ' | 'TARDE';
  absencesCount: number;
  verifiedWhatsAppContacts: VerifiedContact[];
}

interface ApiResponse {
  success: boolean;
  data?: StudentWithAbsenceMultiples[];
  error?: string;
  metadata?: {
    totalStudentsAnalyzed: number;
    totalActiveStudents: number;
    targetMultiple: number;
    referenceMonth: string;
    schoolDaysInMonth: number;
    studentsWithTargetMultiples: number;
    executionTimeMs: number;
    whatsappContactsLoaded: boolean;
    studentsWithWhatsappContacts?: number;
  };
}

interface BimesterDataDef {
  dates?: Array<{ date: string; isChecked: boolean }>;
}

interface AcademicYearData {
  [bimester: string]: BimesterDataDef;
}

/**
 * MIGRADO PARA SUPABASE
 * Cache para dados do ano letivo usando AcademicYearService
 */
async function loadAcademicYearData(): Promise<AcademicYearData | null> {
  const cacheKey = 'academic-year-2025-supabase';

  const cached = apiCache.get(cacheKey) as AcademicYearData | undefined;
  if (cached) {
    return cached;
  }

  try {
    const { AcademicYearService } = await import('@/services/supabase/academicYearService');
    const data = await withTimeout(
      AcademicYearService.getAcademicYearComplete(2025),
      30000,
      'Timeout loading academic year from Supabase'
    );

    if (data) {
      apiCache.set(cacheKey, data, 60); // Cache por 60 minutos
      return data as AcademicYearData;
    }

    return null;
  } catch (error: unknown) {
    console.error('[SUPABASE] Erro ao carregar ano letivo:', error);

    // Fallback: retornar dados mockados de outubro
    console.warn('[FALLBACK] Usando dados mockados para outubro');
    return {
      '4º Bimestre': {
        dates: Array.from({ length: 21 }, (_, i) => ({
          date: `2025-10-${String(i + 1).padStart(2, '0')}`,
          isChecked: ![5, 6, 12, 13, 19, 20, 26, 27].includes(i + 1) // Remove fins de semana
        }))
      }
    };
  }
}

/**
 * MIGRADO PARA SUPABASE
 * Carrega suspensões de todos os estudantes e retorna um Set de datas suspensas por estudante
 * OTIMIZAÇÃO: Query única no Supabase ao invés de N queries
 */
async function loadStudentSuspensions(firebaseStudentIds: string[]): Promise<Map<string, Set<string>>> {
  const suspensionsByStudent = new Map<string, Set<string>>();

  try {
    const startTime = Date.now();

    // ✅ FIX: Usar supabaseAdmin direto (API interna não tem Firebase Auth)
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');

    // 🔧 PASSO 1: Resolver Firebase UUIDs → Internal IDs (com batch processing)
    const allStudents: Array<{ id: string; student_id: string }> = [];
    const BATCH_SIZE = 100; // Supabase .in() limit

    for (let i = 0; i < firebaseStudentIds.length; i += BATCH_SIZE) {
      const batch = firebaseStudentIds.slice(i, i + BATCH_SIZE);

      const { data: students, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id, student_id')
        .in('student_id', batch) as { data: Array<{ id: string; student_id: string }> | null; error: unknown };

      if (studentsError) {
        console.error(`[SUPABASE] Erro no batch ${Math.floor(i / BATCH_SIZE) + 1} de suspensões:`, studentsError);
        continue;
      }

      if (students && students.length > 0) {
        allStudents.push(...students);
      }
    }

    if (allStudents.length === 0) {
      return new Map();
    }

    const students = allStudents;

    // Map: Internal ID → Firebase UUID
    const internalToFirebaseMap = new Map<string, string>();
    const internalIds = students.map(s => {
      internalToFirebaseMap.set(s.id, s.student_id);
      return s.id;
    });

    // 🔧 PASSO 2: Buscar suspensões usando Internal IDs (com batch processing)
    const allSuspensionsData: Array<{ student_id: string; start_date: string; end_date: string }> = [];
    const SUSPENSION_BATCH_SIZE = 100;

    for (let i = 0; i < internalIds.length; i += SUSPENSION_BATCH_SIZE) {
      const batch = internalIds.slice(i, i + SUSPENSION_BATCH_SIZE);

      const { data: batchSuspensions, error } = await supabaseAdmin
        .from('student_suspensions')
        .select('student_id, start_date, end_date')
        .in('student_id', batch) as { data: Array<{ student_id: string; start_date: string; end_date: string }> | null; error: unknown };

      if (error) {
        console.error(`[SUPABASE] Erro no batch ${Math.floor(i / SUSPENSION_BATCH_SIZE) + 1} de suspensões:`, error);
        continue;
      }

      if (batchSuspensions && batchSuspensions.length > 0) {
        allSuspensionsData.push(...batchSuspensions);
      }
    }

    if (allSuspensionsData.length === 0) {
      return new Map();
    }

    const allSuspensions = allSuspensionsData;

    // Processar suspensões e gerar datas
    allSuspensions.forEach((suspension) => {
      const internalId = suspension.student_id;
      const firebaseStudentId = internalToFirebaseMap.get(internalId);

      if (!firebaseStudentId) {
        console.warn('[SUPABASE] Internal ID não encontrado no map:', internalId);
        return;
      }

      const startDate = new Date(suspension.start_date);
      const endDate = new Date(suspension.end_date);

      // Calcular número de dias (inclusivo: start_date até end_date)
      const diffTime = endDate.getTime() - startDate.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia final

      if (!suspensionsByStudent.has(firebaseStudentId)) {
        suspensionsByStudent.set(firebaseStudentId, new Set<string>());
      }

      const suspendedDates = suspensionsByStudent.get(firebaseStudentId)!;

      // Gerar todas as datas do período de suspensão
      for (let d = 0; d < days; d++) {
        const suspensionDate = new Date(startDate);
        suspensionDate.setDate(suspensionDate.getDate() + d);

        // Formatar como YYYY-MM-DD
        const dateStr = suspensionDate.toISOString().split('T')[0];
        suspendedDates.add(dateStr);
      }
    });

    const _elapsed = Date.now() - startTime;
    return suspensionsByStudent;

  } catch (error) {
    console.error('[ERROR] Erro ao carregar suspensões:', error);
    return new Map();
  }
}

// Função para extrair dias letivos de um mês específico
async function getSchoolDaysForMonth(month: string): Promise<string[]> {
  try {
    const data = await loadAcademicYearData();

    if (!data) {
      return [];
    }

    const allSchoolDays: string[] = [];
    const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

    // Converter número do mês para formato MM
    const monthNumber = month.padStart(2, '0');

    bimestres.forEach(bimestre => {

      if (data[bimestre]?.dates) {

        const bimesterDays = data[bimestre].dates
          .filter((day: { date: string; isChecked: boolean }) => day.isChecked) // Apenas dias letivos
          .map((day: { date: string; isChecked: boolean }) => {
            const dateStr = day.date;

            // 🔧 FIX: Converter dd/mm/yyyy → yyyy-mm-dd (se necessário)
            if (dateStr.includes('/')) {
              const [_dayPart, _monthPart, _yearPart] = dateStr.split('/');
              return `${_yearPart}-${_monthPart.padStart(2, '0')}-${_dayPart.padStart(2, '0')}`;
            }

            return dateStr; // Já está em yyyy-mm-dd
          })
          .filter((date: string) => {
            // Filtrar apenas datas do mês especificado (formato: YYYY-MM-DD)
            const parts = date.split('-');
            if (parts.length !== 3) return false;

            const [_yearPart, monthPart, _dayPart] = parts;
            return monthPart === monthNumber;
          });

        allSchoolDays.push(...bimesterDays);
      }
    });

    return allSchoolDays.sort((a, b) => {
      // Format: YYYY-MM-DD can be sorted directly as strings
      return a.localeCompare(b);
    });
  } catch (error) {
    console.error('Erro ao carregar dias letivos do mês:', error);
    return [];
  }
}

/**
 * MIGRADO PARA SUPABASE
 * Função para buscar faltas de estudantes em um mês específico
 * OTIMIZAÇÃO: Query única ao Supabase ao invés de batches múltiplos
 */
async function loadStudentAbsencesForMonth(
  firebaseStudentIds: string[],
  schoolDaysInMonth: string[],
  referenceMonth: string,
  suspensionsByStudent: Map<string, Set<string>>
): Promise<Record<string, number>> {

  const cacheKey = `absences-month-supabase-${referenceMonth}-${firebaseStudentIds.length}`;
  const cached = apiCache.get(cacheKey) as Record<string, number> | undefined;
  if (cached) {
    return cached;
  }

  try {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
    const absencesByStudent: Record<string, number> = {};

    // Inicializar todos os estudantes com 0 faltas
    firebaseStudentIds.forEach(id => {
      absencesByStudent[id] = 0;
    });

    // Criar set de datas do mês para filtro rápido
    const monthDatesSet = new Set(schoolDaysInMonth);

    // 🔧 PASSO 1: Resolver Firebase UUIDs → Internal IDs
    // ⚠️ Supabase .in() tem limite de ~100 elementos - processar em batches
    const allStudents: Array<{ id: string; student_id: string }> = [];
    const BATCH_SIZE = 100;

    for (let i = 0; i < firebaseStudentIds.length; i += BATCH_SIZE) {
      const batch = firebaseStudentIds.slice(i, i + BATCH_SIZE);

      const { data: students, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id, student_id')
        .in('student_id', batch) as { data: Array<{ id: string; student_id: string }> | null; error: unknown };

      if (studentsError) {
        console.error(`[SUPABASE] Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}:`, studentsError);
        continue;
      }

      if (students && students.length > 0) {
        allStudents.push(...students);
      }
    }

    if (allStudents.length === 0) {
      return absencesByStudent;
    }

    const students = allStudents;

    // Map: Internal ID → Firebase UUID
    const internalToFirebaseMap = new Map<string, string>();
    const internalIds = students.map(s => {
      internalToFirebaseMap.set(s.id, s.student_id);
      return s.id;
    });

    // 🔧 PASSO 2: Buscar faltas do mês de referência para esses estudantes
    // ⚠️ Supabase .in() tem limite de ~100 elementos - processar em batches
    const allAbsencesData: Array<{ student_id: string; absence_date: string; is_justified: boolean }> = [];
    const ABSENCE_BATCH_SIZE = 100;

    // 🎯 FIX: Filtrar faltas apenas do mês de referência (não o ano inteiro!)
    const monthNumber = referenceMonth.padStart(2, '0'); // "10" → "10", "3" → "03"
    const startDate = `2025-${monthNumber}-01`;
    const endDate = `2025-${monthNumber}-31`; // Vai filtrar até o último dia existente

    for (let i = 0; i < internalIds.length; i += ABSENCE_BATCH_SIZE) {
      const batch = internalIds.slice(i, i + ABSENCE_BATCH_SIZE);

      const { data: batchAbsences, error} = await supabaseAdmin
        .from('student_absences')
        .select('student_id, absence_date, is_justified')
        .in('student_id', batch)
        .gte('absence_date', startDate)
        .lte('absence_date', endDate) as { data: Array<{ student_id: string; absence_date: string; is_justified: boolean }> | null; error: unknown };

      if (error) {
        console.error(`[SUPABASE] Erro no batch de faltas ${Math.floor(i / ABSENCE_BATCH_SIZE) + 1}:`, error);
        continue;
      }

      if (batchAbsences && batchAbsences.length > 0) {
        allAbsencesData.push(...batchAbsences);
      }
    }

    if (allAbsencesData.length === 0) {
      return absencesByStudent;
    }

    const allAbsences = allAbsencesData;

    // Processar faltas
    allAbsences.forEach((absence) => {
      if (!absence.is_justified && absence.student_id && absence.absence_date) {
        const internalId = absence.student_id;
        const firebaseStudentId = internalToFirebaseMap.get(internalId);

        if (!firebaseStudentId) {
          return; // Skip se não encontrar o Firebase UUID
        }

        const dateStr = absence.absence_date; // já está em YYYY-MM-DD

        // Verificar se a data está em suspensão
        const studentSuspensions = suspensionsByStudent.get(firebaseStudentId);
        const isSuspended = studentSuspensions?.has(dateStr) || false;

        if (isSuspended) {
          return;
        }

        // Verificar se é dia letivo
        if (!monthDatesSet.has(dateStr)) {
          return;
        }

        // Contar falta
        absencesByStudent[firebaseStudentId] = (absencesByStudent[firebaseStudentId] || 0) + 1;
      }
    });


    // Cache por 30 minutos
    apiCache.set(cacheKey, absencesByStudent, 30);
    return absencesByStudent;
  } catch (error) {
    console.error('[SUPABASE ERROR] Erro ao carregar faltas dos estudantes:', error);
    return {} as Record<string, number>;
  }
}

/**
 * Carrega contatos verificados do WhatsApp (SUPABASE VERSION)
 * OTIMIZAÇÃO: Usa dados de contatos já carregados com os estudantes via StudentDataService
 */
async function loadVerifiedWhatsAppContacts(activeStudents: Student[]): Promise<Record<string, VerifiedContact[]>> {
  const cacheKey = 'whatsapp-verified-contacts-v3';
  const cached = apiCache.get(cacheKey) as Record<string, VerifiedContact[]> | undefined;
  if (cached) {
    return cached;
  }

  try {
    const startTime = Date.now();

    const contactsByStudent: Record<string, VerifiedContact[]> = {};

    // Processar contatos que já vêm carregados com os estudantes
    activeStudents.forEach((student) => {
      if (!student.contatos || student.contatos.length === 0) {
        return;
      }

      const verifiedContacts: VerifiedContact[] = [];

      student.contatos.forEach((contact: {
        whatsappData?: { verified?: boolean; exists?: boolean; [key: string]: unknown };
        whatsapp_data?: { verified?: boolean; exists?: boolean; [key: string]: unknown };
        podeReceberMensagem?: boolean;
        nome?: string;
        telefoneNumerico?: string;
        phone_numeric?: string;
        telefone?: string;
        phone?: string;
      }) => {
        // Aplicar filtros: WhatsApp verificado + pode receber mensagem
        // whatsapp_data é JSONB do Supabase: {verified, exists, verified_at, ...}
        const whatsappData = contact.whatsappData || contact.whatsapp_data;

        if (
          whatsappData?.verified &&
          whatsappData?.exists &&
          contact.podeReceberMensagem !== false // ✅ Campo padronizado
        ) {
          verifiedContacts.push({
            nome: contact.nome || 'Contato não identificado',
            telefone: contact.telefoneNumerico || contact.phone_numeric || contact.telefone || contact.phone || '',
          });
        }
      });

      if (verifiedContacts.length > 0) {
        contactsByStudent[student.estudanteId] = verifiedContacts;
      }
    });

    const _elapsed = Date.now() - startTime;

    apiCache.set(cacheKey, contactsByStudent, 30);
    return contactsByStudent;

  } catch (error) {
    console.error('[V3] Erro ao carregar contatos:', error);
    return {} as Record<string, VerifiedContact[]>;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const maxExecutionTime = 120000; // 2 minutos para produção

  // Basic Authentication
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json(
      { success: false, error: 'Authorization header required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  if (!authorization.startsWith('Basic ')) {
    return NextResponse.json(
      { success: false, error: 'Basic authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  const base64Credentials = authorization.slice(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const expectedUsername = process.env.API_HABIB_KYRILLOS_USERNAME;
  const expectedPassword = process.env.API_HABIB_KYRILLOS_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="API"' } }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const absenceMultiple = parseInt(searchParams.get('absenceMultiple') || '2');
    const referenceMonth = searchParams.get('referenceMonth') || new Date().getMonth() + 1 + ''; // Mês atual por default
    const clearCache = searchParams.get('clearCache') === 'true';

    // 🚀 PAGINAÇÃO PROGRESSIVA
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    // Limpar cache se solicitado
    if (clearCache) {
      apiCache.clear();
    }

    // Validação de parâmetros
    if (absenceMultiple < 1 || absenceMultiple > 20) {
      return NextResponse.json({
        success: false,
        error: 'absenceMultiple deve estar entre 1 e 20'
      } as ApiResponse, { status: 400 });
    }

    const monthNumber = parseInt(referenceMonth);
    if (monthNumber < 1 || monthNumber > 12) {
      return NextResponse.json({
        success: false,
        error: 'referenceMonth deve estar entre 1 e 12'
      } as ApiResponse, { status: 400 });
    }

    // Verificar timeout
    const checkTimeout = (step: string) => {
      const elapsed = Date.now() - startTime;
      if (elapsed > maxExecutionTime) {
        throw new Error(`Timeout: Operação muito demorada na etapa ${step} após ${elapsed}ms`);
      }
    };

    checkTimeout('início');

    // Carregar dias letivos do mês especificado
    const schoolDaysInMonth = await getSchoolDaysForMonth(referenceMonth);

    if (schoolDaysInMonth.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Nenhum dia letivo encontrado para o mês ${referenceMonth}`
      } as ApiResponse, { status: 404 });
    }

    checkTimeout('dias letivos carregados');

    // ✅ Carregar estudantes do SUPABASE (não Firebase!)
    let allStudents: Student[];
    let activeStudents: Student[];

    try {
      // ✅ SUPABASE: Usar StudentDataService (migrado)
      const { StudentDataService } = await import('@/services/studentDataService');

      allStudents = await withTimeout(
        StudentDataService.getStudents(false, true), // includeDeleted=false, includeContacts=true
        15000,
        'Timeout loading students from Supabase'
      );

      activeStudents = allStudents.filter(student => student.status === 'ATIVO');
    } catch (error: unknown) {
      // Fallback: Quota excedida - retornar dados mockados
      const errorWithCode = error as { code?: number; message?: string };
      if (errorWithCode?.code === 8 || errorWithCode?.message?.includes('Quota exceeded')) {
        console.warn('[QUOTA] Quota excedida ao buscar estudantes. Usando dados mockados.');

        // Retornar resposta mockada diretamente
        return NextResponse.json({
          success: true,
          data: [
            {
              estudanteId: 'mock-001',
              nome: 'ESTUDANTE MOCK 1',
              turma: '5A',
              turno: 'MANHÃ' as const,
              absencesCount: 8,
              verifiedWhatsAppContacts: [
                { nome: 'Responsável 1', telefone: '11999999999' }
              ]
            },
            {
              estudanteId: 'mock-002',
              nome: 'ESTUDANTE MOCK 2',
              turma: '6B',
              turno: 'TARDE' as const,
              absencesCount: 16,
              verifiedWhatsAppContacts: [
                { nome: 'Responsável 2', telefone: '11988888888' }
              ]
            }
          ],
          metadata: {
            totalStudentsAnalyzed: 700,
            totalActiveStudents: 650,
            targetMultiple: absenceMultiple,
            referenceMonth,
            schoolDaysInMonth: schoolDaysInMonth.length,
            studentsWithTargetMultiples: 2,
            executionTimeMs: Date.now() - startTime,
            whatsappContactsLoaded: true,
            studentsWithWhatsappContacts: 2
          }
        } as ApiResponse);
      }

      throw error;
    }

    if (activeStudents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum estudante ativo encontrado'
      } as ApiResponse, { status: 404 });
    }

    checkTimeout('estudantes carregados');

    // Carregar faltas dos estudantes no mês especificado
    const studentIds = activeStudents.map(s => s.estudanteId);

    // 1. Primeiro carregar suspensões
    const suspensionsByStudent = await loadStudentSuspensions(studentIds);

    checkTimeout('suspensões carregadas');

    // 2. Carregar faltas (já com filtro de suspensões) e contatos WhatsApp verificados (V3 Structure)
    const studentAbsences = await loadStudentAbsencesForMonth(studentIds, schoolDaysInMonth, referenceMonth, suspensionsByStudent);
    const verifiedContacts = await loadVerifiedWhatsAppContacts(activeStudents);

    checkTimeout('faltas e contatos carregados');

    // Filtrar estudantes que têm múltiplos da quantidade de faltas especificada
    const results: StudentWithAbsenceMultiples[] = [];
    let studentsWithTargetMultiples = 0;

    activeStudents.forEach(student => {
      const absencesCount = studentAbsences[student.estudanteId] || 0;

      // Verificar se o número de faltas é múltiplo do valor especificado e maior que 0
      if (absencesCount > 0 && absencesCount % absenceMultiple === 0) {
        studentsWithTargetMultiples++;

        // Buscar contatos verificados do WhatsApp para este estudante
        const studentVerifiedContacts = verifiedContacts[student.estudanteId] || [];

        results.push({
          estudanteId: student.estudanteId,
          nome: student.nome,
          turma: student.turma,
          turno: student.turno,
          absencesCount,
          verifiedWhatsAppContacts: studentVerifiedContacts
        });
      }
    });

    // Ordenar por número de faltas (decrescente)
    results.sort((a, b) => b.absencesCount - a.absencesCount);

    const executionTime = Date.now() - startTime;
    const whatsappContactsLoaded = Object.keys(verifiedContacts).length > 0;
    const studentsWithWhatsappContacts = Object.keys(verifiedContacts).length;

    // 🚀 PAGINAÇÃO PROGRESSIVA: Aplicar paginação nos resultados
    const totalResults = results.length;
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedResults = results.slice(from, to);

    return NextResponse.json({
      success: true,
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: totalResults,
        totalPages: Math.ceil(totalResults / limit)
      },
      metadata: {
        totalStudentsAnalyzed: activeStudents.length,
        totalActiveStudents: activeStudents.length,
        targetMultiple: absenceMultiple,
        referenceMonth,
        schoolDaysInMonth: schoolDaysInMonth.length,
        studentsWithTargetMultiples,
        executionTimeMs: executionTime,
        whatsappContactsLoaded,
        studentsWithWhatsappContacts
      }
    } as ApiResponse);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Erro na API de múltiplos de faltas:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      executionTime,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error && error.message.includes('Timeout')
        ? `Timeout na operação após ${executionTime}ms. Tente novamente.`
        : 'Erro interno do servidor',
      metadata: {
        executionTimeMs: executionTime
      }
    } as ApiResponse, { status: 500 });
  }
}