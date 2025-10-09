/**
 * Student Validation Schemas with Zod
 *
 * Provides strong type-safe validation for all student operations
 */

import { z } from 'zod';
import { uuidSchema, isoDateSchema, phoneSchema, cepSchema } from './common';

// ============================================================================
// NESTED SCHEMAS
// ============================================================================

/**
 * Contact schema
 */
export const contactSchema = z.object({
  nome: z.string().min(1, 'Nome do contato é obrigatório'),
  telefone: phoneSchema,
});

/**
 * Address schema
 */
export const addressSchema = z.object({
  rua: z.string().min(1, 'Rua é obrigatória'),
  numero: z.string().min(1, 'Número é obrigatório'),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'Estado deve ter 2 letras (ex: SP)'),
  cep: cepSchema,
  complemento: z.string().default(''),
});

/**
 * Disability schema
 */
export const disabilitySchema = z.object({
  estudanteComDeficiencia: z.boolean(),
  tipoDeficiencia: z.array(z.string()).optional(),
  possuiBarreiras: z.boolean().optional(),
  aee: z.enum(['PAEE', 'PAAI']).optional(),
  instituicao: z.enum([
    'INSTITUTO JÔ CLEMENTE',
    'CLIFAK',
    'CEJOLE',
    'CCA',
    'NENHUM'
  ]).optional(),
  horarioAtendimento: z.enum([
    'NENHUM',
    'NO TURNO',
    'CONTRATURNO'
  ]).optional(),
  atendimentoSaude: z.array(z.string()).optional(),
  possuiEstagiario: z.boolean().optional(),
  nomeEstagiario: z.string().optional(),
  justificativaEstagiario: z.string().optional(),
  ave: z.boolean().optional(),
  nomeAve: z.string().optional(),
  justificativaAve: z.array(z.string()).optional(),
});

/**
 * Test result schema (Prova São Paulo)
 */
export const testResultSchema = z.object({
  matricula: z.string().optional(),
  edicao: z.string().min(1, 'Edição é obrigatória'),
  mediaAluno: z.number().min(0).max(10),
  nivelProficiencia: z.string().min(1, 'Nível de proficiência é obrigatório'),
  anoEscolar: z.string().min(1, 'Ano escolar é obrigatório'),
  disciplina: z.string().optional(),
  dataImportacao: z.string(),
});

// ============================================================================
// MAIN STUDENT SCHEMA
// ============================================================================

/**
 * Complete student schema with all validations
 */
export const studentSchema = z.object({
  // Required fields
  estudanteId: uuidSchema,
  nome: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .transform(val => val.toUpperCase()),

  turma: z.string()
    .min(2, 'Turma deve ter no mínimo 2 caracteres')
    .max(5, 'Turma deve ter no máximo 5 caracteres')
    .transform(val => val.toUpperCase()),

  status: z.enum(['ATIVO', 'INATIVO', 'TRANSFERIDO', 'DESLIGADO'], {
    errorMap: () => ({ message: 'Status inválido' })
  }),

  turno: z.enum(['MANHÃ', 'TARDE'], {
    errorMap: () => ({ message: 'Turno deve ser MANHÃ ou TARDE' })
  }),

  bolsaFamilia: z.enum(['SIM', 'NÃO'], {
    errorMap: () => ({ message: 'Bolsa Família deve ser SIM ou NÃO' })
  }),

  // Optional fields
  matricula: z.string().optional(),
  dataNascimento: isoDateSchema.optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),

  // Nested optional objects
  contatos: z.array(contactSchema).optional(),
  endereco: addressSchema.optional(),
  deficiencia: disabilitySchema.optional(),
  provaSaoPaulo: z.array(testResultSchema).optional(),

  // Audit fields (added by system)
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),

  // Soft delete fields (added by system)
  deleted: z.boolean().optional(),
  deletedAt: z.any().optional(),
  deletedBy: z.string().optional(),
  deleteReason: z.string().optional(),

  // Migration fields
  migratedAt: z.any().optional(),
  migratedFrom: z.string().optional(),
});

/**
 * Schema for creating a new student (without system fields)
 */
export const createStudentSchema = studentSchema.omit({
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  deleted: true,
  deletedAt: true,
  deletedBy: true,
  deleteReason: true,
  migratedAt: true,
  migratedFrom: true,
});

/**
 * Schema for updating a student (all fields optional except estudanteId)
 */
export const updateStudentSchema = studentSchema.partial().required({
  estudanteId: true,
});

/**
 * Schema for student search filters
 */
export const studentFilterSchema = z.object({
  turma: z.string().optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'TRANSFERIDO', 'DESLIGADO']).optional(),
  turno: z.enum(['MANHÃ', 'TARDE']).optional(),
  bolsaFamilia: z.enum(['SIM', 'NÃO']).optional(),
  estudanteComDeficiencia: z.boolean().optional(),
  includeDeleted: z.boolean().default(false),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Student = z.infer<typeof studentSchema>;
export type CreateStudent = z.infer<typeof createStudentSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
export type StudentFilter = z.infer<typeof studentFilterSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate student data
 */
export function validateStudent(data: unknown): Student {
  return studentSchema.parse(data);
}

/**
 * Validate student creation data
 */
export function validateCreateStudent(data: unknown): CreateStudent {
  return createStudentSchema.parse(data);
}

/**
 * Validate student update data
 */
export function validateUpdateStudent(data: unknown): UpdateStudent {
  return updateStudentSchema.parse(data);
}

/**
 * Validate student filters
 */
export function validateStudentFilters(data: unknown): StudentFilter {
  return studentFilterSchema.parse(data);
}

/**
 * Safe validation (returns result object instead of throwing)
 */
export function safeValidateStudent(data: unknown) {
  return studentSchema.safeParse(data);
}

/**
 * Safe validation for creation
 */
export function safeValidateCreateStudent(data: unknown) {
  return createStudentSchema.safeParse(data);
}

/**
 * Safe validation for update
 */
export function safeValidateUpdateStudent(data: unknown) {
  return updateStudentSchema.safeParse(data);
}

// ============================================================================
// FORM SCHEMAS (Relaxed validation for UI)
// ============================================================================

/**
 * Minimal schema for student form (allows partial data during editing)
 * Uses passthrough to allow all fields from the full student object
 */
export const studentFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  turma: z.string().min(1, "Turma é obrigatória"),
  turno: z.string().default("MANHÃ"),
  dataNascimento: z.string().optional(),
  matricula: z.string().optional(),
  status: z.string().default("ATIVO"),
  bolsaFamilia: z.string().default("NÃO"),
  email: z.string().optional(),
}).passthrough(); // Allow all other fields to pass through without validation

export type StudentFormData = z.infer<typeof studentFormSchema>;

/**
 * Complete form schema for StudentForm component
 * Includes all nested objects with proper validation
 */
export const studentCompleteFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  turma: z.string().min(1, "Turma é obrigatória"),
  turno: z.enum(["MANHÃ", "TARDE"]),
  dataNascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  matricula: z.string().optional(),
  status: z.enum(["ATIVO", "INATIVO"]),
  bolsaFamilia: z.enum(["SIM", "NÃO"]),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.object({
    cep: z.string().optional(),
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
  }).optional(),
  contatos: z.array(z.object({
    podeReceberMensagem: z.boolean().default(true),
    nome: z.string().min(1, "Nome do contato é obrigatório"),
    telefone: z.string().min(1, "Telefone é obrigatório"),
    parentesco: z.string().min(1, "Parentesco é obrigatório"),
  })).optional(),
  deficiencia: z.object({
    estudanteComDeficiencia: z.boolean(),
    tipoDeficiencia: z.array(z.string()).optional(),
    observacoes: z.string().optional(),
    possuiBarreiras: z.boolean().optional(),
    aee: z.string().optional(),
    instituicao: z.string().optional(),
    horarioAtendimento: z.string().optional(),
    atendimentoSaude: z.array(z.string()).optional(),
    possuiEstagiario: z.boolean().optional(),
    nomeEstagiario: z.string().optional(),
    justificativaEstagiario: z.string().optional(),
    ave: z.boolean().optional(),
    nomeAve: z.string().optional(),
    justificativaAve: z.array(z.string()).optional(),
  }).optional(),
});

export type StudentCompleteFormData = z.infer<typeof studentCompleteFormSchema>;