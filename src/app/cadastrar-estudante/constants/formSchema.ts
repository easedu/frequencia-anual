import * as z from "zod";
import { validateTelefone, validateNomeContato, validateEmail, validateCep, validateDataNascimento } from "../utils/validators";

export const formSchema = z.object({
    nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100),
    turma: z.string().min(1, "A turma é obrigatória"),
    bolsaFamilia: z.enum(["SIM", "NÃO"]),
    status: z.enum(["ATIVO", "INATIVO"]),
    dataNascimento: z.string().optional().refine(
        (val) => !val || validateDataNascimento(val),
        "Data de nascimento inválida ou no futuro"
    ),
    turno: z.enum(["MANHÃ", "TARDE"]),
    email: z.string().optional().refine((val) => !val || validateEmail(val), "E-mail inválido"),
    endereco: z
        .object({
            cep: z.string().optional(),
            rua: z.string().optional(),
            numero: z.string().optional(),
            bairro: z.string().optional(),
            cidade: z.string().optional(),
            estado: z.string().optional(),
            complemento: z.string().optional(),
        })
        .optional()
        .refine(
            (data) =>
                !data?.cep ||
                (validateCep(data.cep) &&
                    !!data.rua &&
                    !!data.numero &&
                    !!data.bairro &&
                    !!data.cidade &&
                    !!data.estado),
            "Todos os campos de endereço são obrigatórios quando o CEP está preenchido"
        ),
    contatos: z
        .array(
            z.object({
                nome: z.string().optional(),
                telefone: z.string().optional(),
            })
        )
        .optional()
        .refine(
            (data) =>
                !data ||
                data.every(
                    (contato) =>
                        (!contato.nome && !contato.telefone) ||
                        (contato.nome &&
                            contato.telefone &&
                            validateNomeContato(contato.nome) &&
                            validateTelefone(contato.telefone))
                ),
            "Contatos devem ter nome e telefone válidos ou estar vazios"
        ),
    deficiencia: z
        .object({
            estudanteComDeficiencia: z.boolean(),
            tipoDeficiencia: z.array(z.string()).optional(),
            possuiBarreiras: z.boolean().optional(),
            aee: z.enum(["PAEE", "PAAI"]).optional(),
            instituicao: z.enum(["INSTITUTO JÔ CLEMENTE", "CLIFAK", "CEJOLE", "CCA", "NENHUM"]).optional(),
            horarioAtendimento: z.enum(["NENHUM", "NO TURNO", "CONTRATURNO"]).optional(),
            atendimentoSaude: z.array(z.string()).optional(),
            possuiEstagiario: z.boolean().optional(),
            nomeEstagiario: z.string().optional(),
            justificativaEstagiario: z
                .enum(["MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE", "SEM BARREIRAS"])
                .optional(),
            ave: z.boolean().optional(),
            nomeAve: z.string().optional(),
            justificativaAve: z.array(z.string()).optional(),
        })
        .optional()
        .refine(
            (data) =>
                !data?.estudanteComDeficiencia ||
                (data.tipoDeficiencia && data.tipoDeficiencia.length > 0),
            "Selecione pelo menos um tipo de deficiência quando estudante com deficiência está marcado"
        )
        .refine(
            (data) =>
                !data?.possuiEstagiario ||
                (data.nomeEstagiario && data.nomeEstagiario.trim() !== ""),
            "O nome do estagiário é obrigatório quando possui estagiário"
        )
        .refine(
            (data) =>
                !data?.ave ||
                (data.nomeAve && data.nomeAve.trim().length >= 2),
            "O nome do(a) AVE é obrigatório e deve ter pelo menos 2 caracteres quando possui AVE"
        ),
});