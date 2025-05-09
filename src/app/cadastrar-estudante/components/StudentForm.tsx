"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import Select, { MultiValue } from "react-select";
import { Trash2 } from "lucide-react";

import { formSchema } from "../constants/formSchema";
import {
    tipoDeficienciaOptions,
    atendimentoSaudeOptions,
    justificativaAveOptions,
} from "../constants/selectOptions";
import { customSelectStyles } from "../constants/selectStyles";
import { formatTelefone, cleanTelefone, formatCep, cleanCep, formatDataNascimento, cleanDataNascimento } from "../utils/formatters";
import { fetchAddressFromCep } from "../utils/api";
import { SelectOption, Estudante } from "../interfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select as ShadcnSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect } from "react";
import { toast } from "sonner";

interface StudentFormProps {
    form: UseFormReturn<z.infer<typeof formSchema>>;
    editingEstudante: Estudante | null;
    handleFormSubmit: (data: z.infer<typeof formSchema>) => void;
    handleCancel: () => void;
    cepChangedManually: boolean;
    setCepChangedManually: (value: boolean) => void;
}

export function StudentForm({
    form,
    editingEstudante,
    handleFormSubmit,
    handleCancel,
    cepChangedManually,
    setCepChangedManually,
}: StudentFormProps) {
    const cep = form.watch("endereco.cep");
    const possuiEstagiario = form.watch("deficiencia.possuiEstagiario");

    useEffect(() => {
        if (cep && cepChangedManually) {
            const cleanedCep = cleanCep(cep);
            if (cleanedCep.length === 8) {
                fetchAddressFromCep(cleanedCep).then((address) => {
                    if (address) {
                        form.setValue("endereco.rua", address.rua);
                        form.setValue("endereco.bairro", address.bairro);
                        form.setValue("endereco.cidade", address.cidade);
                        form.setValue("endereco.estado", address.estado);
                        form.setValue("endereco.complemento", address.complemento);
                    } else {
                        toast.error("CEP não encontrado ou inválido.");
                    }
                });
            }
        }
    }, [form, cep, cepChangedManually]);

    useEffect(() => {
        if (cep && cepChangedManually) {
            const cleanedCep = cleanCep(cep);
            if (cleanedCep.length > 0 && cleanedCep.length < 8) {
                form.setValue("endereco.rua", "");
                form.setValue("endereco.numero", "");
                form.setValue("endereco.bairro", "");
                form.setValue("endereco.cidade", "");
                form.setValue("endereco.estado", "");
                form.setValue("endereco.complemento", "");
            }
        }
    }, [form, cep, cepChangedManually]);

    useEffect(() => {
        if (!possuiEstagiario) {
            form.setValue("deficiencia.nomeEstagiario", "NÃO NECESSITA");
            form.setValue("deficiencia.justificativaEstagiario", "SEM BARREIRAS");
        }
    }, [form, possuiEstagiario]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">
                <p className="text-sm text-gray-500" id="form-desc">
                    Campos com <span className="text-red-500">*</span> são obrigatórios.
                </p>
                <Tabs defaultValue="pessoais" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="pessoais">Pessoais</TabsTrigger>
                        <TabsTrigger value="endereco">Endereço</TabsTrigger>
                        <TabsTrigger value="contatos">Contatos</TabsTrigger>
                        <TabsTrigger value="deficiencia">Deficiência</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pessoais" className="mt-4">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nome"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor="nome">
                                            Nome <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                id="nome"
                                                placeholder="Digite o nome"
                                                {...field}
                                                autoComplete="off"
                                                aria-describedby="form-desc"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <FormField
                                    control={form.control}
                                    name="turma"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="turma">
                                                Turma <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="turma"
                                                    placeholder="Digite a turma"
                                                    {...field}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bolsaFamilia"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="bolsaFamilia">
                                                Bolsa Família <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <ShadcnSelect
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <SelectTrigger id="bolsaFamilia">
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="SIM">SIM</SelectItem>
                                                        <SelectItem value="NÃO">NÃO</SelectItem>
                                                    </SelectContent>
                                                </ShadcnSelect>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="status">
                                                Status <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <ShadcnSelect
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <SelectTrigger id="status">
                                                        <SelectValue placeholder="Selecione o Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ATIVO">ATIVO</SelectItem>
                                                        <SelectItem value="INATIVO">INATIVO</SelectItem>
                                                    </SelectContent>
                                                </ShadcnSelect>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="dataNascimento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="dataNascimento">
                                                Data de Nascimento
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="dataNascimento"
                                                    placeholder="dd/mm/aaaa"
                                                    value={field.value ? formatDataNascimento(field.value) : ""}
                                                    onChange={(e) => {
                                                        const inputValue = e.target.value;
                                                        const cleanedValue = cleanDataNascimento(inputValue).slice(0, 8);
                                                        field.onChange(cleanedValue);
                                                    }}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="turno"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="turno">
                                                Turno <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <ShadcnSelect
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <SelectTrigger id="turno">
                                                        <SelectValue placeholder="Selecione o Turno" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="MANHÃ">MANHÃ</SelectItem>
                                                        <SelectItem value="TARDE">TARDE</SelectItem>
                                                    </SelectContent>
                                                </ShadcnSelect>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor="email">E-mail</FormLabel>
                                        <FormControl>
                                            <Input
                                                id="email"
                                                placeholder="Digite o e-mail"
                                                {...field}
                                                autoComplete="off"
                                                aria-describedby="form-desc"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="endereco" className="mt-4">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold mb-4">Endereço</h3>
                            <FormField
                                control={form.control}
                                name="endereco.cep"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor="cep">CEP (xxxxx-xxx)</FormLabel>
                                        <FormControl>
                                            <Input
                                                id="cep"
                                                placeholder="CEP (xxxxx-xxx)"
                                                value={field.value ? formatCep(field.value) : ""}
                                                onChange={(e) => {
                                                    const inputValue = e.target.value;
                                                    const cleanedValue = cleanCep(inputValue).slice(0, 8);
                                                    field.onChange(cleanedValue);
                                                    setCepChangedManually(true);
                                                }}
                                                autoComplete="off"
                                                aria-describedby="form-desc"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <FormField
                                    control={form.control}
                                    name="endereco.rua"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-3">
                                            <FormLabel htmlFor="rua">Rua</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="rua"
                                                    placeholder="Rua"
                                                    {...field}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endereco.numero"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-1">
                                            <FormLabel htmlFor="numero">Número</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="numero"
                                                    placeholder="Número"
                                                    {...field}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="endereco.complemento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="complemento">Complemento</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="complemento"
                                                    placeholder="Complemento"
                                                    {...field}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endereco.bairro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="bairro">Bairro</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="bairro"
                                                    placeholder="Bairro"
                                                    {...field}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="endereco.cidade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="cidade">Cidade</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="cidade"
                                                    placeholder="Cidade"
                                                    {...field}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endereco.estado"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor="estado">Estado</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="estado"
                                                    placeholder="Estado"
                                                    {...field}
                                                    autoComplete="off"
                                                    aria-describedby="form-desc"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="contatos" className="mt-4">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold mb-4">Contatos</h3>
                            {form.watch("contatos")?.map((_, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 mb-2 p-2 danego border rounded"
                                >
                                    <div className="flex-1 space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`contatos.${index}.nome`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel htmlFor={`contato-nome-${index}`}>
                                                        Nome do contato
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            id={`contato-nome-${index}`}
                                                            placeholder="Nome do contato"
                                                            {...field}
                                                            autoComplete="off"
                                                            aria-describedby="form-desc"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`contatos.${index}.telefone`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel htmlFor={`contato-telefone-${index}`}>
                                                        Telefone
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            id={`contato-telefone-${index}`}
                                                            placeholder="(xx) xxxxx-xxxx"
                                                            value={field.value ? formatTelefone(field.value) : ""}
                                                            onChange={(e) => {
                                                                const inputValue = e.target.value;
                                                                const cleanedValue = cleanTelefone(inputValue).slice(0, 11);
                                                                field.onChange(cleanedValue);
                                                            }}
                                                            autoComplete="off"
                                                            aria-describedby="form-desc"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Trash2
                                        className="h-5 w-5 text-red-500 cursor-pointer"
                                        onClick={() => {
                                            const newContatos = form
                                                .getValues("contatos")
                                                ?.filter((_, i) => i !== index);
                                            form.setValue("contatos", newContatos || []);
                                        }}
                                        aria-label="Remover contato"
                                    />
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    const currentContatos = form.getValues("contatos") || [];
                                    form.setValue("contatos", [
                                        ...currentContatos,
                                        { nome: "", telefone: "" },
                                    ]);
                                }}
                                aria-label="Adicionar novo contato"
                            >
                                + Adicionar Contato
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="deficiencia" className="mt-4">
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold mb-4">Deficiência</h3>
                            <FormField
                                control={form.control}
                                name="deficiencia.estudanteComDeficiencia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel
                                            className="flex items-center space-x-2"
                                            htmlFor="estudanteComDeficiencia"
                                        >
                                            <FormControl>
                                                <Checkbox
                                                    id="estudanteComDeficiencia"
                                                    checked={field.value}
                                                    onCheckedChange={(checked) => {
                                                        field.onChange(!!checked);
                                                        if (!checked) {
                                                            form.setValue("deficiencia", {
                                                                estudanteComDeficiencia: false,
                                                                tipoDeficiencia: [],
                                                                possuiBarreiras: true,
                                                                aee: undefined,
                                                                instituicao: undefined,
                                                                horarioAtendimento: "NENHUM",
                                                                atendimentoSaude: [],
                                                                possuiEstagiario: false,
                                                                nomeEstagiario: "NÃO NECESSITA",
                                                                justificativaEstagiario: "SEM BARREIRAS",
                                                                ave: false,
                                                                nomeAve: "",
                                                                justificativaAve: [],
                                                            });
                                                        }
                                                    }}
                                                    aria-label="Indica se o estudante possui deficiência"
                                                />
                                            </FormControl>
                                            <span>Estudante com Deficiência</span>
                                        </FormLabel>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {form.watch("deficiencia.estudanteComDeficiencia") && (
                                <div className="space-y-6 p-4 border rounded bg-gray-50 transition-all duration-300">
                                    <p className="text-sm text-gray-500" id="deficiencia-desc">
                                        Campos com <span className="text-red-500">*</span> são
                                        obrigatórios.
                                    </p>

                                    <div className="border-b pb-2">
                                        <h4 className="text-lg font-semibold mb-4">
                                            Informações Gerais
                                        </h4>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.tipoDeficiencia"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="tipoDeficiencia">
                                                            Tipo de Deficiência{" "}
                                                            <span className="text-red-500">*</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Select
                                                                isMulti
                                                                options={tipoDeficienciaOptions}
                                                                value={tipoDeficienciaOptions.filter(
                                                                    (option) =>
                                                                        field.value?.includes(option.value)
                                                                )}
                                                                onChange={(
                                                                    selectedOptions: MultiValue<SelectOption>
                                                                ) => {
                                                                    const newTipos = selectedOptions.map(
                                                                        (option) => option.value
                                                                    );
                                                                    field.onChange(newTipos);
                                                                }}
                                                                styles={customSelectStyles}
                                                                placeholder="Selecione os tipos"
                                                                inputId="tipoDeficiencia"
                                                                aria-describedby="deficiencia-desc"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.possuiBarreiras"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel
                                                            className="flex items-center space-x-2"
                                                            htmlFor="possuiBarreiras"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    id="possuiBarreiras"
                                                                    checked={field.value}
                                                                    onCheckedChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                            <span>Possui Barreiras</span>
                                                        </FormLabel>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-b pb-2">
                                        <h4 className="text-lg font-semibold mb-4">
                                            Atendimento Educacional
                                        </h4>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.aee"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="aee">A. E. E.</FormLabel>
                                                        <FormControl>
                                                            <ShadcnSelect
                                                                onValueChange={field.onChange}
                                                                value={field.value}
                                                            >
                                                                <SelectTrigger id="aee">
                                                                    <SelectValue placeholder="Selecione" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="PAEE">
                                                                        PAEE
                                                                    </SelectItem>
                                                                    <SelectItem value="PAAI">
                                                                        PAAI
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </ShadcnSelect>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.instituicao"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="instituicao">
                                                            Instituição
                                                        </FormLabel>
                                                        <FormControl>
                                                            <ShadcnSelect
                                                                onValueChange={field.onChange}
                                                                value={field.value}
                                                            >
                                                                <SelectTrigger id="instituicao">
                                                                    <SelectValue placeholder="Selecione" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="INSTITUTO JÔ CLEMENTE">
                                                                        INSTITUTO JÔ CLEMENTE
                                                                    </SelectItem>
                                                                    <SelectItem value="CLIFAK">
                                                                        CLIFAK
                                                                    </SelectItem>
                                                                    <SelectItem value="CEJOLE">
                                                                        CEJOLE
                                                                    </SelectItem>
                                                                    <SelectItem value="CCA">CCA</SelectItem>
                                                                </SelectContent>
                                                            </ShadcnSelect>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.horarioAtendimento"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="horarioAtendimento">
                                                            Horário de Atendimento
                                                        </FormLabel>
                                                        <FormControl>
                                                            <ShadcnSelect
                                                                onValueChange={field.onChange}
                                                                value={field.value}
                                                            >
                                                                <SelectTrigger id="horarioAtendimento">
                                                                    <SelectValue placeholder="Selecione" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="NENHUM">
                                                                        NENHUM
                                                                    </SelectItem>
                                                                    <SelectItem value="NO TURNO">
                                                                        NO TURNO
                                                                    </SelectItem>
                                                                    <SelectItem value="CONTRATURNO">
                                                                        CONTRATURNO
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </ShadcnSelect>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-b pb-2">
                                        <h4 className="text-lg font-semibold mb-4">
                                            Apoio e Estágio
                                        </h4>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.atendimentoSaude"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel htmlFor="atendimentoSaude">
                                                            Atendimento de Saúde
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Select
                                                                isMulti
                                                                options={atendimentoSaudeOptions}
                                                                value={atendimentoSaudeOptions.filter(
                                                                    (option) =>
                                                                        field.value?.includes(option.value)
                                                                )}
                                                                onChange={(
                                                                    selectedOptions: MultiValue<SelectOption>
                                                                ) => {
                                                                    const newTipos = selectedOptions.map(
                                                                        (option) => option.value
                                                                    );
                                                                    field.onChange(newTipos);
                                                                }}
                                                                styles={customSelectStyles}
                                                                placeholder="Selecione os atendimentos"
                                                                inputId="atendimentoSaude"
                                                                aria-describedby="deficiencia-desc"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.possuiEstagiario"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel
                                                            className="flex items-center space-x-2"
                                                            htmlFor="possuiEstagiario"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    id="possuiEstagiario"
                                                                    checked={field.value}
                                                                    onCheckedChange={(checked) => {
                                                                        field.onChange(!!checked);
                                                                        if (!checked) {
                                                                            form.setValue(
                                                                                "deficiencia.nomeEstagiario",
                                                                                "NÃO NECESSITA"
                                                                            );
                                                                            form.setValue(
                                                                                "deficiencia.justificativaEstagiario",
                                                                                "SEM BARREIRAS"
                                                                            );
                                                                        } else {
                                                                            form.setValue(
                                                                                "deficiencia.nomeEstagiario",
                                                                                ""
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <span>Possui Estagiário(a)</span>
                                                        </FormLabel>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            {form.watch("deficiencia.possuiEstagiario") && (
                                                <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded transition-all duration-300">
                                                    <FormField
                                                        control={form.control}
                                                        name="deficiencia.nomeEstagiario"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel htmlFor="nomeEstagiario">
                                                                    Nome do(a) Estagiário(a)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        id="nomeEstagiario"
                                                                        placeholder="Nome do(a) Estagiário(a)"
                                                                        {...field}
                                                                        autoComplete="off"
                                                                        aria-describedby="deficiencia-desc"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="deficiencia.justificativaEstagiario"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel htmlFor="justificativaEstagiario">
                                                                    Justificativa
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <ShadcnSelect
                                                                        onValueChange={field.onChange}
                                                                        value={field.value}
                                                                    >
                                                                        <SelectTrigger id="justificativaEstagiario">
                                                                            <SelectValue placeholder="Selecione a Justificativa" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE">
                                                                                MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE
                                                                            </SelectItem>
                                                                            <SelectItem value="SEM BARREIRAS">
                                                                                SEM BARREIRAS
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </ShadcnSelect>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold mb-4">AVE</h4>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="deficiencia.ave"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel
                                                            className="flex items-center space-x-2"
                                                            htmlFor="ave"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    id="ave"
                                                                    checked={field.value}
                                                                    onCheckedChange={(checked) => {
                                                                        field.onChange(!!checked);
                                                                        if (!checked) {
                                                                            form.setValue("deficiencia.nomeAve", "");
                                                                            form.setValue("deficiencia.justificativaAve", []);
                                                                        }
                                                                    }}
                                                                    aria-label="Indica se o estudante possui AVE"
                                                                />
                                                            </FormControl>
                                                            <span>Possui AVE</span>
                                                        </FormLabel>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            {form.watch("deficiencia.ave") && (
                                                <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded transition-all duration-300">
                                                    <FormField
                                                        control={form.control}
                                                        name="deficiencia.nomeAve"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel htmlFor="nomeAve">
                                                                    Nome do(a) AVE
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        id="nomeAve"
                                                                        placeholder="Nome do(a) AVE"
                                                                        {...field}
                                                                        autoComplete="off"
                                                                        aria-describedby="deficiencia-desc"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="deficiencia.justificativaAve"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel htmlFor="justificativaAve">
                                                                    Justificativa
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Select
                                                                        isMulti
                                                                        options={justificativaAveOptions}
                                                                        value={justificativaAveOptions.filter(
                                                                            (option) =>
                                                                                field.value?.includes(
                                                                                    option.value
                                                                                )
                                                                        )}
                                                                        onChange={(
                                                                            selectedOptions: MultiValue<SelectOption>
                                                                        ) => {
                                                                            const newJustificativas =
                                                                                selectedOptions.map(
                                                                                    (option) => option.value
                                                                                );
                                                                            field.onChange(newJustificativas);
                                                                        }}
                                                                        styles={customSelectStyles}
                                                                        placeholder="Selecione as justificativas"
                                                                        inputId="justificativaAve"
                                                                        aria-describedby="deficiencia-desc"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
                </div>
            </form>
        </Form>
    );
}