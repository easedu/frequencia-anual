import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS, FIREBASE_PATHS_V3 } from '@/config/constants';
import { apiCache, withTimeout } from '@/utils/apiOptimization';
import { Student } from '@/types';
import { StudentDataService } from '@/services/studentDataService';

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

// Cache para dados do ano letivo (reutilizando o padrão existente)
async function loadAcademicYearData(): Promise<any> {
  const cacheKey = 'academic-year-2025';

  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const docRef = doc(db, '2025', 'ano_letivo');
    const docSnap = await withTimeout(getDoc(docRef), 30000, 'Timeout loading academic year');

    if (docSnap.exists()) {
      const data = docSnap.data();
      apiCache.set(cacheKey, data, 60); // Cache por 60 minutos
      return data;
    }

    return null;
  } catch (error) {
    console.error('Erro ao carregar ano letivo:', error);
    return null;
  }
}

/**
 * Carrega suspensões de todos os estudantes e retorna um Set de datas suspensas por estudante
 * OTIMIZAÇÃO: Queries paralelas massivas (100 por vez) ao invés de sequenciais
 */
async function loadStudentSuspensions(studentIds: string[]): Promise<Map<string, Set<string>>> {
  const suspensionsByStudent = new Map<string, Set<string>>();

  try {
    const startTime = Date.now();

    // OTIMIZAÇÃO: Executar todas as queries em paralelo com Promise.all()
    // Processar em chunks grandes (100 por vez) para máxima paralelização
    const chunkSize = 100;

    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const chunk = studentIds.slice(i, i + chunkSize);

      // Executar TODAS as queries do chunk em paralelo simultaneamente
      const promises = chunk.map(async (studentId) => {
        try {
          const suspensionsRef = collection(db, FIREBASE_PATHS.suspensions(studentId));
          const suspensionsSnap = await getDocs(suspensionsRef);

          const suspendedDates = new Set<string>();

          suspensionsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const startDate = new Date(data.startDate);
            const days = data.days || 0;

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
          console.warn(`Erro ao carregar suspensões do estudante ${studentId}:`, error);
          return { studentId, suspendedDates: new Set<string>() };
        }
      });

      // Aguardar TODAS as queries do chunk em paralelo
      const results = await Promise.all(promises);

      // Processar resultados
      results.forEach(({ studentId, suspendedDates }) => {
        if (suspendedDates.size > 0) {
          suspensionsByStudent.set(studentId, suspendedDates);
        }
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[SUSPENSIONS] ${suspensionsByStudent.size} estudantes com suspensões (${elapsed}ms - ${studentIds.length} queries paralelas)`);
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
          .filter((day: any) => day.isChecked) // Apenas dias letivos
          .map((day: any) => day.date)
          .filter((date: string) => {
            // Filtrar apenas datas do mês especificado (formato: YYYY-MM-DD)
            const parts = date.split('-');
            if (parts.length !== 3) return false;

            const [yearPart, monthPart, dayPart] = parts;
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

// Função para buscar faltas de estudantes em um mês específico - OTIMIZADA PARA PRODUÇÃO
async function loadStudentAbsencesForMonth(
  studentIds: string[],
  schoolDaysInMonth: string[],
  referenceMonth: string,
  suspensionsByStudent: Map<string, Set<string>>
): Promise<Record<string, number>> {
  const cacheKey = `absences-month-${referenceMonth}-${studentIds.length}`;
  const cached = apiCache.get(cacheKey) as Record<string, number> | undefined;
  if (cached) {
    return cached;
  }

  try {
    const absencesRef = collection(db, FIREBASE_PATHS.absenceControl());
    const absencesByStudent: Record<string, number> = {};

    // Inicializar todos os estudantes com 0 faltas
    studentIds.forEach(id => {
      absencesByStudent[id] = 0;
    });

    // Criar set de datas do mês para filtro rápido
    const monthDatesSet = new Set(schoolDaysInMonth);

    // FASE 1: Otimização com batches maiores e mais paralelismo
    const batchSize = 30; // Máximo permitido pelo Firestore 'in' operator
    const maxConcurrentBatches = 5; // Aumentado para mais paralelismo

    for (let i = 0; i < studentIds.length; i += batchSize * maxConcurrentBatches) {
      const concurrentBatches: Promise<void>[] = [];

      // Processar até 3 batches por vez
      for (let j = 0; j < maxConcurrentBatches && (i + j * batchSize) < studentIds.length; j++) {
        const startIndex = i + j * batchSize;
        const batch = studentIds.slice(startIndex, startIndex + batchSize);

        const batchPromise = (async () => {
          try {
            const querySnapshot = await withTimeout(
              getDocs(query(absencesRef, where('estudanteId', 'in', batch))),
              45000, // 45 segundos por batch para coleções grandes
              'Timeout loading absences batch'
            );

            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (!data.justified && data.estudanteId && data.data) {
                // Dates are now in YYYY-MM-DD format (no conversion needed)
                const dateStr = data.data;

                // Verificar se a data está em suspensão
                const studentSuspensions = suspensionsByStudent.get(data.estudanteId);
                const isSuspended = studentSuspensions?.has(dateStr) || false;

                // Contar apenas faltas em dias letivos do mês especificado E que NÃO sejam suspensões
                if (monthDatesSet.has(dateStr) && !isSuspended) {
                  absencesByStudent[data.estudanteId] = (absencesByStudent[data.estudanteId] || 0) + 1;
                }
              }
            });
          } catch (error) {
            console.warn(`Erro no batch ${startIndex}-${startIndex + batch.length - 1}:`, error);
          }
        })();

        concurrentBatches.push(batchPromise);
      }

      // Aguardar conclusão dos batches atuais antes de prosseguir
      await Promise.all(concurrentBatches);

      // FASE 1: Removido delay - com batches maiores não há risco de rate limiting
    }

    // Cache por 30 minutos
    apiCache.set(cacheKey, absencesByStudent, 30);
    return absencesByStudent;
  } catch (error) {
    console.error('[ERROR] Erro ao carregar faltas dos estudantes:', error);
    return {} as Record<string, number>;
  }
}

/**
 * Carrega contatos verificados do WhatsApp (V3 Structure Only)
 * OTIMIZAÇÃO: Queries paralelas massivas (100 por vez) usando StudentDataService
 */
async function loadVerifiedWhatsAppContacts(activeStudents: Student[]): Promise<Record<string, VerifiedContact[]>> {
  const cacheKey = 'whatsapp-verified-contacts-v3';
  const cached = apiCache.get(cacheKey) as Record<string, VerifiedContact[]> | undefined;
  if (cached) {
    return cached;
  }

  try {
    console.log('[V3] Carregando contatos verificados do WhatsApp...');
    const startTime = Date.now();

    const contactsByStudent: Record<string, VerifiedContact[]> = {};

    // OTIMIZAÇÃO: Executar queries em paralelo massivo (100 por vez)
    const chunkSize = 100;

    for (let i = 0; i < activeStudents.length; i += chunkSize) {
      const chunk = activeStudents.slice(i, i + chunkSize);

      // Executar TODAS as queries do chunk em paralelo simultaneamente
      const promises = chunk.map(async (student) => {
        try {
          const contactsRef = collection(db, FIREBASE_PATHS_V3.contacts(student.estudanteId));
          const contactsSnap = await getDocs(contactsRef);

          const verifiedContacts: VerifiedContact[] = [];

          contactsSnap.docs.forEach((docSnap) => {
            const contact = docSnap.data();

            // Aplicar filtros: WhatsApp verificado + pode receber mensagem
            if (
              contact.whatsapp?.verified &&
              contact.whatsapp?.exists &&
              contact.podeReceberWhatsapp !== false
            ) {
              verifiedContacts.push({
                nome: contact.nome || 'Contato não identificado',
                telefone: contact.telefoneNumerico || contact.telefone,
              });
            }
          });

          return { studentId: student.estudanteId, verifiedContacts };
        } catch (error) {
          console.warn(`Erro ao carregar contatos do estudante ${student.estudanteId}:`, error);
          return { studentId: student.estudanteId, verifiedContacts: [] };
        }
      });

      // Aguardar TODAS as queries do chunk em paralelo
      const results = await Promise.all(promises);

      // Processar resultados
      results.forEach(({ studentId, verifiedContacts }) => {
        if (verifiedContacts.length > 0) {
          contactsByStudent[studentId] = verifiedContacts;
        }
      });
    }

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

    // Carregar estudantes ativos da estrutura V3
    const allStudents = await withTimeout(
      StudentDataService.getStudents(false, false), // includeDeleted: false, includeContacts: false
      15000,
      'Timeout loading students from V3'
    );

    const activeStudents = allStudents.filter(student => student.status === 'ATIVO');

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