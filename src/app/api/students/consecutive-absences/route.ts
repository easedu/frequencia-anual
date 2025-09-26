import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase.config';
import { FIREBASE_PATHS } from '@/config/constants';

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
  allPeriods: { start: string; end: string; days: number }[];
}

interface ApiResponse {
  success: boolean;
  data?: ConsecutiveAbsenceResponse[];
  error?: string;
  metadata?: {
    totalStudentsAnalyzed: number;
    schoolDaysConsidered: number;
    currentBimesters: string[];
    minConsecutiveDays: number;
  };
}

// Cache para dados do ano letivo (otimização)
let academicYearCache: any = null;
let academicYearCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

async function loadAcademicYearData(): Promise<any> {
  const now = Date.now();

  // Verificar se o cache ainda é válido
  if (academicYearCache && (now - academicYearCacheTime) < CACHE_TTL) {
    return academicYearCache;
  }

  try {
    const docRef = doc(db, '2025', 'ano_letivo');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      academicYearCache = data;
      academicYearCacheTime = now;
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

async function loadAllStudentAbsences(studentIds: string[]): Promise<Record<string, string[]>> {
  try {
    const absencesRef = collection(db, FIREBASE_PATHS.absenceControl());
    const batchSize = 30;
    const allAbsences: Record<string, string[]> = {};

    // Processar em batches para otimizar performance
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);
      const querySnapshot = await getDocs(query(absencesRef, where('estudanteId', 'in', batch)));

      // Inicializar arrays vazios para todos os estudantes do batch
      batch.forEach(id => {
        allAbsences[id] = [];
      });

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (!data.justified && data.estudanteId && data.data) {
          // Converter formato yyyy-mm-dd para dd/mm/yyyy se necessário
          let dateStr = data.data;
          if (dateStr.includes('-')) {
            const [year, month, day] = dateStr.split('-');
            dateStr = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
          }

          if (allAbsences[data.estudanteId]) {
            allAbsences[data.estudanteId].push(dateStr);
          }
        }
      });
    }

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

  // Encontrar o dia letivo mais recente até hoje
  const schoolDaysUntilToday = schoolDays.filter(day => {
    const dayDate = parseDateDDMMYYYY(day.date);
    return dayDate <= hoje;
  });

  if (schoolDaysUntilToday.length === 0) return false;

  // Ordenar por data e pegar o mais recente
  const mostRecentSchoolDay = schoolDaysUntilToday
    .sort((a, b) => parseDateDDMMYYYY(b.date).getTime() - parseDateDDMMYYYY(a.date).getTime())[0];

  // Verificar se o período consecutivo inclui o dia letivo mais recente
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

  // Verificar se há pelo menos um período ativo
  const hasActivePeriod = allPeriods.some(period => isConsecutivePeriodActive(period, schoolDays));

  // Só retornar casos que tenham pelo menos um período ativo
  if (maxConsecutive >= minConsecutiveDays && hasActivePeriod) {
    return { consecutiveDays: maxConsecutive, startDate, endDate, allPeriods };
  }

  // Se não há faltas consecutivas ativas, retornar zero
  return { consecutiveDays: 0, startDate: '', endDate: '', allPeriods: [] };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const minConsecutiveDays = parseInt(searchParams.get('minConsecutiveDays') || '10');
    const bimesters = searchParams.get('bimesters')?.split(',') || [];

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

    // Carregar dias letivos
    const schoolDays = await loadSchoolDays(selectedBimesters);
    if (schoolDays.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum dia letivo encontrado para os bimestres selecionados'
      } as ApiResponse, { status: 404 });
    }

    // Carregar estudantes
    const docRef = doc(db, FIREBASE_PATHS.students());
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Dados de estudantes não encontrados'
      } as ApiResponse, { status: 404 });
    }

    const data = docSnap.data();
    const students = (data.estudantes || []) as any[];
    const activeStudents = students.filter((student: any) => student.status === 'ATIVO');

    if (activeStudents.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum estudante ativo encontrado'
      } as ApiResponse, { status: 404 });
    }

    // Carregar todas as faltas
    const studentIds = activeStudents.map((s: any) => s.estudanteId);
    const allStudentAbsences = await loadAllStudentAbsences(studentIds);

    const results: ConsecutiveAbsenceResponse[] = [];

    // Processar cada estudante
    for (const student of activeStudents) {
      const absences = allStudentAbsences[student.estudanteId] || [];

      if (absences.length === 0) continue;

      const { consecutiveDays, startDate, endDate, allPeriods } = calculateConsecutiveAbsences(
        absences,
        schoolDays,
        minConsecutiveDays
      );

      if (consecutiveDays >= minConsecutiveDays) {
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

    // Ordenar por dias consecutivos (maior primeiro)
    results.sort((a, b) => b.consecutiveDays - a.consecutiveDays);

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        totalStudentsAnalyzed: activeStudents.length,
        schoolDaysConsidered: schoolDays.length,
        currentBimesters: selectedBimesters,
        minConsecutiveDays
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