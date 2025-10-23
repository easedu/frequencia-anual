import { NextRequest, NextResponse } from 'next/server';
import { apiCache } from '@/utils/apiOptimization';
import { getStudentsByYear } from '@/services/studentDataService';
import { Student } from '@/types';
import { AcademicYearService } from '@/services/supabase/academicYearService';
import { AbsenceService } from '@/services/supabase/absenceService';

interface SchoolDay {
  date: string;
  isChecked: boolean;
}

interface ConsecutiveAbsenceResponse {
  estudanteId: string;
  studentName: string;
  className: string;
  shift: 'MANHÃ' | 'TARDE';
  hasDisability: boolean;
  consecutiveDays: number;
  startDate: string;
  endDate: string;
  severity: 'warning' | 'critical';
  totalAbsences: number;
  allPeriods?: { start: string; end: string; days: number }[];
}

interface ApiResponse {
  success: boolean;
  data?: ConsecutiveAbsenceResponse[];
  error?: string;
  metadata?: {
    totalStudentsAnalyzed: number;
    totalActiveStudents: number;
    schoolDaysConsidered: number;
    currentBimesters: string[];
    minConsecutiveDays: number;
    onlyActive: boolean;
    ongoingOnly: boolean;
    executionTimeMs: number;
    limitApplied: boolean;
    totalRecords: number;
  };
}

// Cache para dados do ano letivo (otimização)
let academicYearCache: any = null;
let academicYearCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

async function loadAcademicYearData(): Promise<any> {
  const cacheKey = 'academic-year-2025';

  // Verificar cache melhorado
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await AcademicYearService.getAcademicYearComplete(2025);

    if (data && Object.keys(data).length > 0) {
      // Cache por 15 minutos
      apiCache.set(cacheKey, data, 15);
      return data;
    }

    return null;
  } catch (error) {
    console.error('Erro ao carregar ano letivo:', error);
    return null;
  }
}

async function getCurrentBimester(): Promise<string> {
  try {
    const data = await loadAcademicYearData();

    if (data) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

      for (const bimestre of bimestres) {
        if (data[bimestre]?.startDate && data[bimestre]?.endDate) {
          const [startDay, startMonth, startYear] = data[bimestre].startDate.split('/').map(Number);
          const [endDay, endMonth, endYear] = data[bimestre].endDate.split('/').map(Number);

          const startDate = new Date(startYear, startMonth - 1, startDay);
          const endDate = new Date(endYear, endMonth - 1, endDay);

          if (hoje >= startDate && hoje <= endDate) {
            return bimestre;
          }
        }
      }
    }

    return '1º Bimestre';
  } catch (error) {
    console.error('Erro ao detectar bimestre atual:', error);
    return '1º Bimestre';
  }
}

async function loadSchoolDays(selectedBimesters: string[]): Promise<SchoolDay[]> {
  try {
    const data = await loadAcademicYearData();

    if (data) {
      const allDays: SchoolDay[] = [];

      selectedBimesters.forEach(bimester => {
        if (data[bimester]?.dates) {
          allDays.push(...data[bimester].dates);
        }
      });

      return allDays
        .filter(day => day.isChecked)
        .sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split('/').map(Number);
          const [dayB, monthB, yearB] = b.date.split('/').map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateA.getTime() - dateB.getTime();
        });
    }

    return [];
  } catch (error) {
    console.error('Erro ao carregar dias letivos:', error);
    return [];
  }
}

async function loadAllStudentAbsences(studentIds: string[], schoolDays: SchoolDay[]): Promise<Record<string, string[]>> {
  try {
    const allAbsences: Record<string, string[]> = {};

    // Criar set de datas de dias letivos para filtro rápido
    const schoolDayDates = new Set(schoolDays.map(day => day.date));

    // Buscar todas as faltas não justificadas de uma vez (Supabase suporta arrays grandes)
    const absencesData = await AbsenceService.getAbsencesByStudentIds(studentIds, false); // false = não justificadas

    // Inicializar arrays vazios para todos os estudantes
    studentIds.forEach(id => {
      allAbsences[id] = [];
    });

    // Processar faltas
    absencesData.forEach(absence => {
      if (absence.estudante_id && absence.data) {
        // Converter formato yyyy-mm-dd para dd/mm/yyyy se necessário
        let dateStr = absence.data;
        if (dateStr.includes('-')) {
          const [year, month, day] = dateStr.split('-');
          dateStr = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }

        // Filtrar apenas faltas em dias letivos
        if (schoolDayDates.has(dateStr) && allAbsences[absence.estudante_id]) {
          allAbsences[absence.estudante_id].push(dateStr);
        }
      }
    });

    return allAbsences;
  } catch (error) {
    console.error('Erro ao carregar faltas dos estudantes:', error);
    return {};
  }
}

// Função helper para converter data dd/mm/yyyy para Date
function parseDateDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Função para verificar se um período de faltas consecutivas está ativo
function isConsecutivePeriodActive(period: { start: string; end: string; days: number }, schoolDays: SchoolDay[]): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Considerar até ontem para casos onde faltas de hoje ainda não foram lançadas
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  // Encontrar o dia letivo mais recente até ontem (não hoje)
  const schoolDaysUntilYesterday = schoolDays.filter(day => {
    const dayDate = parseDateDDMMYYYY(day.date);
    return dayDate <= ontem;
  });

  if (schoolDaysUntilYesterday.length === 0) return false;

  // Ordenar por data e pegar o mais recente
  const mostRecentSchoolDay = schoolDaysUntilYesterday
    .sort((a, b) => parseDateDDMMYYYY(b.date).getTime() - parseDateDDMMYYYY(a.date).getTime())[0];

  // Verificar se o período consecutivo inclui o dia letivo mais recente (até ontem)
  const periodStart = parseDateDDMMYYYY(period.start);
  const periodEnd = parseDateDDMMYYYY(period.end);
  const recentDay = parseDateDDMMYYYY(mostRecentSchoolDay.date);

  return recentDay >= periodStart && recentDay <= periodEnd;
}

// Função para verificar se um caso está "ongoing" (mesma lógica da página para INTERVENÇÃO)
function isConsecutivePeriodOngoing(period: { start: string; end: string; days: number }, schoolDays: SchoolDay[]): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Considerar até ontem para casos onde faltas de hoje ainda não foram lançadas
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  // Encontrar o dia letivo mais recente até ontem (não hoje)
  const schoolDaysUntilYesterday = schoolDays.filter(day => {
    const dayDate = parseDateDDMMYYYY(day.date);
    return dayDate <= ontem;
  });

  if (schoolDaysUntilYesterday.length === 0) return false;

  // Ordenar por data e pegar o mais recente
  const mostRecentSchoolDay = schoolDaysUntilYesterday
    .sort((a, b) => parseDateDDMMYYYY(b.date).getTime() - parseDateDDMMYYYY(a.date).getTime())[0];

  // Verificar se o período consecutivo inclui o dia letivo mais recente (até ontem)
  const periodStart = parseDateDDMMYYYY(period.start);
  const periodEnd = parseDateDDMMYYYY(period.end);
  const recentDay = parseDateDDMMYYYY(mostRecentSchoolDay.date);

  return recentDay >= periodStart && recentDay <= periodEnd;
}

function calculateConsecutiveAbsences(absences: string[], schoolDays: SchoolDay[], minConsecutiveDays: number): {
  consecutiveDays: number;
  startDate: string;
  endDate: string;
  allPeriods: { start: string; end: string; days: number }[];
} {
  if (absences.length === 0 || schoolDays.length === 0) {
    return { consecutiveDays: 0, startDate: '', endDate: '', allPeriods: [] };
  }

  // Todas as datas já estão no formato dd/mm/yyyy
  const schoolDaysDates = schoolDays.map(day => day.date);

  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let startDate = '';
  let endDate = '';
  let currentStartDate = '';
  const allPeriods: { start: string; end: string; days: number }[] = [];

  // Percorrer dias letivos em ordem
  for (let i = 0; i < schoolDaysDates.length; i++) {
    const currentDate = schoolDaysDates[i];

    if (absences.includes(currentDate)) {
      // Estudante faltou neste dia letivo
      if (currentConsecutive === 0) {
        currentStartDate = currentDate;
      }
      currentConsecutive++;

      // Atualizar o máximo se necessário
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
        startDate = currentStartDate;
        endDate = currentDate;
      }
    } else {
      // Estudante estava presente, quebrar sequência
      if (currentConsecutive >= minConsecutiveDays) {
        allPeriods.push({
          start: currentStartDate,
          end: schoolDaysDates[i - 1], // Último dia da sequência
          days: currentConsecutive
        });
      }
      currentConsecutive = 0;
    }
  }

  // Verificar se a sequência termina no final dos dados
  if (currentConsecutive >= minConsecutiveDays) {
    allPeriods.push({
      start: currentStartDate,
      end: schoolDaysDates[schoolDaysDates.length - 1],
      days: currentConsecutive
    });
  }

  // Sempre retornar se há faltas consecutivas
  if (maxConsecutive >= minConsecutiveDays) {
    return { consecutiveDays: maxConsecutive, startDate, endDate, allPeriods };
  }

  return { consecutiveDays: 0, startDate: '', endDate: '', allPeriods: [] };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const maxExecutionTime = 25000; // 25 segundos (limite do Vercel é 30s)

  try {
    const searchParams = request.nextUrl.searchParams;
    const minConsecutiveDays = parseInt(searchParams.get('minConsecutiveDays') || '10');
    const bimesters = searchParams.get('bimesters')?.split(',') || [];

    // 🚀 PAGINAÇÃO PROGRESSIVA
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const onlyActive = searchParams.get('onlyActive') === 'true'; // Filtrar apenas casos com período ativo
    const ongoingOnly = searchParams.get('ongoingOnly') === 'true'; // Filtrar apenas casos ongoing (em andamento)
    const clearCache = searchParams.get('clearCache') === 'true'; // Limpar cache se solicitado

    // Limpar cache se solicitado
    if (clearCache) {
      apiCache.clear();
      console.log('Cache limpo por solicitação do usuário');
    }

    // Verificar timeout periodicamente
    const checkTimeout = () => {
      if (Date.now() - startTime > maxExecutionTime) {
        throw new Error('Timeout: Operação muito demorada para o Vercel');
      }
    };

    // Validação de parâmetros
    if (minConsecutiveDays < 1 || minConsecutiveDays > 50) {
      return NextResponse.json({
        success: false,
        error: 'minConsecutiveDays deve estar entre 1 e 50'
      } as ApiResponse, { status: 400 });
    }

    // Se não especificou bimestres, usar o bimestre atual
    let selectedBimesters = bimesters;
    if (selectedBimesters.length === 0) {
      const currentBimester = await getCurrentBimester();
      selectedBimesters = [currentBimester];
    }

    // Validar bimestres
    const validBimesters = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
    const invalidBimesters = selectedBimesters.filter(b => !validBimesters.includes(b));
    if (invalidBimesters.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Bimestres inválidos: ${invalidBimesters.join(', ')}`
      } as ApiResponse, { status: 400 });
    }

    checkTimeout();

    // Carregar dias letivos
    const schoolDays = await loadSchoolDays(selectedBimesters);
    if (schoolDays.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum dia letivo encontrado para os bimestres selecionados'
      } as ApiResponse, { status: 404 });
    }

    checkTimeout();

    // FASE 3: Carregar estudantes com DUAL-READ
    console.log('[CONSECUTIVE-ABSENCES] Carregando estudantes com dual-read...');
    const students = await getStudentsByYear('2025');

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Dados de estudantes não encontrados'
      } as ApiResponse, { status: 404 });
    }

    const activeStudents = students.filter((student: Student) => student.status === 'ATIVO');

    console.log(`[CONSECUTIVE-ABSENCES] ✅ ${students.length} estudantes carregados (${activeStudents.length} ativos)`);
    console.log(`[CONSECUTIVE-ABSENCES] 📊 Fonte de dados: V3`);

    if (activeStudents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum estudante ativo encontrado'
      } as ApiResponse, { status: 404 });
    }

    checkTimeout();

    // Carregar todas as faltas (passando schoolDays para otimização)
    const studentIds = activeStudents.map((s: any) => s.estudanteId);

    // Limitar processamento para evitar timeout
    const maxStudents = 200; // Reduzir limite para melhor performance
    const limitedStudents = activeStudents.slice(0, maxStudents);
    const limitedStudentIds = limitedStudents.map((s: any) => s.estudanteId);

    const allStudentAbsences = await loadAllStudentAbsences(limitedStudentIds, schoolDays);

    checkTimeout();

    const results: ConsecutiveAbsenceResponse[] = [];

    // Processar cada estudante com verificação de timeout
    let processed = 0;
    for (const student of limitedStudents) {
      // Verificar timeout a cada 20 estudantes processados e parar se restam menos de 5 segundos
      if (processed % 20 === 0) {
        const remainingTime = maxExecutionTime - (Date.now() - startTime);
        if (remainingTime < 5000) { // Parar se restam menos de 5 segundos
          console.log(`Parando processamento antecipado. Processados: ${processed}/${limitedStudents.length}`);
          break;
        }
        checkTimeout();
      }

      // Pular estudantes que não tiveram dados carregados (timeout)
      if (!allStudentAbsences.hasOwnProperty(student.estudanteId)) {
        processed++;
        continue;
      }

      const absences = allStudentAbsences[student.estudanteId] || [];

      if (absences.length === 0) {
        processed++;
        continue;
      }

      const { consecutiveDays, startDate, endDate, allPeriods } = calculateConsecutiveAbsences(
        absences,
        schoolDays,
        minConsecutiveDays
      );

      if (consecutiveDays >= minConsecutiveDays) {
        // Se onlyActive for true, verificar se há períodos ativos
        if (onlyActive) {
          const hasActivePeriod = allPeriods.some(period => isConsecutivePeriodActive(period, schoolDays));
          if (!hasActivePeriod) {
            continue; // Pular este estudante se não tiver períodos ativos
          }
        }

        // Se ongoingOnly for true, verificar se há períodos ongoing (em andamento)
        if (ongoingOnly) {
          const ongoingPeriods = allPeriods.filter(period => isConsecutivePeriodOngoing(period, schoolDays));
          if (ongoingPeriods.length === 0) {
            continue; // Pular este estudante se não tiver períodos ongoing
          }

          // Para ongoingOnly, retornar apenas os dados do período ongoing, sem allPeriods
          const ongoingPeriod = ongoingPeriods[0]; // Pegar o primeiro período ongoing
          results.push({
            estudanteId: student.estudanteId,
            studentName: student.nome,
            className: student.turma,
            shift: student.turno,
            hasDisability: student.deficiencia?.estudanteComDeficiencia || false,
            consecutiveDays: ongoingPeriod.days,
            startDate: ongoingPeriod.start,
            endDate: ongoingPeriod.end,
            severity: ongoingPeriod.days >= 15 ? 'critical' : 'warning',
            totalAbsences: absences.length
          });
        } else {
          results.push({
            estudanteId: student.estudanteId,
            studentName: student.nome,
            className: student.turma,
            shift: student.turno,
            hasDisability: student.deficiencia?.estudanteComDeficiencia || false,
            consecutiveDays,
            startDate,
            endDate,
            severity: consecutiveDays >= 15 ? 'critical' : 'warning',
            totalAbsences: absences.length,
            allPeriods
          });
        }
      }
      processed++;
    }

    // Ordenar por dias consecutivos (maior primeiro)
    results.sort((a, b) => b.consecutiveDays - a.consecutiveDays);

    const executionTime = Date.now() - startTime;

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
        totalStudentsAnalyzed: limitedStudents.length,
        totalActiveStudents: activeStudents.length,
        schoolDaysConsidered: schoolDays.length,
        currentBimesters: selectedBimesters,
        minConsecutiveDays,
        onlyActive,
        ongoingOnly,
        executionTimeMs: executionTime,
        limitApplied: activeStudents.length > maxStudents,
        totalRecords: results.length
      }
    } as ApiResponse);

  } catch (error) {
    console.error('Erro na API de faltas consecutivas:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    } as ApiResponse, { status: 500 });
  }
}