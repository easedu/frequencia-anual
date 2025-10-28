/**
 * Formatadores centralizados
 * Consolidação de todas as funções de formatação espalhadas pelo codebase
 */

import { logger } from '@/utils/logger';
import type { Endereco } from '@/types';

// Cache para formatações frequentes
const formatCache = new Map<string, string>();

// ============================================================================
// FORMATADORES DE DATA
// ============================================================================

/**
 * Formata data do Firebase (yyyy-mm-dd) para o formato brasileiro (dd/mm/yyyy)
 */
export function formatFirebaseDate(dateStr: string | undefined): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  
  // Verificar cache primeiro
  if (formatCache.has(dateStr)) {
    return formatCache.get(dateStr)!;
  }
  
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "";
    
    const formatted = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    formatCache.set(dateStr, formatted);
    return formatted;
  } catch (error) {
    logger.error('Erro ao formatar data do Firebase', {}, error as Error);
    return "";
  }
}

/**
 * Formata data genérica para formato brasileiro
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString || typeof dateString !== "string") {
    return "";
  }

  // Verificar cache primeiro
  if (formatCache.has(dateString)) {
    return formatCache.get(dateString)!;
  }

  try {
    let date: Date;
    let formattedDate: string;

    // Verificar se já está no formato dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return dateString;
    }

    // Formato ddmmyyyy (8 dígitos sem separadores) - comum no Firebase
    if (/^\d{8}$/.test(dateString)) {
      const day = dateString.substring(0, 2);
      const month = dateString.substring(2, 4);
      const year = dateString.substring(4, 8);
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      if (!isNaN(date.getTime())) {
        formattedDate = `${day}/${month}/${year}`;
        formatCache.set(dateString, formattedDate);
        return formattedDate;
      }
    }

    // Tentar diferentes formatos
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        // Assumir formato yyyy-mm-dd
        const [year, month, day] = parts;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        date = new Date(dateString);
      }
    } else if (dateString.includes('/')) {
      // Formato dd/mm/yyyy ou mm/dd/yyyy
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [first, second, third] = parts;
        // Assumir dd/mm/yyyy se o primeiro for <= 31
        if (parseInt(first) <= 31) {
          date = new Date(parseInt(third), parseInt(second) - 1, parseInt(first));
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
    } else {
      // Tenta criar a data diretamente
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return "";
    }

    formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    
    // Cache the result
    formatCache.set(dateString, formattedDate);
    return formattedDate;

  } catch (error) {
    logger.error('Erro ao formatar data', {}, error as Error);
    return "";
  }
}

/**
 * Formata input de data com máscara automática
 */
export function formatDateInput(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

/**
 * Alias para compatibilidade - formatação de data de nascimento
 */
export const formatDataNascimento = formatDate;

/**
 * Converte data DD/MM/YYYY para formato Firebase YYYY-MM-DD
 */
export function parseDateToFirebase(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  
  try {
    // Se já está no formato Firebase
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return "";
  } catch (error) {
    logger.error('Erro ao converter data para Firebase', {}, error as Error);
    return "";
  }
}

/**
 * Parse data genérica para objeto Date
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    // DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    return new Date(dateStr);
  } catch (error) {
    logger.error('Erro ao fazer parse da data', {}, error as Error);
    return null;
  }
}

// ============================================================================
// FORMATADORES DE CONTATO
// ============================================================================

/**
 * Formata número de telefone com máscara
 */
export function formatPhoneNumber(value: string | undefined): string {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Limpa formatação do telefone, mantendo apenas números
 */
export function cleanTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

/**
 * Formata CEP com máscara
 */
export function formatCep(cep: string | undefined): string {
  if (!cep) return '';
  const digits = cep.replace(/\D/g, '');
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/**
 * Limpa formatação do CEP, mantendo apenas números
 */
export function cleanCep(cep: string): string {
  return cep.replace(/\D/g, '');
}

// ============================================================================
// FORMATADORES DE ENDEREÇO
// ============================================================================

/**
 * Formata endereço completo em string legível
 */
export function formatAddress(endereco?: Endereco): string {
  if (!endereco) return 'Nenhum endereço cadastrado';
  
  const { rua, numero, complemento, bairro, cidade, estado, cep } = endereco;
  const parts = [
    rua && numero ? `${rua}, ${numero}` : rua,
    complemento,
    bairro,
    cidade && estado ? `${cidade} - ${estado}` : cidade || estado,
    cep ? formatCep(cep) : undefined
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'Endereço incompleto';
}

// ============================================================================
// FORMATADORES DE TEXTO
// ============================================================================

/**
 * Formata nome próprio (primeira letra maiúscula)
 */
export function formatProperName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Trunca texto com reticências
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Formata número com separadores de milhares
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Formata porcentagem
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ============================================================================
// FORMATADORES DE DADOS ESPECÍFICOS DA APLICAÇÃO
// ============================================================================

/**
 * Formata lista de tipos de deficiência
 */
export function formatDeficiencyTypes(types: string[] | undefined): string {
  if (!types || types.length === 0) return 'Nenhuma';
  return types.join(', ');
}

/**
 * Formata status de estudante com cor
 */
export function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'ATIVO': return 'bg-green-100 text-green-800 border-green-200';
    case 'INATIVO': return 'bg-red-100 text-red-800 border-red-200';
    case 'TRANSFERIDO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Formata turno com cor
 */
export function getTurnoColor(turno: string): string {
  switch (turno?.toUpperCase()) {
    case 'MANHÃ': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'TARDE': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Formata bolsa família com cor
 */
export function getBolsaFamiliaColor(bolsa: string): string {
  switch (bolsa?.toUpperCase()) {
    case 'SIM': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'NÃO': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/**
 * Calcula faixa de frequência baseada na porcentagem
 * Faixa 4: 100% à 76%, Faixa 3: 75% à 51%, Faixa 2: 50% à 26%, Faixa 1: 25% à 0%
 */
export function getFrequencyBand(percentualFrequencia: number): {
  faixa: number;
  label: string;
  color: string;
} {
  if (percentualFrequencia >= 76) {
    return {
      faixa: 4,
      label: 'Faixa 4',
      color: 'bg-green-100 text-green-800 border-green-200'
    };
  } else if (percentualFrequencia >= 51) {
    return {
      faixa: 3,
      label: 'Faixa 3',
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    };
  } else if (percentualFrequencia >= 26) {
    return {
      faixa: 2,
      label: 'Faixa 2',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
  } else {
    return {
      faixa: 1,
      label: 'Faixa 1',
      color: 'bg-red-100 text-red-800 border-red-200'
    };
  }
}

// ============================================================================
// UTILITÁRIOS DE LIMPEZA DE CACHE
// ============================================================================

/**
 * Limpa o cache de formatação
 */
export function clearFormatCache(): void {
  formatCache.clear();
}

/**
 * Obtém estatísticas do cache
 */
export function getFormatCacheStats() {
  return {
    size: formatCache.size,
    entries: Array.from(formatCache.keys()).slice(0, 10), // Apenas primeiras 10 para debug
  };
}