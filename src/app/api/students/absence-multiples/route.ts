import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';
import { apiCache, withTimeout } from '@/utils/apiOptimization';
import { Student } from '@/app/types';

interface VerifiedContact {
  nome: string;
  telefone: string;
  hasWhatsApp: boolean;
  verificationStatus: 'verified' | 'unavailable' | 'error';
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
    const docSnap = await withTimeout(getDoc(docRef), 8000, 'Timeout loading academic year');

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

// Função para extrair dias letivos de um mês específico
async function getSchoolDaysForMonth(month: string): Promise<string[]> {
  try {
    const data = await loadAcademicYearData();
    if (!data) return [];

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
            // Filtrar apenas datas do mês especificado (formato: dd/mm/yyyy)
            const [, monthPart] = date.split('/');
            return monthPart === monthNumber;
          });

        allSchoolDays.push(...bimesterDays);
      }
    });

    return allSchoolDays.sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });
  } catch (error) {
    console.error('Erro ao carregar dias letivos do mês:', error);
    return [];
  }
}

// Função para buscar faltas de estudantes em um mês específico
async function loadStudentAbsencesForMonth(
  studentIds: string[],
  schoolDaysInMonth: string[],
  referenceMonth: string
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

    // Aumentar batch size para melhor performance
    const batchSize = 30;
    const batchPromises: Promise<void>[] = [];

    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);

      const batchPromise = (async () => {
        try {
          const querySnapshot = await withTimeout(
            getDocs(query(absencesRef, where('estudanteId', 'in', batch))),
            12000,
            'Timeout loading absences batch'
          );

          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.justified && data.estudanteId && data.data) {
              // Converter formato yyyy-mm-dd para dd/mm/yyyy se necessário
              let dateStr = data.data;
              if (dateStr.includes('-')) {
                const [year, month, day] = dateStr.split('-');
                dateStr = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
              }

              // Contar apenas faltas em dias letivos do mês especificado
              if (monthDatesSet.has(dateStr)) {
                absencesByStudent[data.estudanteId] = (absencesByStudent[data.estudanteId] || 0) + 1;
              }
            }
          });
        } catch (error) {
          console.warn(`Erro no batch ${i}-${i + batchSize}:`, error);
        }
      })();

      batchPromises.push(batchPromise);
    }

    // Executar todos os batches em paralelo
    await Promise.all(batchPromises);

    // Cache por 30 minutos
    apiCache.set(cacheKey, absencesByStudent, 30);
    return absencesByStudent;
  } catch (error) {
    console.error('Erro ao carregar faltas dos estudantes:', error);
    return {} as Record<string, number>;
  }
}

// Função para buscar contatos verificados do WhatsApp
async function loadVerifiedWhatsAppContacts(): Promise<Record<string, VerifiedContact[]>> {
  const cacheKey = 'whatsapp-verified-contacts';
  const cached = apiCache.get(cacheKey) as Record<string, VerifiedContact[]> | undefined;
  if (cached) {
    return cached;
  }

  try {
    const verifiedContactsRef = collection(db, 'whatsapp_verified_numbers');
    const querySnapshot = await withTimeout(
      getDocs(verifiedContactsRef),
      15000,
      'Timeout loading WhatsApp verified contacts'
    );

    const contactsByStudent: Record<string, VerifiedContact[]> = {};

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.studentId && data.hasWhatsApp && data.verificationStatus === 'verified') {
        if (!contactsByStudent[data.studentId]) {
          contactsByStudent[data.studentId] = [];
        }

        contactsByStudent[data.studentId].push({
          nome: data.contactName || 'Contato não identificado',
          telefone: data.phone,
          hasWhatsApp: data.hasWhatsApp,
          verificationStatus: data.verificationStatus
        });
      }
    });

    // Cache por 45 minutos
    apiCache.set(cacheKey, contactsByStudent, 45);
    return contactsByStudent;
  } catch (error) {
    console.error('Erro ao carregar contatos verificados do WhatsApp:', error);
    return {} as Record<string, VerifiedContact[]>;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const maxExecutionTime = 45000; // 45 segundos

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
      console.log('Cache limpo por solicitação do usuário');
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

    // Verificar timeout com logs detalhados
    const checkTimeout = (step: string) => {
      const elapsed = Date.now() - startTime;
      if (elapsed > maxExecutionTime) {
        console.error(`Timeout na etapa: ${step}. Tempo decorrido: ${elapsed}ms`);
        throw new Error(`Timeout: Operação muito demorada na etapa ${step}`);
      }
      console.log(`Etapa ${step} concluída em ${elapsed}ms`);
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

    // Carregar estudantes ativos
    const studentsDocRef = doc(db, FIREBASE_PATHS.students());
    const studentsDocSnap = await withTimeout(
      getDoc(studentsDocRef),
      10000,
      'Timeout loading students'
    );

    if (!studentsDocSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Dados de estudantes não encontrados'
      } as ApiResponse, { status: 404 });
    }

    const studentsData = studentsDocSnap.data();
    const allStudents = (studentsData.estudantes || []) as Student[];
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
    const [studentAbsences, verifiedContacts] = await Promise.all([
      loadStudentAbsencesForMonth(studentIds, schoolDaysInMonth, referenceMonth),
      loadVerifiedWhatsAppContacts()
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
        executionTimeMs: executionTime
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