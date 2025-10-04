/**
 * Sistema de configuração centralizado
 * Resolve o problema crítico de anos hard-coded
 */

// Configuração do ano letivo atual
export const CURRENT_SCHOOL_YEAR = process.env.NEXT_PUBLIC_SCHOOL_YEAR || 
  new Date().getFullYear().toString();

// Configurações do Firebase

// V3 - Nova estrutura unificada (autoritativa)
export const FIREBASE_COLLECTIONS_V3 = {
  STUDENTS: `students`, // Raiz da estrutura V3
  CONTACTS: `contacts`, // Subcoleção de contatos
  WHATSAPP_TRACKING: `whatsapp`, // Subcoleção de rastreamento WhatsApp
  ABSENCES: `absences`, // Subcoleção de faltas
  MEDICAL_CERTIFICATES: `medical_certificates`, // Subcoleção de atestados
  SUSPENSIONS: `suspensions`, // Subcoleção de suspensões
  INTERACTIONS: `interactions`, // Subcoleção de interações
} as const;

// V2 - Estrutura escola/students (em fase de descontinuação)
export const FIREBASE_COLLECTIONS_V2 = {
  ROOT: `${CURRENT_SCHOOL_YEAR}`,
  ESCOLA: `escola`,
  STUDENTS: `students`,
} as const;

// V1 - Estrutura legada (somente leitura)
export const FIREBASE_COLLECTIONS = {
  STUDENTS: `${CURRENT_SCHOOL_YEAR}`,
  STUDENT_LIST: `lista_de_estudantes`,
  ACADEMIC_YEAR: `ano_letivo`,
  ABSENCES: `faltas`,
  ABSENCE_CONTROL: `controle`,
  MEDICAL_CERTIFICATES: `atestados`,
  SUSPENSIONS: `suspensoes`,
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

// V3 Paths - Nova estrutura unificada
export const FIREBASE_PATHS_V3 = {
  // Coleção raiz de estudantes
  students: () => FIREBASE_COLLECTIONS_V3.STUDENTS,

  // Documento de um estudante específico
  student: (studentId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId),

  // Subcoleção de contatos de um estudante
  contacts: (studentId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId, FIREBASE_COLLECTIONS_V3.CONTACTS),

  // Documento de um contato específico
  contact: (studentId: string, contactId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId, FIREBASE_COLLECTIONS_V3.CONTACTS, contactId),

  // Subcoleção de rastreamento WhatsApp
  whatsappTracking: (studentId: string, contactId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId, FIREBASE_COLLECTIONS_V3.CONTACTS, contactId, FIREBASE_COLLECTIONS_V3.WHATSAPP_TRACKING),

  // Subcoleção de faltas
  absences: (studentId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId, FIREBASE_COLLECTIONS_V3.ABSENCES),

  // Subcoleção de atestados médicos
  medicalCertificates: (studentId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId, FIREBASE_COLLECTIONS_V3.MEDICAL_CERTIFICATES),

  // Subcoleção de suspensões
  suspensions: (studentId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId, FIREBASE_COLLECTIONS_V3.SUSPENSIONS),

  // Subcoleção de interações
  interactions: (studentId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V3.STUDENTS, studentId, FIREBASE_COLLECTIONS_V3.INTERACTIONS),
} as const;

// V2 Paths - Estrutura escola/students
export const FIREBASE_PATHS_V2 = {
  // Coleção de estudantes em escola
  students: () =>
    getFirebasePath(FIREBASE_COLLECTIONS_V2.ROOT, FIREBASE_COLLECTIONS_V2.ESCOLA, FIREBASE_COLLECTIONS_V2.STUDENTS),

  // Documento de um estudante específico
  student: (studentId: string) =>
    getFirebasePath(FIREBASE_COLLECTIONS_V2.ROOT, FIREBASE_COLLECTIONS_V2.ESCOLA, FIREBASE_COLLECTIONS_V2.STUDENTS, studentId),
} as const;

// V1 Paths - Estrutura legada (manter para compatibilidade)
export const FIREBASE_PATHS = {
  students: () => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.STUDENT_LIST),
  studentList: () => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.STUDENT_LIST),
  academicYear: () => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.ACADEMIC_YEAR),
  absenceControl: () => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.ABSENCES, FIREBASE_COLLECTIONS.ABSENCE_CONTROL),
  medicalCertificates: (studentId: string) => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.MEDICAL_CERTIFICATES, studentId),
  suspensions: (studentId: string) => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.SUSPENSIONS, studentId),
  interactions: (studentId: string) => getFirebasePath(FIREBASE_COLLECTIONS.STUDENTS, FIREBASE_COLLECTIONS.INTERACTIONS, studentId),
} as const;