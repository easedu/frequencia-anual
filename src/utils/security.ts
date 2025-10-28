/**
 * Utilitários de segurança e sanitização
 * Proteção contra XSS e validação de inputs
 */

/**
 * Sanitiza string para prevenir XSS
 * Remove caracteres perigosos mas mantém acentos e caracteres especiais válidos
 */
export const sanitizeString = (input: string | undefined): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/&lt;script&gt;/gi, '') // Remove encoded script tags
    .replace(/&lt;\/script&gt;/gi, '')
    .trim();
};

/**
 * Sanitiza HTML para uso seguro em innerHTML
 */
export const sanitizeHTML = (html: string): string => {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
};

/**
 * Valida e sanitiza email
 */
export const sanitizeEmail = (email: string | undefined): string => {
  if (!email) return '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = email.toLowerCase().trim();
  
  return emailRegex.test(cleaned) ? cleaned : '';
};

/**
 * Valida e sanitiza telefone brasileiro
 */
export const sanitizePhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '';
  
  // Remove tudo que não é dígito
  const digits = phone.replace(/\D/g, '');
  
  // Valida se tem 10 ou 11 dígitos
  if (digits.length < 10 || digits.length > 11) return '';
  
  // Formata para (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
};

/**
 * Valida e sanitiza CEP brasileiro
 */
export const sanitizeCEP = (cep: string | undefined): string => {
  if (!cep) return '';
  
  const digits = cep.replace(/\D/g, '');
  
  if (digits.length !== 8) return '';
  
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

/**
 * Sanitiza nome (remove caracteres especiais mas mantém acentos)
 */
export const sanitizeName = (name: string | undefined): string => {
  if (!name) return '';
  
  return name
    .replace(/[<>\/\\&"']/g, '') // Remove caracteres perigosos
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
    .slice(0, 100); // Limita tamanho
};

/**
 * Sanitiza data no formato DD/MM/YYYY
 */
export const sanitizeDate = (date: string | undefined): string => {
  if (!date) return '';
  
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = date.match(dateRegex);
  
  if (!match) return '';
  
  const [, day, month, year] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  
  // Validações básicas
  if (dayNum < 1 || dayNum > 31) return '';
  if (monthNum < 1 || monthNum > 12) return '';
  if (yearNum < 1900 || yearNum > 2100) return '';
  
  return date;
};

/**
 * Sanitiza descrição/texto longo
 */
export const sanitizeDescription = (description: string | undefined): string => {
  if (!description) return '';
  
  return description
    .replace(/[<>]/g, '') // Remove tags HTML básicas
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 1000); // Limita tamanho
};

/**
 * Valida se um arquivo é seguro para upload
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Tipo de arquivo não permitido. Use apenas CSV ou Excel.' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'Arquivo muito grande. Máximo 5MB.' };
  }
  
  return { isValid: true };
};

/**
 * Sanitiza objeto recursivamente
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) : item
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
};