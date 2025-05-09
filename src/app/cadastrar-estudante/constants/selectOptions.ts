import { SelectOption } from "../interfaces";

export const tipoDeficienciaOptions: SelectOption[] = [
    { value: "DI", label: "DI" },
    { value: "DM", label: "DM" },
    { value: "TEA", label: "TEA" },
    { value: "DF", label: "DF" },
    { value: "SÍNDROME DE DOWN", label: "SÍNDROME DE DOWN" },
];

export const atendimentoSaudeOptions: SelectOption[] = [
    { value: "NÃO FAZ", label: "NÃO FAZ" },
    { value: "FONOAUDIOLOGIA", label: "FONOAUDIOLOGIA" },
    { value: "NEUROLOGIA", label: "NEUROLOGIA" },
    { value: "TERAPIA OCUPACIONAL", label: "TERAPIA OCUPACIONAL" },
    { value: "ORTOPEDIA", label: "ORTOPEDIA" },
    { value: "PSICOLOGIA", label: "PSICOLOGIA" },
    { value: "FISIOTERAPIA", label: "FISIOTERAPIA" },
];

export const justificativaAveOptions: SelectOption[] = [
    { value: "HIGIENE", label: "HIGIENE" },
    { value: "LOCOMOÇÃO", label: "LOCOMOÇÃO" },
    { value: "ALIMENTAÇÃO", label: "ALIMENTAÇÃO" },
    { value: "TROCA DE FRALDA", label: "TROCA DE FRALDA" },
    {
        value: "SIGNIFICATIVAS DIFICULDADES COGNITIVAS E FUNCIONAIS",
        label: "SIGNIFICATIVAS DIFICULDADES COGNITIVAS E FUNCIONAIS",
    },
];