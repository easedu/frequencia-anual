/**
 * Sistema de configuração centralizado
 * Resolve o problema crítico de anos hard-coded
 */

// Configuração do ano letivo atual
export const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || 
  new Date().getFullYear().toString();

// Configurações do Firebase
export const FIREBASE_COLLECTIONS = {
  STUDENTS: `${CURRENT_SCHOOL_YEAR}`,
  STUDENT_LIST: `lista_de_estudantes`,
  ACADEMIC_YEAR: `ano_letivo`,
  ABSENCES: `faltas`,
  ABSENCE_CONTROL: `controle`,
  MEDICAL_CERTIFICATES: `atestados`,
  INTERACTIONS: `interactions`,
  USERS: `users`,
} as const;

// Configurações de performance
export const PERFORMANCE_CONFIG = {
  PAGINATION_SIZE: 50,
  SEARCH_DEBOUNCE_MS: 300,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutos
  MAX_BATCH_SIZE: 500,
} as const;

// Configurações de UI
export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 200,
  VIRTUAL_ITEM_HEIGHT: 60,
} as const;

// Configurações de validação
export const VALIDATION_CONFIG = {
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  PHONE_REGEX: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  CEP_REGEX: /^\d{5}-\d{3}$/,
  DATE_FORMAT: 'DD/MM/YYYY',
} as const;

// Configurações de segurança
export const SECURITY_CONFIG = {
  ALLOWED_FILE_TYPES: ['text/csv', 'application/vnd.ms-excel'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_UPLOAD_FILES: 1,
} as const;

// Helper functions para Firebase paths
export const getFirebasePath = (...segments: string[]) => segments.join('/');

export const FIREBASE_PATHS = {
  studentList: () => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.STUDENT_LIST),
  academicYear: () => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.ACADEMIC_YEAR),
  absenceControl: () => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.ABSENCES, FIREBASE_COLLECTIONS.ABSENCE_CONTROL),
  medicalCertificates: (studentId: string) => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.MEDICAL_CERTIFICATES, studentId),
  interactions: (studentId: string) => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.INTERACTIONS, studentId),
} as const;