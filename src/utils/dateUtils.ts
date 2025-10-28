/**
 * Utilitários de data otimizados e seguros
 * Substitui a lógica complexa de formatação de datas
 */

import { logger } from './logger';
import { sanitizeDate } from './security';

// Cache para formatações de data
const formatCache = new Map<string, string>();

/**
 * Formata data de forma segura e otimizada
 * Substitui a lógica complexa do componente RegisteredAbsencesCard
 * Suporta múltiplos formatos de entrada:
 * - ISO: yyyy-mm-dd (ex: 2025-10-17)
 * - Brasileiro: dd/mm/yyyy (ex: 17/10/2025)
 * - Sem separadores: ddmmyyyy (ex: 17102025)
 *
 * Sempre retorna no formato: dd/mm/yyyy
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString || typeof dateString !== "string") {
    return "01/01/1970";
  }

  // Verificar cache primeiro
  if (formatCache.has(dateString)) {
    return formatCache.get(dateString)!;
  }

  try {
    let day: number, month: number, year: number;

    // Formato ISO: yyyy-mm-dd ou yyyy-mm-ddTHH:MM:SS (ex: 2025-10-17 ou 2025-10-17T10:30:00)
    if (dateString.includes('-')) {
      const parts = dateString.split('T')[0].split('-'); // Remove hora se existir
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      } else {
        throw new Error('Invalid ISO date format');
      }
    }
    // Formato brasileiro: dd/mm/yyyy (ex: 17/10/2025)
    else if (dateString.includes('/')) {
      const sanitized = sanitizeDate(dateString);
      if (sanitized) {
        formatCache.set(dateString, sanitized);
        return sanitized;
      }

      const parts = dateString.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      } else {
        throw new Error('Invalid Brazilian date format');
      }
    }
    // Formato sem separadores: ddmmyyyy (ex: 17102025)
    else if (/^\d{8}$/.test(dateString)) {
      day = parseInt(dateString.substring(0, 2), 10);
      month = parseInt(dateString.substring(2, 4), 10);
      year = parseInt(dateString.substring(4, 8), 10);
    }
    // Outros formatos (tentar criar Date diretamente)
    else {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      const formattedDate = formatDateToString(date);
      formatCache.set(dateString, formattedDate);
      return formattedDate;
    }

    // Validar valores extraídos
    if (!isValidDateParts(day, month, year)) {
      throw new Error('Invalid date values');
    }

    // Criar Date e formatar
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date object');
    }

    const formattedDate = formatDateToString(date);

    // Salvar no cache
    formatCache.set(dateString, formattedDate);
    return formattedDate;

  } catch (error) {
    logger.warn('Erro ao formatar a data', { dateString }, error as Error);
    return dateString; // Retorna o valor original em caso de erro
  }
};

/**
 * Valida partes da data
 */
const isValidDateParts = (day: number, month: number, year: number): boolean => {
  return (
    !isNaN(day) && !isNaN(month) && !isNaN(year) &&
    day >= 1 && day <= 31 &&
    month >= 1 && month <= 12 &&
    year >= 1900 && year <= 2100
  );
};

/**
 * Formata objeto Date para string dd/mm/yyyy
 */
const formatDateToString = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Parse de data brasileira para objeto Date
 */
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const [day, month, year] = dateStr.split('/').map(Number);
  if (!isValidDateParts(day, month, year)) return null;
  
  return new Date(year, month - 1, day);
};

/**
 * Converte data brasileira para formato Firebase (ISO)
 */
export const parseDateToFirebase = (dateStr: string): string | null => {
  const [day, month, year] = dateStr.split('/').map(Number);
  
  if (!isValidDateParts(day, month, year)) return null;
  
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

/**
 * Converte data Firebase para formato brasileiro
 */
export const formatFirebaseDate = (dateStr: string | undefined): string => {
  if (!dateStr || typeof dateStr !== "string") return "01/01/1970";
  
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!isValidDateParts(day, month, year)) return "01/01/1970";
  
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
};

/**
 * Verifica se uma data está em um período
 */
export const isDateInPeriod = (
  date: string,
  startDate: string,
  endDate: string
): boolean => {
  const dateObj = parseDate(date);
  const startObj = parseDate(startDate);
  const endObj = parseDate(endDate);
  
  if (!dateObj || !startObj || !endObj) return false;
  
  return dateObj >= startObj && dateObj <= endObj;
};

/**
 * Calcula diferença em dias entre duas datas
 */
export const daysDifference = (date1: string, date2: string): number => {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  
  if (!d1 || !d2) return 0;
  
  const timeDiff = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Obtém data atual no formato brasileiro
 */
export const getCurrentDateBR = (): string => {
  return formatDateToString(new Date());
};

/**
 * Valida se uma data não é futura
 */
export const isNotFutureDate = (dateStr: string): boolean => {
  const date = parseDate(dateStr);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date <= today;
};

/**
 * Formatadores específicos para diferentes contextos
 */
export const dateFormatters = {
  /**
   * Para exibição em listas
   */
  display: (date: string): string => formatDate(date),
  
  /**
   * Para formulários
   */
  input: (date: string): string => formatDate(date),
  
  /**
   * Para APIs
   */
  api: (date: string): string | null => parseDateToFirebase(date),
  
  /**
   * Para timestamps
   */
  timestamp: (date: string): number => {
    const d = parseDate(date);
    return d ? d.getTime() : 0;
  }
};

/**
 * Limpa o cache de formatação (útil para testes)
 */
export const clearDateCache = (): void => {
  formatCache.clear();
};

/**
 * Estatísticas do cache
 */
export const getDateCacheStats = () => ({
  size: formatCache.size,
  keys: Array.from(formatCache.keys()),
});

// ══════════════════════════════════════════════════════════════════
// HELPERS CONSOLIDADOS (de marcar-faltas, cadastrar-ano-letivo, etc)
// ══════════════════════════════════════════════════════════════════

/**
 * Adiciona zero à esquerda em números (1 → "01")
 * Consolidado de: marcar-faltas, cadastrar-ano-letivo
 */
export const padTo2Digits = (num: number): string => {
  return num.toString().padStart(2, '0');
};

/**
 * Formata Date para DD/MM/YYYY
 * Consolidado de: marcar-faltas, cadastrar-ano-letivo
 */
export const formatDateToDDMMYYYY = (date: Date): string => {
  return [
    padTo2Digits(date.getDate()),
    padTo2Digits(date.getMonth() + 1),
    date.getFullYear(),
  ].join('/');
};

/**
 * Converte DD/MM/YYYY para ISO (YYYY-MM-DD)
 * Consolidado de: marcar-faltas
 */
export const convertToISO = (dateStr: string): string => {
  const [day, month, year] = dateStr.split('/');
  const paddedMonth = month.padStart(2, '0');
  const paddedDay = day.padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

/**
 * Parse DD/MM/YYYY para Date object
 * Consolidado de: cadastrar-ano-letivo
 * Alias: parseDateFromDDMMYYYY
 */
export const parseDateFromDDMMYYYY = (dateString: string): Date => {
  const [day, month, year] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Parse genérico de string para Date
 * Consolidado de: relatorio-bolsa-familia, monitorar-faltas-consecutivas
 * Suporta múltiplos formatos: DD/MM/YYYY, YYYY-MM-DD, etc
 */
export const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Formato DD/MM/YYYY
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isValidDateParts(day, month, year)) {
      return new Date(year, month - 1, day);
    }
  }

  // Formato ISO (YYYY-MM-DD)
  if (dateStr.includes('-')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Outros formatos
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Converte DD/MM/YYYY para formato Supabase (YYYY-MM-DD)
 * Consolidado de: monitorar-faltas-consecutivas
 */
export const parseDateToSupabase = (dateStr: string): string | null => {
  const [day, month, year] = dateStr.split('/').map(Number);

  if (!isValidDateParts(day, month, year)) return null;

  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

// Limpar cache periodicamente (evitar vazamentos de memória)
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (formatCache.size > 1000) {
      formatCache.clear();
    }
  }, 5 * 60 * 1000); // A cada 5 minutos
}