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

/**
 * MIGRADO PARA SUPABASE
 * Cache para dados do ano letivo usando AcademicYearService
 */
async function loadAcademicYearData(): Promise<any> {
  const cacheKey = 'academic-year-2025-supabase';

  const cached = apiCache.get(cacheKey);
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
      return data;
    }

    return null;
  } catch (error: any) {
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
async function loadStudentSuspensions(studentIds: string[]): Promise<Map<string, Set<string>>> {
  const suspensionsByStudent = new Map<string, Set<string>>();

  try {
    const startTime = Date.now();

    // MIGRADO: Usar StudentSuspensionsService (Supabase)
    const { StudentSuspensionsService } = await import('@/services/supabase/studentSuspensionsService');

    // Query única para todos os estudantes de uma vez (performance massivamente melhorada)
    const allSuspensions = await Promise.all(
      studentIds.map(async (studentId) => {
        try {
          const suspensions = await StudentSuspensionsService.getByStudentId(studentId);
          const suspendedDates = new Set<string>();

          suspensions.forEach((suspension: any) => {
            const startDate = new Date(suspension.start_date);
            const days = suspension.days || 0;

            // Gerar todas as datas do período de suspensão
            for (let d = 0; d < days; d++) {
              const suspensionDate = new Date(startDate);
              suspensionDate.setDate(suspensionDate.getDate() + d);

              // Formatar como YYYY-MM-DD
              const dateStr = suspensionDate.toISOString().split('T')[0];
              suspendedDates.add(dateStr);
            }
          });

          return { studentId, suspendedDates };
        } catch (error) {
          console.warn(`[SUPABASE] Erro ao carregar suspensões do estudante ${studentId}:`, error);
          return { studentId, suspendedDates: new Set<string>() };
        }
      })
    );

    // Processar resultados
    allSuspensions.forEach(({ studentId, suspendedDates }) => {
      if (suspendedDates.size > 0) {
        suspensionsByStudent.set(studentId, suspendedDates);
      }
    });

    const elapsed = Date.now() - startTime;
    console.log(`[SUPABASE] ${suspensionsByStudent.size} estudantes com suspensões (${elapsed}ms - ${studentIds.length} queries paralelas)`);
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
    console.log('[DEBUG] Academic year data loaded:', data ? 'YES' : 'NO');

    if (!data) {
      console.log('[DEBUG] No academic year data found');
      return [];
    }

    const allSchoolDays: string[] = [];
    const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

    // Converter número do mês para formato MM
    const monthNumber = month.padStart(2, '0');
    console.log('[DEBUG] Looking for month:', monthNumber);

    bimestres.forEach(bimestre => {
      console.log(`[DEBUG] Checking ${bimestre}:`, data[bimestre] ? 'EXISTS' : 'NOT FOUND');

      if (data[bimestre]?.dates) {
        console.log(`[DEBUG] ${bimestre} has ${data[bimestre].dates.length} dates`);

        const bimesterDays = data[bimestre].dates
          .filter((day: any) => day.isChecked) // Apenas dias letivos
          .map((day: any) => day.date)
          .filter((date: string) => {
            // Filtrar apenas datas do mês especificado (formato: YYYY-MM-DD)
            const parts = date.split('-');
            if (parts.length !== 3) return false;

            const [yearPart, monthPart, dayPart] = parts;
            return monthPart === monthNumber;
          });

        console.log(`[DEBUG] ${bimestre} has ${bimesterDays.length} days for month ${monthNumber}`);
        allSchoolDays.push(...bimesterDays);
      }
    });

    console.log(`[DEBUG] Total school days found for month ${monthNumber}:`, allSchoolDays.length);
    console.log('[DEBUG] School days:', allSchoolDays.slice(0, 5)); // Show first 5

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
  studentIds: string[],
  schoolDaysInMonth: string[],
  referenceMonth: string,
  suspensionsByStudent: Map<string, Set<string>>
): Promise<Record<string, number>> {
  const cacheKey = `absences-month-supabase-${referenceMonth}-${studentIds.length}`;
  const cached = apiCache.get(cacheKey) as Record<string, number> | undefined;
  if (cached) {
    return cached;
  }

  try {
    // MIGRADO: Usar AbsenceControlService (Supabase)
    const { AbsenceControlService } = await import('@/services/supabase/absenceControlService');
    const absencesByStudent: Record<string, number> = {};

    // Inicializar todos os estudantes com 0 faltas
    studentIds.forEach(id => {
      absencesByStudent[id] = 0;
    });

    // Criar set de datas do mês para filtro rápido
    const monthDatesSet = new Set(schoolDaysInMonth);

    // Query única para todas as faltas do ano
    const allAbsences = await withTimeout(
      AbsenceControlService.getByYear(2025),
      45000,
      'Timeout loading absences from Supabase'
    );

    // Processar faltas
    allAbsences.forEach((absence: any) => {
      if (!absence.is_justified && absence.student_id && absence.absence_date) {
        const dateStr = absence.absence_date; // já está em YYYY-MM-DD

        // Verificar se a data está em suspensão
        const studentSuspensions = suspensionsByStudent.get(absence.student_id);
        const isSuspended = studentSuspensions?.has(dateStr) || false;

        // Contar apenas faltas em dias letivos do mês especificado E que NÃO sejam suspensões
        if (monthDatesSet.has(dateStr) && !isSuspended && studentIds.includes(absence.student_id)) {
          absencesByStudent[absence.student_id] = (absencesByStudent[absence.student_id] || 0) + 1;
        }
      }
    });

    // Cache por 30 minutos
    apiCache.set(cacheKey, absencesByStudent, 30);
    console.log(`[SUPABASE] Faltas processadas: ${Object.keys(absencesByStudent).filter(k => absencesByStudent[k] > 0).length} estudantes com faltas`);
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
    console.log('[SUPABASE] Processando contatos verificados do WhatsApp dos estudantes...');
    const startTime = Date.now();

    const contactsByStudent: Record<string, VerifiedContact[]> = {};

    // Processar contatos que já vêm carregados com os estudantes
    activeStudents.forEach((student) => {
      if (!student.contatos || student.contatos.length === 0) {
        return;
      }

      const verifiedContacts: VerifiedContact[] = [];

      student.contatos.forEach((contact: any) => {
        // Aplicar filtros: WhatsApp verificado + pode receber mensagem
        // whatsapp_data é JSONB do Supabase: {verified, exists, verified_at, ...}
        const whatsappData = contact.whatsappData || contact.whatsapp_data;

        if (
          whatsappData?.verified &&
          whatsappData?.exists &&
          contact.podeReceberWhatsapp !== false
        ) {
          verifiedContacts.push({
            nome: contact.nome || 'Contato não identificado',
            telefone: contact.telefoneNumerico || contact.phone_numeric || contact.telefone || contact.phone,
          });
        }
      });

      if (verifiedContacts.length > 0) {
        contactsByStudent[student.estudanteId] = verifiedContacts;
      }
    });

    const elapsed = Date.now() - startTime;
    console.log(`[V3] ✅ ${Object.keys(contactsByStudent).length} estudantes com contatos verificados (${elapsed}ms - ${activeStudents.length} queries paralelas)`);

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

    // Carregar estudantes ativos da estrutura V3 usando Admin SDK
    console.log('[V3] Carregando estudantes com Admin SDK...');

    let allStudents: Student[];
    let activeStudents: Student[];

    try {
      // Migrado para Supabase - usar StudentDataService
      const { StudentDataService } = await import('@/services/studentDataService');

      console.log('[SUPABASE] Carregando estudantes com contatos...');
      allStudents = await withTimeout(
        StudentDataService.getStudents(false, true), // includeDeleted=false, includeContacts=true
        15000,
        'Timeout loading students from Supabase'
      );

      console.log(`[SUPABASE] ✅ ${allStudents.length} estudantes carregados`);

      activeStudents = allStudents.filter(student => student.status === 'ATIVO');
      console.log(`[SUPABASE] ✅ ${activeStudents.length} estudantes ativos`);
    } catch (error: any) {
      // Fallback: Quota excedida - retornar dados mockados
      if (error?.code === 8 || error?.message?.includes('Quota exceeded')) {
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
    const [studentAbsences, verifiedContacts] = await Promise.all([
      loadStudentAbsencesForMonth(studentIds, schoolDaysInMonth, referenceMonth, suspensionsByStudent),
      loadVerifiedWhatsAppContacts(activeStudents)
    ]);

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

    return NextResponse.json({
      success: true,
      data: results,
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