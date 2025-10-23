/**
 * Schemas Zod para Estudantes
 *
 * Define validações para CRUD de estudantes
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS AUXILIARES
// ============================================================================

const contatoSchema = z.object({
  id: z.string().optional(), // ID do contato (UUID do Supabase)
  nome: z.string().min(1, 'Nome do contato é obrigatório').max(100),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos (apenas números)'),
  telefoneNumerico: z.string().optional(), // Telefone sem formatação
  parentesco: z.string().optional(),
  podeReceberMensagem: z.boolean().optional(), // ✅ Campo PADRÃO do formulário
  whatsapp: z
    .object({
      verified: z.boolean(),
      exists: z.boolean(),
      verifiedAt: z.string().nullable(),
      name: z.string().nullable(),
      number: z.string().nullable(),
    })
    .optional(),
  whatsappData: z.any().optional(), // WhatsApp data JSONB
  whatsapp_data: z.any().optional(), // WhatsApp data JSONB (snake_case)
});

const enderecoSchema = z.object({
  rua: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  complemento: z.string().optional(),
});

const deficienciaSchema = z.object({
  estudanteComDeficiencia: z.boolean(),
  tipoDeficiencia: z.union([z.array(z.string()), z.string()]).optional(),
  possuiBarreiras: z.boolean().optional(),
  aee: z.enum(['PAEE', 'PAAI']).optional(),
  instituicao: z
    .enum(['INSTITUTO JÔ CLEMENTE', 'CLIFAK', 'CEJOLE', 'CCA', 'NENHUM'])
    .optional(),
  horarioAtendimento: z.enum(['NENHUM', 'NO TURNO', 'CONTRATURNO']).optional(),
  atendimentoSaude: z.array(z.string()).optional(),
  possuiEstagiario: z.boolean().optional(),
  nomeEstagiario: z.string().optional(),
  justificativaEstagiario: z
    .enum(['MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE', 'SEM BARREIRAS'])
    .optional(),
  ave: z.boolean().optional(),
  nomeAve: z.string().optional(),
  justificativaAve: z.array(z.string()).optional(),
  observacoes: z.string().optional(),
});

const provaSaoPauloSchema = z.object({
  matricula: z.string().optional(),
  edicao: z.string(),
  mediaAluno: z.number(),
  nivelProficiencia: z.string(),
  anoEscolar: z.string(),
  disciplina: z.string().optional(),
  dataImportacao: z.string(),
});

// ============================================================================
// SCHEMA PRINCIPAL DE ESTUDANTE
// ============================================================================

/**
 * Schema para criar novo estudante (POST)
 */
export const createStudentSchema = z.object({
  nome: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  turma: z.string().min(1, 'Turma é obrigatória'),
  turno: z.enum(['MANHÃ', 'TARDE'], {
    errorMap: () => ({ message: 'Turno deve ser MANHÃ ou TARDE' }),
  }),
  status: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
  bolsaFamilia: z.enum(['SIM', 'NÃO']).default('NÃO'),
  matricula: z.string().optional(),
  dataNascimento: z
    .string()
    .regex(/^\d{8}$/, 'Data de nascimento deve estar no formato DDMMYYYY')
    .optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contatos: z.array(contatoSchema).optional(),
  endereco: enderecoSchema.optional(),
  deficiencia: deficienciaSchema.optional(),
  provaSaoPaulo: z.array(provaSaoPauloSchema).optional(),
});

/**
 * Schema para atualizar estudante (PUT/PATCH)
 * Todos os campos são opcionais
 */
export const updateStudentSchema = createStudentSchema.partial();

/**
 * Schema para query params de listagem (GET)
 * OTIMIZADO: Inclui parâmetro 'detail' para SELECT estratificado
 */
export const studentQuerySchema = z.object({
  turma: z.string().optional(),
  turno: z.enum(['MANHÃ', 'TARDE']).optional(),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
  bolsaFamilia: z.enum(['SIM', 'NÃO']).optional(),
  estudanteComDeficiencia: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().min(1).max(10000).default(50)),
  search: z.string().optional(), // Busca por nome
  // ✅ OTIMIZAÇÃO: Nível de detalhamento para reduzir over-fetching
  detail: z.enum(['minimal', 'summary', 'detailed', 'full']).default('minimal'),
  // ✅ OTIMIZAÇÃO: Cursor para paginação eficiente (Fase 2)
  cursor: z.string().optional(),
});

/**
 * Schema para parâmetro de ID (UUID)
 */
export const studentIdSchema = z.object({
  id: z.string().uuid('ID do estudante deve ser um UUID válido'),
});

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentQueryParams = z.infer<typeof studentQuerySchema>;
export type StudentIdParams = z.infer<typeof studentIdSchema>;
