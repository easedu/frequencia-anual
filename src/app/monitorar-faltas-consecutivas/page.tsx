"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CalendarX,
  AlertTriangle,
  Calendar,
  Users,
  Search,
  Filter,
  Heart,
  BookOpen,
  Clock,
  TrendingDown,
  Target,
  RefreshCw,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  User,
  ChevronLeft,
  ChevronRight,
  FileText,
  X
} from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase.config';
import { useStudents } from '@/hooks/useStudents';
import { toast } from 'sonner';
import { FIREBASE_PATHS } from '@/config/constants';
import { useRouter } from 'next/navigation';
import RegisterInteractionCard from '@/components/RegisterInteractionCard';
import type { FamilyInteraction } from '@/app/types';

interface ConsecutiveAbsence {
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
  allAbsences?: string[]; // Lista de todas as faltas
  consecutivePeriods?: { start: string; end: string; days: number }[]; // Períodos consecutivos
}

interface SchoolDay {
  date: string;
  isChecked: boolean;
}

export default function MonitorarFaltasConsecutivasPage() {
  const { students, loading: studentsLoading } = useStudents();
  const router = useRouter();
  
  const [consecutiveAbsences, setConsecutiveAbsences] = useState<ConsecutiveAbsence[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showPCD, setShowPCD] = useState(false); // Iniciar desmarcado
  const [minConsecutiveDays, setMinConsecutiveDays] = useState(10);
  const [selectedBimesters, setSelectedBimesters] = useState<string[]>([]); // Será definido automaticamente
  const [totalSchoolDays, setTotalSchoolDays] = useState(0);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [filtersChanged, setFiltersChanged] = useState(false);
  const [hasInitialAnalysis, setHasInitialAnalysis] = useState(false);
  const [schoolDaysCache, setSchoolDaysCache] = useState<Record<string, SchoolDay[]>>({});
  const [currentSchoolDays, setCurrentSchoolDays] = useState<SchoolDay[]>([]);
  
  // Cache global do documento ano_letivo (persiste durante a sessão)
  const [academicYearCache, setAcademicYearCache] = useState<any>(null);
  const [academicYearCacheTime, setAcademicYearCacheTime] = useState<number>(0);

  // Estados para o modal de interação
  const [selectedAbsence, setSelectedAbsence] = useState<ConsecutiveAbsence | null>(null);
  const [showInteractionCard, setShowInteractionCard] = useState(false);
  const [interactionType, setInteractionType] = useState<string>("");
  const [interactionDate, setInteractionDate] = useState<string>(new Date().toLocaleDateString("pt-BR"));
  const [interactionDescription, setInteractionDescription] = useState<string>("");
  const [interactionSensitive, setInteractionSensitive] = useState<boolean>(false);

  // Estado para controlar casos resolvidos
  const [resolvedCases, setResolvedCases] = useState<Set<string>>(new Set());

  // Estado para controlar hidratação (evitar mismatch entre server e client)
  const [isHydrated, setIsHydrated] = useState(false);

  // Debounce para busca
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Paginação para grandes datasets
  const [currentActivePage, setCurrentActivePage] = useState(1);
  const [currentInactivePage, setCurrentInactivePage] = useState(1);
  const [currentResolvedPage, setCurrentResolvedPage] = useState(1);
  const [itemsPerPage] = useState(50); // Limite de 50 estudantes por página

  // Extrair turmas únicas
  const availableClasses = useMemo(() => {
    return [...new Set(students.map(student => student.turma))].sort();
  }, [students]);

  // Função para carregar dados do ano letivo com cache inteligente
  const loadAcademicYearData = async (): Promise<any> => {
    const now = Date.now();
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
    
    // Verificar se o cache ainda é válido
    if (academicYearCache && (now - academicYearCacheTime) < CACHE_TTL) {
      console.log('Usando cache do ano letivo');
      return academicYearCache;
    }
    
    try {
      console.time('Busca ano letivo');
      const docRef = doc(db, '2025', 'ano_letivo');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAcademicYearCache(data);
        setAcademicYearCacheTime(now);
        console.timeEnd('Busca ano letivo');
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar ano letivo:', error);
      return null;
    }
  };

  // Função para detectar o bimestre atual baseado na data
  const getCurrentBimester = async (): Promise<string> => {
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
      
      // Se não encontrar, retornar o primeiro bimestre
      return '1º Bimestre';
    } catch (error) {
      console.error('Erro ao detectar bimestre atual:', error);
      return '1º Bimestre';
    }
  };

  // Inicializar com bimestre atual
  useEffect(() => {
    const initializeBimester = async () => {
      if (selectedBimesters.length === 0) {
        const currentBimester = await getCurrentBimester();
        setSelectedBimesters([currentBimester]);
      }
    };
    
    initializeBimester();
  }, []);

  // Debounce para search term (evita filtrar a cada caractere digitado)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms de delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Carregar dias letivos com cache inteligente
  const loadSchoolDays = async (): Promise<SchoolDay[]> => {
    const cacheKey = selectedBimesters.sort().join(',');
    
    // Verificar cache primeiro
    if (schoolDaysCache[cacheKey]) {
      console.log('Usando dias letivos do cache para:', cacheKey);
      const cachedDays = schoolDaysCache[cacheKey];
      setTotalSchoolDays(cachedDays.length);
      setCurrentSchoolDays(cachedDays); // Salvar para detecção de períodos ativos
      return cachedDays;
    }
    
    try {
      console.time('Busca de dias letivos');
      const data = await loadAcademicYearData();
      
      if (data) {
        const allDays: SchoolDay[] = [];
        
        // Extrair dias apenas dos bimestres selecionados
        selectedBimesters.forEach(bimester => {
          if (data[bimester]?.dates) {
            allDays.push(...data[bimester].dates);
          }
        });
        
        const filteredDays = allDays.filter(day => day.isChecked).sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split('/').map(Number);
          const [dayB, monthB, yearB] = b.date.split('/').map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return dateA.getTime() - dateB.getTime();
        });
        
        // Salvar no cache
        setSchoolDaysCache(prev => ({ ...prev, [cacheKey]: filteredDays }));
        
        setTotalSchoolDays(filteredDays.length);
        setCurrentSchoolDays(filteredDays); // Salvar para detecção de períodos ativos
        console.timeEnd('Busca de dias letivos');
        return filteredDays;
      }
      
      setTotalSchoolDays(0);
      return [];
    } catch (error) {
      console.error('Erro ao carregar dias letivos:', error);
      toast.error('Erro ao carregar calendário escolar');
      setTotalSchoolDays(0);
      return [];
    }
  };

  // Carregar faltas de TODOS os estudantes em uma query batch otimizada
  const loadAllStudentAbsences = async (studentIds: string[], schoolDays: SchoolDay[]): Promise<Record<string, string[]>> => {
    try {
      console.time('Carregamento de faltas - Total');
      const absencesRef = collection(db, FIREBASE_PATHS.absenceControl());

      // Otimizar batch size (máximo suportado pelo Firestore é 30 para 'in')
      const batchSize = 30;
      const batches: Promise<Record<string, string[]>>[] = [];

      console.log(`Carregando faltas para ${studentIds.length} estudantes em batches de ${batchSize}`);

      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize);
        const batchPromise = getBatchAbsences(absencesRef, batch, i / batchSize + 1, schoolDays);
        batches.push(batchPromise);
      }
      
      // Executar todos os batches em paralelo com controle de concorrência
      const maxConcurrency = 5; // Limitar concorrência para evitar rate limiting
      const batchResults: Record<string, string[]>[] = [];
      
      for (let i = 0; i < batches.length; i += maxConcurrency) {
        const concurrentBatches = batches.slice(i, i + maxConcurrency);
        const results = await Promise.all(concurrentBatches);
        batchResults.push(...results);
        
        // Pequeno delay entre grupos de batches para evitar sobrecarga
        if (i + maxConcurrency < batches.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Combinar resultados
      const allAbsences: Record<string, string[]> = {};
      batchResults.forEach(batchResult => {
        Object.assign(allAbsences, batchResult);
      });
      
      console.timeEnd('Carregamento de faltas - Total');
      console.log(`✓ Faltas carregadas para ${Object.keys(allAbsences).length} estudantes em ${batches.length} batches`);
      return allAbsences;
      
    } catch (error) {
      console.error('Erro ao carregar faltas dos estudantes:', error);
      return {};
    }
  };

  // Função helper para processar um batch de estudantes
  const getBatchAbsences = async (absencesRef: any, studentIds: string[], batchNumber: number, schoolDays: SchoolDay[]): Promise<Record<string, string[]>> => {
    console.time(`Batch ${batchNumber} (${studentIds.length} estudantes)`);

    const querySnapshot = await getDocs(query(absencesRef, where('estudanteId', 'in', studentIds)));
    const batchAbsences: Record<string, string[]> = {};

    // Criar set de datas de dias letivos para filtro rápido
    const schoolDayDates = new Set(schoolDays.map(day => day.date));

    // Inicializar arrays vazios para todos os estudantes do batch
    studentIds.forEach(id => {
      batchAbsences[id] = [];
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

        // Filtrar apenas faltas em dias letivos
        if (schoolDayDates.has(dateStr) && batchAbsences[data.estudanteId]) {
          batchAbsences[data.estudanteId].push(dateStr);
        }
      }
    });

    console.timeEnd(`Batch ${batchNumber} (${studentIds.length} estudantes)`);
    console.log(`✓ Batch ${batchNumber}: ${querySnapshot.size} faltas encontradas`);

    return batchAbsences;
  };

  // Calcular faltas consecutivas (atualizada para detectar todos os períodos)
  const calculateConsecutiveAbsences = (absences: string[], schoolDays: SchoolDay[], minConsecutiveDaysParam: number): {
    consecutiveDays: number;
    startDate: string;
    endDate: string;
    allPeriods: { start: string; end: string; days: number }[];
  } => {
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
        if (currentConsecutive >= minConsecutiveDaysParam) {
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
    if (currentConsecutive >= minConsecutiveDaysParam) {
      allPeriods.push({
        start: currentStartDate,
        end: schoolDaysDates[schoolDaysDates.length - 1],
        days: currentConsecutive
      });
    }

    // Sempre retornar se há faltas consecutivas
    if (maxConsecutive >= minConsecutiveDaysParam) {
      return { consecutiveDays: maxConsecutive, startDate, endDate, allPeriods };
    }

    return { consecutiveDays: 0, startDate: '', endDate: '', allPeriods: [] };
  };

  // Analisar faltas consecutivas de todos os estudantes
  const analyzeConsecutiveAbsences = async () => {
    if (studentsLoading || students.length === 0) {
      toast.error('Aguarde o carregamento dos dados dos estudantes');
      return;
    }

    if (selectedBimesters.length === 0) {
      toast.error('Selecione pelo menos um bimestre para análise');
      setConsecutiveAbsences([]); // Limpar resultados
      return;
    }

    try {
      setLoading(true);
      
      console.log('Iniciando análise com bimestres:', selectedBimesters);
      
      // Carregar dias letivos
      const schoolDays = await loadSchoolDays();
      console.log(`Encontrados ${schoolDays.length} dias letivos`);
      
      if (schoolDays.length === 0) {
        toast.error('Nenhum dia letivo encontrado para os bimestres selecionados.');
        return;
      }

      const activeStudents = students.filter(student => student.status === 'ATIVO');
      const studentIds = activeStudents.map(s => s.estudanteId);
      console.log(`Analisando ${activeStudents.length} estudantes ativos`);

      // Carregar todas as faltas em batch (MUITO mais eficiente)
      console.time('Busca de faltas batch');
      const allStudentAbsences = await loadAllStudentAbsences(studentIds, schoolDays);
      console.timeEnd('Busca de faltas batch');
      
      const results: ConsecutiveAbsence[] = [];
      
      // Processar cada estudante com dados já carregados
      console.time('Processamento de faltas consecutivas');
      for (const student of activeStudents) {
        const absences = allStudentAbsences[student.estudanteId] || [];
        
        if (absences.length === 0) continue; // Skip estudantes sem faltas
        
        const { consecutiveDays, startDate, endDate, allPeriods } = calculateConsecutiveAbsences(absences, schoolDays, minConsecutiveDays);
        
        if (consecutiveDays >= minConsecutiveDays) {
          // Verificar se há pelo menos um período ativo para logs
          const hasActivePeriod = allPeriods.some(period => isConsecutivePeriodActive(period, schoolDays));
          console.log(`${student.nome}: ${consecutiveDays} dias consecutivos (${absences.length} faltas total) - ${hasActivePeriod ? 'ATIVO' : 'HISTÓRICO'}`);

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
            allAbsences: absences,
            consecutivePeriods: allPeriods
          });
        }
      }
      console.timeEnd('Processamento de faltas consecutivas');

      console.log(`Análise concluída: ${results.length} casos encontrados`);

      // Ordenar por dias consecutivos (maior primeiro)
      results.sort((a, b) => b.consecutiveDays - a.consecutiveDays);
      
      setConsecutiveAbsences(results);
      setFiltersChanged(false); // Reset do indicador
      setHasInitialAnalysis(true); // Marca que já foi feita a primeira análise
      
      if (results.length > 0) {
        toast.success(`Encontrados ${results.length} casos de faltas consecutivas`);
      } else {
        toast.info(`Nenhum caso encontrado com ${minConsecutiveDays}+ dias consecutivos nos bimestres selecionados`);
      }
      
    } catch (error) {
      console.error('Erro ao analisar faltas consecutivas:', error);
      toast.error('Erro ao analisar faltas consecutivas');
    } finally {
      setLoading(false);
    }
  };

  // Função helper para converter data dd/mm/yyyy para Date
  const parseDateDDMMYYYY = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  // Função para verificar se um período de faltas consecutivas está ativo (inclui o dia letivo atual ou mais recente)
  const isConsecutivePeriodActive = (period: { start: string; end: string; days: number }, schoolDays: SchoolDay[]): boolean => {
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
  };

  // Função para verificar se estudante tem períodos ativos
  const hasActiveConsecutivePeriod = (consecutivePeriods: { start: string; end: string; days: number }[], schoolDays: SchoolDay[]): boolean => {
    return consecutivePeriods.some(period => isConsecutivePeriodActive(period, schoolDays));
  };

  // Filtrar resultados e separa por períodos ativos/inativos/resolvidos
  const { activeStudents, inactiveStudents, resolvedStudents, filteredResults } = useMemo(() => {
    const filtered = consecutiveAbsences.filter(absence => {
      // Filtro de busca por nome com debounce
      if (debouncedSearchTerm && !absence.studentName.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
        return false;
      }

      // Filtro PCD
      if (!showPCD && absence.hasDisability) return false;

      // Filtro por turma
      if (selectedClass !== 'all' && absence.className !== selectedClass) return false;

      // Filtro por turno
      if (selectedShift !== 'all' && absence.shift !== selectedShift) return false;

      // Filtro por severidade
      if (selectedSeverity !== 'all' && absence.severity !== selectedSeverity) return false;

      return true;
    });

    // Separar estudantes por categoria: ativos, inativos e resolvidos
    const active: typeof filtered = [];
    const inactive: typeof filtered = [];
    const resolved: typeof filtered = [];

    filtered.forEach(absence => {
      const isResolved = isHydrated && resolvedCases.has(absence.estudanteId);

      if (isResolved) {
        resolved.push(absence);
      } else {
        const hasActivePeriod = currentSchoolDays.length > 0 &&
          absence.consecutivePeriods &&
          hasActiveConsecutivePeriod(absence.consecutivePeriods, currentSchoolDays);

        if (hasActivePeriod) {
          active.push(absence);
        } else {
          inactive.push(absence);
        }
      }
    });

    return {
      activeStudents: active,
      inactiveStudents: inactive,
      resolvedStudents: resolved,
      filteredResults: filtered
    };
  }, [consecutiveAbsences, debouncedSearchTerm, showPCD, selectedClass, selectedShift, selectedSeverity, currentSchoolDays, isHydrated, resolvedCases]);

  // Paginação dos resultados ativos, inativos e resolvidos
  const paginatedResults = useMemo(() => {
    const totalActivePages = Math.ceil(activeStudents.length / itemsPerPage);
    const totalInactivePages = Math.ceil(inactiveStudents.length / itemsPerPage);
    const totalResolvedPages = Math.ceil(resolvedStudents.length / itemsPerPage);

    const activeStartIndex = (currentActivePage - 1) * itemsPerPage;
    const activeEndIndex = activeStartIndex + itemsPerPage;

    const inactiveStartIndex = (currentInactivePage - 1) * itemsPerPage;
    const inactiveEndIndex = inactiveStartIndex + itemsPerPage;

    const resolvedStartIndex = (currentResolvedPage - 1) * itemsPerPage;
    const resolvedEndIndex = resolvedStartIndex + itemsPerPage;

    return {
      activeStudentsPaginated: activeStudents.slice(activeStartIndex, activeEndIndex),
      inactiveStudentsPaginated: inactiveStudents.slice(inactiveStartIndex, inactiveEndIndex),
      resolvedStudentsPaginated: resolvedStudents.slice(resolvedStartIndex, resolvedEndIndex),
      totalActivePages,
      totalInactivePages,
      totalResolvedPages,
      currentlyShowingActive: Math.min(activeStudents.length, itemsPerPage),
      currentlyShowingInactive: Math.min(inactiveStudents.length, itemsPerPage),
      currentlyShowingResolved: Math.min(resolvedStudents.length, itemsPerPage),
    };
  }, [activeStudents, inactiveStudents, resolvedStudents, currentActivePage, currentInactivePage, currentResolvedPage, itemsPerPage]);

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: filteredResults.length,
      active: activeStudents.length,
      inactive: inactiveStudents.length,
      resolved: resolvedStudents.length, // NOVO: casos resolvidos
      warning: filteredResults.filter(a => a.severity === 'warning').length,
      critical: filteredResults.filter(a => a.severity === 'critical').length,
      withDisability: filteredResults.filter(a => a.hasDisability).length,
      averageConsecutiveDays: filteredResults.length > 0
        ? Math.round(filteredResults.reduce((sum, a) => sum + a.consecutiveDays, 0) / filteredResults.length)
        : 0
    };
  }, [filteredResults, activeStudents, inactiveStudents, resolvedStudents]);

  // Função para alternar seleção de bimestre
  const toggleBimester = (bimester: string) => {
    if (loading) return; // Bloquear interação durante análise
    
    setSelectedBimesters(prev => {
      const newSelection = prev.includes(bimester) 
        ? prev.filter(b => b !== bimester)
        : [...prev, bimester];
      
      console.log('Bimestres selecionados:', newSelection);
      
      // Marcar que filtros mudaram (apenas se já houve uma análise inicial)
      if (hasInitialAnalysis) {
        setFiltersChanged(true);
      }
      
      return newSelection;
    });
  };

  // Função para alternar expansão do card do estudante
  const toggleStudentExpansion = (estudanteId: string) => {
    setExpandedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(estudanteId)) {
        newSet.delete(estudanteId);
      } else {
        newSet.add(estudanteId);
      }
      return newSet;
    });
  };

  // Função helper para verificar se uma data está em um período consecutivo
  const isDateInConsecutivePeriod = (date: string, periods: { start: string; end: string; days: number }[]): { inPeriod: boolean; period?: { start: string; end: string; days: number } } => {
    const dateObj = parseDateDDMMYYYY(date);
    
    for (const period of periods) {
      const startObj = parseDateDDMMYYYY(period.start);
      const endObj = parseDateDDMMYYYY(period.end);
      
      if (dateObj >= startObj && dateObj <= endObj) {
        return { inPeriod: true, period };
      }
    }
    
    return { inPeriod: false };
  };



  // Funções wrapper para marcar mudanças de filtro
  const handleMinDaysChange = (value: number) => {
    setMinConsecutiveDays(value);
    if (hasInitialAnalysis) setFiltersChanged(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Busca não afeta a análise, apenas filtragem
  };

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    // Filtro de turma não afeta a análise, apenas filtragem
  };

  const handleShiftChange = (value: string) => {
    setSelectedShift(value);
    // Filtro de turno não afeta a análise, apenas filtragem
  };

  const handleSeverityChange = (value: string) => {
    setSelectedSeverity(value);
    // Filtro de severidade não afeta a análise, apenas filtragem
  };

  const handlePCDChange = (value: boolean) => {
    setShowPCD(value);
    // Filtro PCD não afeta a análise, apenas filtragem
  };

  // Função para navegar ao perfil do estudante
  const navigateToStudentProfile = (estudanteId: string) => {
    // Usar query parameter para passar o ID do estudante
    router.push(`/perfil-estudante?id=${estudanteId}`);
  };

  // Funções para gerenciar casos resolvidos no Firebase
  const loadResolvedCases = async () => {
    try {
      const resolvedCasesRef = collection(db, '2025', 'casos_resolvidos', 'faltas_consecutivas');
      const querySnapshot = await getDocs(resolvedCasesRef);

      const resolved = new Set<string>();
      querySnapshot.forEach((docSnap) => {
        resolved.add(docSnap.id); // O ID do documento é o estudanteId
      });

      setResolvedCases(resolved);
    } catch (error) {
      console.error('Erro ao carregar casos resolvidos:', error);
    }
  };

  const saveResolvedCase = async (estudanteId: string, interactionId: string) => {
    try {
      const resolvedCaseRef = doc(db, '2025', 'casos_resolvidos', 'faltas_consecutivas', estudanteId);
      await setDoc(resolvedCaseRef, {
        estudanteId,
        interactionId,
        resolvedAt: new Date().toISOString(),
        resolvedBy: auth.currentUser?.uid || 'unknown'
      });
    } catch (error) {
      console.error('Erro ao salvar caso resolvido:', error);
      throw error;
    }
  };

  const removeResolvedCase = async (estudanteId: string) => {
    try {
      const resolvedCaseRef = doc(db, '2025', 'casos_resolvidos', 'faltas_consecutivas', estudanteId);
      await deleteDoc(resolvedCaseRef);

      // Remover do estado local também
      const newResolvedCases = new Set(resolvedCases);
      newResolvedCases.delete(estudanteId);
      setResolvedCases(newResolvedCases);
    } catch (error) {
      console.error('Erro ao remover caso resolvido:', error);
      throw error;
    }
  };

  // Funções para o modal de interação
  const handleResolveAbsence = (absence: ConsecutiveAbsence) => {
    setSelectedAbsence(absence);
    setShowInteractionCard(true);
    // Reset form
    setInteractionType("");
    setInteractionDate(new Date().toLocaleDateString("pt-BR"));
    setInteractionDescription("");
    setInteractionSensitive(false);
  };

  const handleCancelInteraction = () => {
    setShowInteractionCard(false);
    setSelectedAbsence(null);
    setInteractionType("");
    setInteractionDate(new Date().toLocaleDateString("pt-BR"));
    setInteractionDescription("");
    setInteractionSensitive(false);
  };

  // Registrar interação e marcar como resolvido
  const handleAddInteraction = async () => {
    if (!selectedAbsence || !interactionDescription.trim()) {
      toast.error('Descrição da interação é obrigatória');
      return;
    }

    if (!interactionType.trim()) {
      toast.error('Tipo de interação é obrigatório');
      return;
    }

    try {
      // Preparar dados da interação
      const parseDateToFirebase = (dateStr: string): string | null => {
        const [day, month, year] = dateStr.split('/').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      };

      const formattedDate = parseDateToFirebase(interactionDate);
      if (!formattedDate) {
        toast.error('Data inválida. Use o formato DD/MM/YYYY.');
        return;
      }

      // Obter nome do usuário atual
      const currentUser = auth.currentUser?.displayName || auth.currentUser?.email || "Usuário desconhecido";

      const interactionData: Omit<FamilyInteraction, 'id'> = {
        studentId: selectedAbsence.estudanteId,
        type: interactionType,
        date: formattedDate, // Data no formato Firebase
        description: interactionDescription,
        sensitive: interactionSensitive,
        createdBy: currentUser
      };

      const interactionRef = await addDoc(
        collection(db, '2025', 'interacoes_familia', selectedAbsence.estudanteId),
        interactionData
      );

      // Salvar caso como resolvido no Firebase
      await saveResolvedCase(selectedAbsence.estudanteId, interactionRef.id);

      // Marcar como resolvido no estado local
      const newResolvedCases = new Set(resolvedCases).add(selectedAbsence.estudanteId);
      setResolvedCases(newResolvedCases);

      toast.success('Interação registrada e caso marcado como resolvido!');
      setShowInteractionCard(false);
      setSelectedAbsence(null);

    } catch (error) {
      console.error('Erro ao registrar interação:', error);
      toast.error('Erro ao registrar interação');
    }
  };

  // Reset da paginação quando os filtros mudarem
  useEffect(() => {
    setCurrentActivePage(1);
    setCurrentInactivePage(1);
    setCurrentResolvedPage(1);
  }, [debouncedSearchTerm, showPCD, selectedClass, selectedShift, selectedSeverity]);

  // Inicializar hidratação e carregar dados persistidos
  useEffect(() => {
    const initializePage = async () => {
      setIsHydrated(true);

      // Carregar casos resolvidos do Firebase
      await loadResolvedCases();
    };

    initializePage();
  }, []);

  useEffect(() => {
    // Analisar automaticamente APENAS no carregamento inicial
    if (!studentsLoading && students.length > 0 && selectedBimesters.length > 0 && !hasInitialAnalysis) {
      analyzeConsecutiveAbsences();
    }
  }, [studentsLoading, students, selectedBimesters, hasInitialAnalysis]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50 to-orange-100 p-4 relative">
      {/* Overlay de Loading */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 mx-auto">
                  <RefreshCw className="w-16 h-16 text-red-500 animate-spin" />
                </div>
                <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-red-200 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Analisando Faltas Consecutivas
              </h3>
              <p className="text-gray-600 mb-4">
                Processando dados de {students.filter(s => s.status === 'ATIVO').length} estudantes...
              </p>
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>Bimestres:</strong> {selectedBimesters.sort((a, b) => {
                    const order = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
                    return order.indexOf(a) - order.indexOf(b);
                  }).join(', ')}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Dias letivos:</strong> {totalSchoolDays} dias
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Limite mínimo:</strong> {minConsecutiveDays} dias consecutivos
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Esta análise pode levar alguns segundos...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Interação */}
      {showInteractionCard && selectedAbsence && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCancelInteraction}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Resolver Caso de Faltas Consecutivas
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-800">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{selectedAbsence.studentName}</span>
                    {selectedAbsence.hasDisability && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        <Heart className="h-3 w-3 mr-1" />
                        PCD
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-red-700 mt-1">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {selectedAbsence.className}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedAbsence.shift}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarX className="w-3 h-3" />
                      {selectedAbsence.consecutiveDays} dias consecutivos
                    </span>
                  </div>
                </div>
              </div>

              <RegisterInteractionCard
                interactionType={interactionType}
                interactionDate={interactionDate}
                interactionDescription={interactionDescription}
                interactionSensitive={interactionSensitive}
                editingInteraction={null}
                userRole={null} // Será obtido automaticamente
                setInteractionType={setInteractionType}
                setInteractionDate={setInteractionDate}
                setInteractionDescription={setInteractionDescription}
                setInteractionSensitive={setInteractionSensitive}
                setEditingInteraction={() => {}}
                onAddInteraction={handleAddInteraction}
                onEditInteraction={async () => {}}
                readonlyType={false} // Permitir seleção de qualquer tipo
              />

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleCancelInteraction}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Monitoramento de Faltas Consecutivas
          </h1>
          <p className="text-xl text-gray-600">
            Identificação de estudantes com faltas consecutivas em dias letivos
          </p>
        </div>

        {/* Controles e Filtros */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Configurações e Filtros
              </CardTitle>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={analyzeConsecutiveAbsences}
                  disabled={loading || studentsLoading}
                  className={`${filtersChanged 
                    ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
                    : 'bg-red-600 hover:bg-red-700'
                  } transition-colors duration-200`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {filtersChanged ? 'Atualizar Análise' : 'Analisar Faltas'}
                    </>
                  )}
                </Button>
                {filtersChanged && (
                  <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200 text-center">
                    📊 Filtros alterados - clique para atualizar
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros de Bimestre */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Label className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Selecionar Bimestres para Análise (Cumulativo)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map((bimester) => (
                  <div
                    key={bimester}
                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                      loading 
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer'
                    } ${
                      selectedBimesters.includes(bimester)
                        ? 'bg-blue-100 border-blue-300 shadow-md'
                        : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-200'
                    }`}
                    onClick={() => !loading && toggleBimester(bimester)}
                  >
                    <Checkbox
                      checked={selectedBimesters.includes(bimester)}
                      disabled={loading}
                      className="border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label 
                      className={`cursor-pointer font-medium ${
                        selectedBimesters.includes(bimester) ? 'text-blue-900' : 'text-gray-700'
                      }`}
                    >
                      {bimester}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Total de dias letivos considerados: 
                  <span className="text-lg font-bold text-blue-600 ml-1">{totalSchoolDays}</span>
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Dias mínimos consecutivos */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Mínimo de dias consecutivos
                </Label>
                <Input
                  type="number"
                  value={minConsecutiveDays}
                  onChange={(e) => handleMinDaysChange(Number(e.target.value))}
                  min="1"
                  max="30"
                  className="h-10"
                  disabled={loading}
                />
              </div>

              {/* Buscar por nome */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600" />
                  Buscar estudante
                </Label>
                <Input
                  placeholder="Nome do estudante..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-10"
                  disabled={loading}
                />
              </div>

              {/* Filtro por Turma */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Turma
                </Label>
                <Select value={selectedClass} onValueChange={handleClassChange} disabled={loading}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Todas as turmas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {availableClasses.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Turno */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Turno
                </Label>
                <Select value={selectedShift} onValueChange={handleShiftChange} disabled={loading}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Todos os turnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os turnos</SelectItem>
                    <SelectItem value="MANHÃ">Manhã</SelectItem>
                    <SelectItem value="TARDE">Tarde</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Severidade */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  Severidade
                </Label>
                <Select value={selectedSeverity} onValueChange={handleSeverityChange} disabled={loading}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="warning">Atenção (10-14 dias)</SelectItem>
                    <SelectItem value="critical">Crítico (≥15 dias)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Checkbox PCD */}
              <div className="flex items-end">
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200 h-10">
                  <Checkbox
                    id="show-pcd"
                    checked={showPCD}
                    onCheckedChange={handlePCDChange}
                    disabled={loading}
                    className="border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Label htmlFor="show-pcd" className="text-sm flex items-center gap-1 cursor-pointer font-medium text-purple-800">
                    <Heart className="w-3 h-3 text-purple-600" />
                    <span>PCD</span>
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
          {/* Card de CASOS ATIVOS - destaque especial */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-600 to-red-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium flex items-center gap-1">
                    INTERVENÇÃO
                  </p>
                  <p className="text-2xl font-bold text-white">{stats.active}</p>
                  <p className="text-xs text-red-200">Períodos ativos</p>
                </div>
                <div className="relative">
                  <AlertTriangle className="h-10 w-10 text-red-200" />
                  {stats.active > 0 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-xs font-bold text-red-800">!</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de CASOS RESOLVIDOS - novo */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-green-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">RESOLVIDOS</p>
                  <p className="text-2xl font-bold text-white">{stats.resolved}</p>
                  <p className="text-xs text-green-200">Casos finalizados</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Total de Casos</p>
                  <p className="text-3xl font-bold text-red-900">{stats.total}</p>
                </div>
                <CalendarX className="h-12 w-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Atenção</p>
                  <p className="text-3xl font-bold text-orange-900">{stats.warning}</p>
                  <p className="text-xs text-orange-700">10-14 dias</p>
                </div>
                <Target className="h-12 w-12 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Crítico</p>
                  <p className="text-3xl font-bold text-red-900">{stats.critical}</p>
                  <p className="text-xs text-red-700">≥15 dias</p>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Estudantes PCD</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.withDisability}</p>
                </div>
                <Heart className="h-12 w-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Média de Dias</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.averageConsecutiveDays}</p>
                </div>
                <TrendingDown className="h-12 w-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas informativos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Alert className="border-orange-200 bg-orange-50">
            <Target className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>Atenção (10-14 dias):</strong> Estudantes com 10 a 14 dias letivos 
              consecutivos de falta precisam de acompanhamento preventivo imediato.
            </AlertDescription>
          </Alert>

          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <strong>Crítico (≥15 dias):</strong> Situação grave que exige intervenção 
              urgente e possível aplicação de medidas legais.
            </AlertDescription>
          </Alert>
        </div>

        {/* Lista de Resultados */}
        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analisando faltas consecutivas...</p>
            </CardContent>
          </Card>
        ) : filteredResults.length > 0 ? (
          <>
            {/* SEÇÃO 1: CASOS ATIVOS (URGENTE) */}
            {activeStudents.length > 0 && (
              <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <div>🚨 Intervenção Urgente - Faltas Ativas</div>
                      <p className="text-sm font-normal text-red-600 mt-1">
                        {activeStudents.length} caso{activeStudents.length > 1 ? 's' : ''} em andamento
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paginatedResults.activeStudentsPaginated.map((absence, index) => (
                      <div
                        key={absence.estudanteId}
                        className={`p-4 rounded-lg border-2 shadow-lg transition-all duration-300 ${
                          isHydrated && resolvedCases.has(absence.estudanteId)
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100 opacity-75'
                            : 'border-red-300 bg-gradient-to-br from-red-50 to-red-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">#{(currentActivePage - 1) * itemsPerPage + index + 1}</span>
                              <div>
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  {absence.studentName}
                                  {absence.hasDisability && (
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                      <Heart className="h-3 w-3 mr-1" />
                                      PCD
                                    </Badge>
                                  )}
                                  {isHydrated && resolvedCases.has(absence.estudanteId) && (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolvido
                                    </Badge>
                                  )}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {absence.className}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {absence.shift}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge 
                              className={
                                absence.severity === 'critical'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-orange-100 text-orange-800 border-orange-200'
                              }
                            >
                              {absence.severity === 'critical' ? 'Crítico' : 'Atenção'}
                            </Badge>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigateToStudentProfile(absence.estudanteId)}
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:border-blue-400 group"
                                title="Ver perfil completo do estudante"
                              >
                                <User className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                              </button>

                              {isHydrated && !resolvedCases.has(absence.estudanteId) && (
                                <Button
                                  onClick={() => handleResolveAbsence(absence)}
                                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2 h-9"
                                  size="sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  Resolver
                                </Button>
                              )}

                              <button
                                onClick={() => toggleStudentExpansion(absence.estudanteId)}
                                className="p-2 rounded-lg bg-white/60 hover:bg-white transition-all duration-200 border border-gray-300 hover:border-blue-400"
                                title={expandedStudents.has(absence.estudanteId) ? 'Recolher detalhes' : 'Ver detalhes das faltas'}
                              >
                                {expandedStudents.has(absence.estudanteId) ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Dias consecutivos:</span>
                            <div className="font-bold text-lg text-red-600">
                              {absence.consecutiveDays} dias
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Período:</span>
                            <div className="font-medium">
                              {absence.startDate} a {absence.endDate}
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Total de faltas:</span>
                            <div className="font-bold">
                              {absence.totalAbsences} faltas
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Status:</span>
                            <div className={`font-medium ${
                              isHydrated && resolvedCases.has(absence.estudanteId)
                                ? 'text-green-600'
                                : absence.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {isHydrated && resolvedCases.has(absence.estudanteId)
                                ? 'Caso Resolvido'
                                : absence.severity === 'critical'
                                  ? 'Intervenção Urgente'
                                  : 'Acompanhamento Necessário'
                              }
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo expandido */}
                        {expandedStudents.has(absence.estudanteId) && absence.allAbsences && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="mb-4">
                              <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-blue-600" />
                                Detalhes das Faltas ({absence.allAbsences.length} total)
                              </h5>
                              
                              {/* Períodos consecutivos destacados */}
                              {absence.consecutivePeriods && absence.consecutivePeriods.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="text-sm font-medium text-gray-800 mb-2">Períodos Consecutivos Identificados:</h6>
                                  <div className="grid gap-2">
                                    {absence.consecutivePeriods.map((period, periodIndex) => (
                                      <div key={periodIndex} className="bg-red-100 border border-red-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-red-800">
                                            Período {periodIndex + 1}: {period.start} a {period.end}
                                          </span>
                                          <Badge className="bg-red-200 text-red-800">
                                            {period.days} dias consecutivos
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          
                              {/* Lista de todas as faltas */}
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h6 className="text-sm font-medium text-gray-800 mb-3">Todas as Faltas (ordenadas por data):</h6>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                  {absence.allAbsences
                                    .sort((a, b) => parseDateDDMMYYYY(a).getTime() - parseDateDDMMYYYY(b).getTime())
                                    .map((falta, faltaIndex) => {
                                      const { inPeriod, period } = isDateInConsecutivePeriod(falta, absence.consecutivePeriods || []);
                                      return (
                                        <div
                                          key={faltaIndex}
                                          className={`p-2 rounded text-center text-xs border transition-all duration-200 ${
                                            inPeriod
                                              ? 'bg-red-200 border-red-400 text-red-900 font-bold shadow-md'
                                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                                          }`}
                                          title={
                                            inPeriod 
                                              ? `Parte do período consecutivo: ${period?.start} a ${period?.end} (${period?.days} dias)`
                                              : 'Falta isolada'
                                          }
                                        >
                                          {falta}
                                        </div>
                                      );
                                    })}
                                </div>
                                
                                {/* Legenda */}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-200 border border-red-400 rounded"></div>
                                      <span className="text-gray-600">Faltas consecutivas</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                                      <span className="text-gray-600">Faltas isoladas</span>
                                    </div>
                                    <div className="ml-auto text-gray-500">
                                      Total: {absence.allAbsences.length} faltas
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Controles de Paginação para Casos Ativos */}
            {activeStudents.length > itemsPerPage && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Mostrando {Math.min((currentActivePage - 1) * itemsPerPage + 1, activeStudents.length)} - {Math.min(currentActivePage * itemsPerPage, activeStudents.length)} de {activeStudents.length} casos ativos
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentActivePage(currentActivePage - 1)}
                        disabled={currentActivePage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(activeStudents.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentActivePage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentActivePage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentActivePage(currentActivePage + 1)}
                        disabled={currentActivePage === Math.ceil(activeStudents.length / itemsPerPage)}
                        className="flex items-center gap-1"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* SEÇÃO 2: CASOS INATIVOS */}
            {inactiveStudents.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <div>Histórico de Faltas Consecutivas</div>
                      <p className="text-sm font-normal text-gray-600 mt-1">
                        {inactiveStudents.length} caso{inactiveStudents.length > 1 ? 's' : ''} concluído{inactiveStudents.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paginatedResults.inactiveStudentsPaginated.map((absence, index) => (
                      <div
                        key={absence.estudanteId}
                        className={`p-4 rounded-lg border transition-all duration-200 ${
                          isHydrated && resolvedCases.has(absence.estudanteId)
                            ? 'bg-green-50 border-green-200 opacity-60'
                            : absence.severity === 'critical'
                              ? 'bg-red-50 border-red-200 opacity-80'
                              : 'bg-orange-50 border-orange-200 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">#{(currentInactivePage - 1) * itemsPerPage + index + 1}</span>
                              <div>
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  {absence.studentName}
                                  {absence.hasDisability && (
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                      <Heart className="h-3 w-3 mr-1" />
                                      PCD
                                    </Badge>
                                  )}
                                  {isHydrated && resolvedCases.has(absence.estudanteId) && (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolvido
                                    </Badge>
                                  )}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {absence.className}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {absence.shift}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge 
                              className={
                                absence.severity === 'critical'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-orange-100 text-orange-800 border-orange-200'
                              }
                            >
                              {absence.severity === 'critical' ? 'Crítico' : 'Atenção'}
                            </Badge>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigateToStudentProfile(absence.estudanteId)}
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:border-blue-400 group"
                                title="Ver perfil completo do estudante"
                              >
                                <User className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                              </button>

                              {isHydrated && !resolvedCases.has(absence.estudanteId) && (
                                <Button
                                  onClick={() => handleResolveAbsence(absence)}
                                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2 h-9"
                                  size="sm"
                                >
                                  <FileText className="w-4 h-4" />
                                  Resolver
                                </Button>
                              )}

                              <button
                                onClick={() => toggleStudentExpansion(absence.estudanteId)}
                                className="p-2 rounded-lg bg-white/60 hover:bg-white transition-all duration-200 border border-gray-300 hover:border-blue-400"
                                title={expandedStudents.has(absence.estudanteId) ? 'Recolher detalhes' : 'Ver detalhes das faltas'}
                              >
                                {expandedStudents.has(absence.estudanteId) ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Dias consecutivos:</span>
                            <div className="font-bold text-lg text-red-600">
                              {absence.consecutiveDays} dias
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Período:</span>
                            <div className="font-medium">
                              {absence.startDate} a {absence.endDate}
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Total de faltas:</span>
                            <div className="font-bold">
                              {absence.totalAbsences} faltas
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Status:</span>
                            <div className={`font-medium ${
                              resolvedCases.has(absence.estudanteId)
                                ? 'text-green-600'
                                : absence.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {resolvedCases.has(absence.estudanteId)
                                ? 'Caso Resolvido'
                                : 'Período Concluído'
                              }
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo expandido - usar mesmo código existente */}
                        {expandedStudents.has(absence.estudanteId) && absence.allAbsences && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="mb-4">
                              <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-blue-600" />
                                Detalhes das Faltas ({absence.allAbsences.length} total)
                              </h5>
                              
                              {absence.consecutivePeriods && absence.consecutivePeriods.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="text-sm font-medium text-gray-800 mb-2">Períodos Consecutivos Identificados:</h6>
                                  <div className="grid gap-2">
                                    {absence.consecutivePeriods.map((period, periodIndex) => (
                                      <div key={periodIndex} className="bg-red-100 border border-red-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-red-800">
                                            Período {periodIndex + 1}: {period.start} a {period.end}
                                          </span>
                                          <Badge className="bg-red-200 text-red-800">
                                            {period.days} dias consecutivos
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h6 className="text-sm font-medium text-gray-800 mb-3">Todas as Faltas (ordenadas por data):</h6>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                  {absence.allAbsences
                                    .sort((a, b) => parseDateDDMMYYYY(a).getTime() - parseDateDDMMYYYY(b).getTime())
                                    .map((falta, faltaIndex) => {
                                      const { inPeriod, period } = isDateInConsecutivePeriod(falta, absence.consecutivePeriods || []);
                                      return (
                                        <div
                                          key={faltaIndex}
                                          className={`p-2 rounded text-center text-xs border transition-all duration-200 ${
                                            inPeriod
                                              ? 'bg-red-200 border-red-400 text-red-900 font-bold shadow-md'
                                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                                          }`}
                                          title={
                                            inPeriod 
                                              ? `Parte do período consecutivo: ${period?.start} a ${period?.end} (${period?.days} dias)`
                                              : 'Falta isolada'
                                          }
                                        >
                                          {falta}
                                        </div>
                                      );
                                    })}
                                </div>
                                
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-red-200 border border-red-400 rounded"></div>
                                      <span className="text-gray-600">Faltas consecutivas</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                                      <span className="text-gray-600">Faltas isoladas</span>
                                    </div>
                                    <div className="ml-auto text-gray-500">
                                      Total: {absence.allAbsences.length} faltas
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Controles de Paginação para Casos Inativos */}
            {inactiveStudents.length > itemsPerPage && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Mostrando {Math.min((currentInactivePage - 1) * itemsPerPage + 1, inactiveStudents.length)} - {Math.min(currentInactivePage * itemsPerPage, inactiveStudents.length)} de {inactiveStudents.length} casos inativos
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentInactivePage(currentInactivePage - 1)}
                        disabled={currentInactivePage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(inactiveStudents.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentInactivePage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentInactivePage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentInactivePage(currentInactivePage + 1)}
                        disabled={currentInactivePage === Math.ceil(inactiveStudents.length / itemsPerPage)}
                        className="flex items-center gap-1"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SEÇÃO 3: CASOS RESOLVIDOS */}
            {resolvedStudents.length > 0 && (
              <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div>✅ Casos Resolvidos</div>
                      <p className="text-sm font-normal text-green-600 mt-1">
                        {resolvedStudents.length} caso{resolvedStudents.length > 1 ? 's' : ''} com intervenção registrada
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paginatedResults.resolvedStudentsPaginated.map((absence, index) => (
                      <div
                        key={absence.estudanteId}
                        className="p-4 rounded-lg border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100 shadow-lg opacity-90"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">#{(currentResolvedPage - 1) * itemsPerPage + index + 1}</span>
                              <div>
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  {absence.studentName}
                                  {absence.hasDisability && (
                                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                                      <Heart className="h-3 w-3 mr-1" />
                                      PCD
                                    </Badge>
                                  )}
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Resolvido
                                  </Badge>
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {absence.className}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {absence.shift}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Finalizado
                            </Badge>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigateToStudentProfile(absence.estudanteId)}
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 border border-blue-200 hover:border-blue-400 group"
                                title="Ver perfil completo do estudante"
                              >
                                <User className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                              </button>

                              <button
                                onClick={() => toggleStudentExpansion(absence.estudanteId)}
                                className="p-2 rounded-lg bg-white/60 hover:bg-white transition-all duration-200 border border-gray-300 hover:border-blue-400"
                                title={expandedStudents.has(absence.estudanteId) ? 'Recolher detalhes' : 'Ver detalhes das faltas'}
                              >
                                {expandedStudents.has(absence.estudanteId) ? (
                                  <ChevronUp className="h-4 w-4 text-gray-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Dias consecutivos:</span>
                            <div className="font-bold text-lg text-green-600">
                              {absence.consecutiveDays} dias
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Período:</span>
                            <div className="font-medium">
                              {absence.startDate} a {absence.endDate}
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Total de faltas:</span>
                            <div className="font-bold">
                              {absence.totalAbsences} faltas
                            </div>
                          </div>
                          <div className="bg-white/60 p-3 rounded border">
                            <span className="text-gray-600">Status:</span>
                            <div className="font-medium text-green-600">
                              Caso Resolvido
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo expandido - mesmo código das outras seções */}
                        {expandedStudents.has(absence.estudanteId) && absence.allAbsences && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="mb-4">
                              <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-blue-600" />
                                Detalhes das Faltas ({absence.allAbsences.length} total)
                              </h5>

                              {absence.consecutivePeriods && absence.consecutivePeriods.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="text-sm font-medium text-gray-800 mb-2">Períodos Consecutivos Identificados:</h6>
                                  <div className="grid gap-2">
                                    {absence.consecutivePeriods.map((period, periodIndex) => (
                                      <div key={periodIndex} className="bg-green-100 border border-green-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-green-800">
                                            Período {periodIndex + 1}: {period.start} a {period.end}
                                          </span>
                                          <Badge className="bg-green-200 text-green-800">
                                            {period.days} dias consecutivos
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="bg-gray-50 rounded-lg p-4">
                                <h6 className="text-sm font-medium text-gray-800 mb-3">Todas as Faltas (ordenadas por data):</h6>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                  {absence.allAbsences
                                    .sort((a, b) => parseDateDDMMYYYY(a).getTime() - parseDateDDMMYYYY(b).getTime())
                                    .map((falta, faltaIndex) => {
                                      const { inPeriod, period } = isDateInConsecutivePeriod(falta, absence.consecutivePeriods || []);
                                      return (
                                        <div
                                          key={faltaIndex}
                                          className={`p-2 rounded text-center text-xs border transition-all duration-200 ${
                                            inPeriod
                                              ? 'bg-green-200 border-green-400 text-green-900 font-bold shadow-md'
                                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                                          }`}
                                          title={
                                            inPeriod
                                              ? `Parte do período consecutivo: ${period?.start} a ${period?.end} (${period?.days} dias)`
                                              : 'Falta isolada'
                                          }
                                        >
                                          {falta}
                                        </div>
                                      );
                                    })}
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
                                      <span className="text-gray-600">Faltas consecutivas</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                                      <span className="text-gray-600">Faltas isoladas</span>
                                    </div>
                                    <div className="ml-auto text-gray-500">
                                      Total: {absence.allAbsences.length} faltas
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Controles de Paginação para Casos Resolvidos */}
            {resolvedStudents.length > itemsPerPage && (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Mostrando {Math.min((currentResolvedPage - 1) * itemsPerPage + 1, resolvedStudents.length)} - {Math.min(currentResolvedPage * itemsPerPage, resolvedStudents.length)} de {resolvedStudents.length} casos resolvidos
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentResolvedPage(currentResolvedPage - 1)}
                        disabled={currentResolvedPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(resolvedStudents.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentResolvedPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentResolvedPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentResolvedPage(currentResolvedPage + 1)}
                        disabled={currentResolvedPage === Math.ceil(resolvedStudents.length / itemsPerPage)}
                        className="flex items-center gap-1"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum caso encontrado
              </h3>
              <p className="text-gray-600">
                Não foram encontrados estudantes com {minConsecutiveDays} ou mais dias 
                letivos consecutivos de falta nos critérios selecionados.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer com instruções */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Como Interpretar os Resultados</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-white/60 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">🟡 Atenção (10-14 dias)</h4>
                <p className="text-blue-800">
                  Contato imediato com responsáveis e início do acompanhamento preventivo
                </p>
              </div>
              <div className="p-3 bg-white/60 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">🔴 Crítico (≥15 dias)</h4>
                <p className="text-blue-800">
                  Intervenção urgente, reunião presencial e possível aplicação legal
                </p>
              </div>
              <div className="p-3 bg-white/60 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💜 Estudantes PCD</h4>
                <p className="text-blue-800">
                  Atenção especial considerando necessidades específicas e barreiras
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}