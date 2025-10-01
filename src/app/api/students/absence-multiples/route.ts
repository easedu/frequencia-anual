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
    whatsappContactsLoaded: boolean;
    studentsWithWhatsappContacts?: number;
  };
}

// Cache para dados do ano letivo (reutilizando o padrão existente)
async function loadAcademicYearData(): Promise<any> {
  const cacheKey = 'academic-year-2025';

  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log('[DEBUG] Dados do ano letivo carregados do cache');
    return cached;
  }

  try {
    console.log('[DEBUG] Carregando dados do ano letivo do Firebase...');
    const docRef = doc(db, '2025', 'ano_letivo');
    const docSnap = await withTimeout(getDoc(docRef), 8000, 'Timeout loading academic year');

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('[DEBUG] Dados do ano letivo carregados com sucesso');
      apiCache.set(cacheKey, data, 60); // Cache por 60 minutos
      return data;
    }

    console.error('[ERROR] Documento do ano letivo não existe no Firebase');
    return null;
  } catch (error) {
    console.error('[ERROR] Erro ao carregar ano letivo:', error);
    return null;
  }
}

// Função para extrair dias letivos de um mês específico
async function getSchoolDaysForMonth(month: string): Promise<string[]> {
  try {
    const data = await loadAcademicYearData();
    if (!data) {
      console.error('[ERROR] Dados do ano letivo não carregados');
      return [];
    }

    const allSchoolDays: string[] = [];
    const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

    // Converter número do mês para formato MM
    const monthNumber = month.padStart(2, '0');
    console.log(`[DEBUG] Buscando dias letivos para mês: ${month} (formatado: ${monthNumber})`);

    bimestres.forEach(bimestre => {
      if (data[bimestre]?.dates) {
        console.log(`[DEBUG] Processando ${bimestre}, total de datas: ${data[bimestre].dates.length}`);

        const bimesterDays = data[bimestre].dates
          .filter((day: any) => day.isChecked) // Apenas dias letivos
          .map((day: any) => day.date)
          .filter((date: string) => {
            // Filtrar apenas datas do mês especificado (formato: dd/mm/yyyy)
            const parts = date.split('/');
            if (parts.length !== 3) return false;

            const [dayPart, monthPart, yearPart] = parts;
            const match = monthPart === monthNumber;

            if (match) {
              console.log(`[DEBUG] Data encontrada no mês ${monthNumber}: ${date}`);
            }

            return match;
          });

        console.log(`[DEBUG] ${bimestre}: ${bimesterDays.length} dias encontrados para mês ${monthNumber}`);
        allSchoolDays.push(...bimesterDays);
      } else {
        console.log(`[DEBUG] ${bimestre} não tem dados ou não tem campo 'dates'`);
      }
    });

    console.log(`[DEBUG] Total de dias letivos encontrados para mês ${monthNumber}: ${allSchoolDays.length}`);

    return allSchoolDays.sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });
  } catch (error) {
    console.error('[ERROR] Erro ao carregar dias letivos do mês:', error);
    return [];
  }
}

// Função para buscar faltas de estudantes em um mês específico - OTIMIZADA PARA PRODUÇÃO
async function loadStudentAbsencesForMonth(
  studentIds: string[],
  schoolDaysInMonth: string[],
  referenceMonth: string
): Promise<Record<string, number>> {
  const cacheKey = `absences-month-${referenceMonth}-${studentIds.length}`;
  const cached = apiCache.get(cacheKey) as Record<string, number> | undefined;
  if (cached) {
    console.log('[DEBUG] Faltas carregadas do cache');
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
    console.log(`[DEBUG] Processando ${studentIds.length} estudantes em batches menores e sequenciais`);

    // NOVA ESTRATÉGIA: Batches menores e sequenciais para evitar sobrecarga
    const batchSize = 10; // Reduzido drasticamente
    const maxConcurrentBatches = 3; // Máximo 3 queries simultâneas

    for (let i = 0; i < studentIds.length; i += batchSize * maxConcurrentBatches) {
      const concurrentBatches: Promise<void>[] = [];

      // Processar até 3 batches por vez
      for (let j = 0; j < maxConcurrentBatches && (i + j * batchSize) < studentIds.length; j++) {
        const startIndex = i + j * batchSize;
        const batch = studentIds.slice(startIndex, startIndex + batchSize);

        const batchPromise = (async () => {
          try {
            console.log(`[DEBUG] Processando batch ${startIndex}-${startIndex + batch.length - 1}`);
            const querySnapshot = await withTimeout(
              getDocs(query(absencesRef, where('estudanteId', 'in', batch))),
              20000, // Aumentado para 20s por batch individual
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
            console.log(`[DEBUG] Batch ${startIndex}-${startIndex + batch.length - 1} concluído`);
          } catch (error) {
            console.warn(`[ERROR] Erro no batch ${startIndex}-${startIndex + batch.length - 1}:`, error);
          }
        })();

        concurrentBatches.push(batchPromise);
      }

      // Aguardar conclusão dos batches atuais antes de prosseguir
      await Promise.all(concurrentBatches);

      // Pequena pausa entre grupos de batches para evitar rate limiting
      if (i + batchSize * maxConcurrentBatches < studentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalWithAbsences = Object.values(absencesByStudent).filter(count => count > 0).length;
    console.log(`[DEBUG] Faltas processadas: ${totalWithAbsences} estudantes com faltas`);

    // Cache por 30 minutos
    apiCache.set(cacheKey, absencesByStudent, 30);
    return absencesByStudent;
  } catch (error) {
    console.error('[ERROR] Erro ao carregar faltas dos estudantes:', error);
    return {} as Record<string, number>;
  }
}

// Função para buscar contatos verificados do WhatsApp (CORRIGIDA)
async function loadVerifiedWhatsAppContacts(): Promise<Record<string, VerifiedContact[]>> {
  const cacheKey = 'whatsapp-verified-contacts';
  const cached = apiCache.get(cacheKey) as Record<string, VerifiedContact[]> | undefined;
  if (cached) {
    console.log('[DEBUG] Contatos WhatsApp carregados do cache');
    return cached;
  }

  try {
    console.log('[DEBUG] Carregando contatos WhatsApp do Firebase...');
    const verifiedContactsRef = collection(db, 'whatsapp_verified_numbers');

    // Reduzir timeout e adicionar fallback
    const querySnapshot = await withTimeout(
      getDocs(verifiedContactsRef),
      8000, // Reduzido de 15000 para 8000
      'Timeout loading WhatsApp verified contacts'
    );

    const contactsByStudent: Record<string, VerifiedContact[]> = {};
    let totalDocuments = 0;
    let phoneToStudentMap: Record<string, string> = {};
    let phoneToContactName: Record<string, string> = {}; // Mover para escopo global
    let documentsWithStudentId = 0;
    let documentsWithWhatsApp = 0;

    // ETAPA 1: Mapear todos os números de telefone que têm WhatsApp
    const verifiedNumbers = new Map<string, { hasWhatsApp: boolean; contactName?: string; studentId?: string }>();

    querySnapshot.forEach((docSnap) => {
      totalDocuments++;
      const data = docSnap.data();
      const phoneNumber = docSnap.id; // A chave do documento é o número do telefone

      // Guardar informações do telefone
      verifiedNumbers.set(phoneNumber, {
        hasWhatsApp: data.hasWhatsApp,
        contactName: data.contactName,
        studentId: data.studentId
      });

      if (data.studentId) {
        documentsWithStudentId++;
        phoneToStudentMap[phoneNumber] = data.studentId;
      }

      if (data.hasWhatsApp) {
        documentsWithWhatsApp++;
      }
    });

    console.log(`[DEBUG] Mapeamento inicial:`, {
      totalDocuments,
      documentsWithStudentId,
      documentsWithWhatsApp,
      phoneNumbersWithStudentId: Object.keys(phoneToStudentMap).length
    });

    // ETAPA 2: Buscar estudantes para fazer correspondência dos telefones sem studentId
    const studentsDocRef = doc(db, FIREBASE_PATHS.students());
    const studentsDocSnap = await getDoc(studentsDocRef);

    if (studentsDocSnap.exists()) {
      const studentsData = studentsDocSnap.data();
      const allStudents = (studentsData.estudantes || []) as any[];

      // Criar mapa de telefone -> estudanteId E nome do contato baseado nos dados dos estudantes

      allStudents.forEach(student => {
        if (student.contatos && student.contatos.length > 0) {
          student.contatos.forEach((contato: any) => {
            if (contato.telefone) {
              const cleanPhone = contato.telefone.replace(/\D/g, '');
              if (cleanPhone.length >= 10 && verifiedNumbers.has(cleanPhone)) {
                phoneToStudentMap[cleanPhone] = student.estudanteId;
                phoneToContactName[cleanPhone] = contato.nome || 'Contato não identificado';

                // Debug específico para EMANUELLY
                if (student.estudanteId === 'ecce6b78-e3c6-40df-bc7f-2666aef65a1a') {
                  console.log(`[DEBUG] Mapeamento encontrado para EMANUELLY:`, {
                    telefone: `${cleanPhone.substring(0, 4)}****${cleanPhone.substring(cleanPhone.length - 4)}`,
                    contatoNome: contato.nome,
                    hasWhatsApp: verifiedNumbers.get(cleanPhone)?.hasWhatsApp
                  });
                }
              }
            }
          });
        }
      });
    }

    console.log(`[DEBUG] Após mapeamento com estudantes:`, {
      phoneNumbersWithStudentId: Object.keys(phoneToStudentMap).length
    });

    // ETAPA 3: Construir resultado final agrupado por studentId
    verifiedNumbers.forEach((phoneData, phoneNumber) => {
      const studentId = phoneToStudentMap[phoneNumber];
      const contactName = phoneToContactName[phoneNumber];

      // Só incluir se tem WhatsApp e conseguimos mapear para um estudante
      if (phoneData.hasWhatsApp && studentId) {
        if (!contactsByStudent[studentId]) {
          contactsByStudent[studentId] = [];
        }

        contactsByStudent[studentId].push({
          nome: contactName || phoneData.contactName || 'Contato não identificado',
          telefone: phoneNumber,
          hasWhatsApp: phoneData.hasWhatsApp,
          verificationStatus: 'verified'
        });
      }
    });

    console.log(`[DEBUG] Resultado final:`, {
      studentsWithContacts: Object.keys(contactsByStudent).length,
      totalContactsWithWhatsApp: Object.values(contactsByStudent).reduce((acc, contacts) => acc + contacts.length, 0)
    });

    // Cache por 45 minutos
    apiCache.set(cacheKey, contactsByStudent, 45);
    return contactsByStudent;
  } catch (error) {
    console.error('[ERROR] Erro ao carregar contatos verificados do WhatsApp:', error);
    // Retorna objeto vazio em caso de erro para não bloquear a API
    return {} as Record<string, VerifiedContact[]>;
  }
}

// Função alternativa para carregar contatos sem bloquear a API principal
async function loadVerifiedWhatsAppContactsSafe(): Promise<Record<string, VerifiedContact[]>> {
  try {
    return await Promise.race([
      loadVerifiedWhatsAppContacts(),
      new Promise<Record<string, VerifiedContact[]>>((resolve) => {
        setTimeout(() => {
          console.log('[WARNING] WhatsApp contacts loading timed out, returning empty');
          resolve({} as Record<string, VerifiedContact[]>);
        }, 6000); // 6 segundos
      })
    ]);
  } catch (error) {
    console.error('[ERROR] Failed to load WhatsApp contacts safely:', error);
    return {} as Record<string, VerifiedContact[]>;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const maxExecutionTime = 120000; // 2 minutos para produção

  // Debug environment info
  console.log(`[DEBUG] Environment - NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[DEBUG] Current school year: ${process.env.NEXT_PUBLIC_SCHOOL_YEAR || 'default'}`);
  console.log(`[DEBUG] Firebase paths - Students: ${FIREBASE_PATHS.students()}, Absences: ${FIREBASE_PATHS.absenceControl()}`);

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
        console.error(`[TIMEOUT] Etapa: ${step}. Tempo decorrido: ${elapsed}ms`);
        throw new Error(`Timeout: Operação muito demorada na etapa ${step} após ${elapsed}ms`);
      }
      console.log(`[TIMING] Etapa ${step} concluída em ${elapsed}ms`);
    };

    checkTimeout('início');

    // Carregar dias letivos do mês especificado
    console.log(`[DEBUG] Carregando dias letivos para o mês: ${referenceMonth}`);
    const schoolDaysInMonth = await getSchoolDaysForMonth(referenceMonth);
    console.log(`[DEBUG] Dias letivos encontrados: ${schoolDaysInMonth.length}`, schoolDaysInMonth);

    if (schoolDaysInMonth.length === 0) {
      console.error(`[ERROR] Nenhum dia letivo encontrado para o mês ${referenceMonth}`);
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
    console.log(`[DEBUG] Total de estudantes na base: ${allStudents.length}`);

    const activeStudents = allStudents.filter(student => student.status === 'ATIVO');
    console.log(`[DEBUG] Estudantes ativos: ${activeStudents.length}`);

    if (activeStudents.length === 0) {
      console.error('[ERROR] Nenhum estudante ativo encontrado');
      return NextResponse.json({
        success: false,
        error: 'Nenhum estudante ativo encontrado'
      } as ApiResponse, { status: 404 });
    }

    checkTimeout('estudantes carregados');

    // Carregar faltas dos estudantes no mês especificado
    const studentIds = activeStudents.map(s => s.estudanteId);
    console.log(`[DEBUG] IDs dos estudantes para carregar faltas: ${studentIds.length}`);

    const [studentAbsences, verifiedContacts] = await Promise.all([
      loadStudentAbsencesForMonth(studentIds, schoolDaysInMonth, referenceMonth),
      loadVerifiedWhatsAppContactsSafe()
    ]);

    console.log(`[DEBUG] Faltas carregadas para ${Object.keys(studentAbsences).length} estudantes`);
    console.log(`[DEBUG] Contatos verificados para ${Object.keys(verifiedContacts).length} estudantes`);

    checkTimeout('faltas e contatos carregados');

    // Filtrar estudantes que têm múltiplos da quantidade de faltas especificada
    const results: StudentWithAbsenceMultiples[] = [];
    let studentsWithTargetMultiples = 0;
    let studentsWithAbsences = 0;

    activeStudents.forEach(student => {
      const absencesCount = studentAbsences[student.estudanteId] || 0;
      if (absencesCount > 0) studentsWithAbsences++;

      // Debug específico para o estudante mencionado
      if (student.estudanteId === 'ecce6b78-e3c6-40df-bc7f-2666aef65a1a') {
        console.log(`[DEBUG] Estudante EMANUELLY DE OLIVEIRA COUTINHO:`, {
          estudanteId: student.estudanteId,
          nome: student.nome,
          absencesCount,
          contatos: verifiedContacts[student.estudanteId] || [],
          todasChaves: Object.keys(verifiedContacts).slice(0, 5), // Primeiras 5 chaves para verificar formato
        });
      }

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

    console.log(`[DEBUG] Estudantes com faltas: ${studentsWithAbsences}`);
    console.log(`[DEBUG] Estudantes com múltiplos de ${absenceMultiple}: ${studentsWithTargetMultiples}`);
    console.log(`[DEBUG] Resultados finais: ${results.length}`);

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