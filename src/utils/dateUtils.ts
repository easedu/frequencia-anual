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
    let date: Date;
    let formattedDate: string;

    // Verificar se a string já está no formato dd/mm/yyyy
    if (dateString.includes('/')) {
      const sanitized = sanitizeDate(dateString);
      if (sanitized) {
        formatCache.set(dateString, sanitized);
        return sanitized;
      }
      
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        
        // Validação básica
        if (isValidDateParts(day, month, year)) {
          date = new Date(year, month - 1, day);
          formattedDate = formatDateToString(date);
        } else {
          throw new Error('Invalid date parts');
        }
      } else {
        throw new Error('Invalid date format');
      }
    }
    // Verificar se está no formato ISO (yyyy-mm-dd ou yyyy-mm-ddThh:mm:ss)
    else if (dateString.includes('-')) {
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid ISO date');
      }
      formattedDate = formatDateToString(date);
    }
    // Outros formatos
    else {
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      formattedDate = formatDateToString(date);
    }

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

// Limpar cache periodicamente (evitar vazamentos de memória)
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (formatCache.size > 1000) {
      formatCache.clear();
      logger.info('Date cache cleared due to size limit');
    }
  }, 5 * 60 * 1000); // A cada 5 minutos
}