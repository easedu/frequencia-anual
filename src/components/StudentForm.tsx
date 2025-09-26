import React, { useEffect, useCallback, memo, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import Select, { MultiValue } from 'react-select';
import { Trash2, Plus, User, Home, Phone, Heart, Save, X, MessageCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select as ShadcnSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPhoneNumber, formatCep, formatDate } from '@/utils/formatters';
import { Estudante } from '@/types';
import { toast } from 'sonner';
import { WhatsAppVerificationService } from '@/services/whatsappVerificationService';
import { Badge } from '@/components/ui/badge';

// Types
interface SelectOption {
    value: string;
    label: string;
}

// Form schema inline
const formSchema = z.object({
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
        nome: z.string().default(""),
        telefone: z.string().default(""),
        parentesco: z.string().default(""),
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

// Helper functions
const formatTelefone = (value: string) => formatPhoneNumber(value);
const cleanTelefone = (value: string) => value.replace(/\D/g, '');
const formatCepLocal = (value: string) => formatCep(value);
const cleanCep = (value: string) => value.replace(/\D/g, '');
const formatDataNascimento = (value: string) => {
    if (!value) return '';
    if (value.length <= 2) return value;
    if (value.length <= 4) return value.slice(0, 2) + '/' + value.slice(2);
    return value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4);
};
const cleanDataNascimento = (value: string) => value.replace(/\D/g, '');

// Options
const tipoDeficienciaOptions = [
    { value: 'fisica', label: 'Deficiência Física' },
    { value: 'visual', label: 'Deficiência Visual' },
    { value: 'auditiva', label: 'Deficiência Auditiva' },
    { value: 'intelectual', label: 'Deficiência Intelectual' },
    { value: 'multipla', label: 'Deficiência Múltipla' },
];

const atendimentoSaudeOptions = [
    { value: 'publico', label: 'Público' },
    { value: 'privado', label: 'Privado' },
    { value: 'convenio', label: 'Convênio' },
];

const justificativaAveOptions = [
    { value: 'laudo', label: 'Laudo Médico' },
    { value: 'observacao', label: 'Observação Pedagógica' },
    { value: 'outros', label: 'Outros' },
];

const customSelectStyles = {
    control: (provided: any) => ({
        ...provided,
        minHeight: '40px',
        borderColor: '#e2e8f0',
        boxShadow: 'none',
        '&:hover': {
            borderColor: '#cbd5e0',
        },
    }),
    option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f1f5f9' : 'white',
        color: state.isSelected ? 'white' : '#374151',
    }),
};

// API function stub
const fetchAddressFromCep = async (cep: string) => {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
};

interface StudentFormProps {
    form: UseFormReturn<z.infer<typeof formSchema>>;
    editingEstudante: Estudante | null;
    handleFormSubmit: (data: z.infer<typeof formSchema>) => void;
    handleCancel: () => void;
    cepChangedManually: boolean;
    setCepChangedManually: (value: boolean) => void;
    isEditing: boolean;
    isSaving?: boolean;
}

// Componente memoizado para o cabeçalho dos campos
const ModernFormField = memo(({
    children,
    title,
    description,
    icon: Icon,
    required = false
}: {
    children: React.ReactNode;
    title: string;
    description?: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    required?: boolean;
}) => (
    <div className="space-y-4">
        <div className="flex items-center space-x-3">
            {Icon && (
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
            )}
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                    {title}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </h3>
                {description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {description}
                    </p>
                )}
            </div>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/50">
            {children}
        </div>
    </div>
));

ModernFormField.displayName = 'ModernFormField';

// Componente memoizado para os campos de contato
const ContactField = memo(({
    index,
    form,
    onRemove,
    canRemove
}: {
    index: number;
    form: UseFormReturn<z.infer<typeof formSchema>>;
    onRemove: () => void;
    canRemove: boolean;
}) => {
    const [whatsappStatus, setWhatsappStatus] = useState<{
        isVerifying: boolean;
        hasWhatsApp?: boolean;
        whatsappName?: string;
        verified: boolean;
    }>({
        isVerifying: false,
        verified: false
    });

    // Função para verificar WhatsApp quando telefone for alterado
    const verifyWhatsApp = useCallback(async (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');

        // Só verificar se o número tem pelo menos 10 dígitos
        if (cleanPhone.length < 10) {
            setWhatsappStatus({ isVerifying: false, verified: false });
            return;
        }

        // Verificar se é elegível para WhatsApp
        if (!WhatsAppVerificationService.isWhatsAppEligible(cleanPhone)) {
            setWhatsappStatus({ isVerifying: false, verified: false });
            return;
        }

        setWhatsappStatus(prev => ({ ...prev, isVerifying: true }));

        try {
            const result = await WhatsAppVerificationService.checkAndSaveWhatsAppStatus(
                cleanPhone,
                undefined, // studentId será definido ao salvar o estudante
                form.getValues(`contatos.${index}.nome`)
            );

            setWhatsappStatus({
                isVerifying: false,
                hasWhatsApp: result.hasWhatsApp,
                whatsappName: result.whatsappName,
                verified: true
            });

            if (result.success) {
                if (result.hasWhatsApp) {
                    toast.success(`WhatsApp encontrado! ${result.whatsappName ? `(${result.whatsappName})` : ''}`);
                } else {
                    toast.info('Número verificado - WhatsApp não encontrado');
                }
            }
        } catch (error) {
            console.error('Erro ao verificar WhatsApp:', error);
            setWhatsappStatus({
                isVerifying: false,
                verified: false
            });
            toast.error('Erro ao verificar WhatsApp');
        }
    }, [form, index]);

    // Debounce para verificação automática
    const [phoneDebounceTimer, setPhoneDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    const handlePhoneChange = useCallback((inputValue: string) => {
        const cleanedValue = cleanTelefone(inputValue).slice(0, 11);

        // Limpar timer anterior
        if (phoneDebounceTimer) {
            clearTimeout(phoneDebounceTimer);
        }

        // Definir novo timer para verificação automática
        const newTimer = setTimeout(() => {
            if (cleanedValue.length >= 10) {
                verifyWhatsApp(cleanedValue);
            }
        }, 2000); // 2 segundos após parar de digitar

        setPhoneDebounceTimer(newTimer);

        return cleanedValue;
    }, [phoneDebounceTimer, verifyWhatsApp]);

    // Cleanup do timer
    useEffect(() => {
        return () => {
            if (phoneDebounceTimer) {
                clearTimeout(phoneDebounceTimer);
            }
        };
    }, [phoneDebounceTimer]);

    return (
    <div className="bg-white/60 dark:bg-slate-700/60 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-600/50">
        <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Contato {index + 1}
            </h4>
            {canRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl p-2"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name={`contatos.${index}.nome`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                            Nome do Contato
                        </FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="Nome completo"
                                className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                        <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            Telefone
                            {whatsappStatus.isVerifying && (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            )}
                            {whatsappStatus.verified && (
                                <Badge
                                    variant={whatsappStatus.hasWhatsApp ? "default" : "secondary"}
                                    className={`text-xs ${whatsappStatus.hasWhatsApp ? "bg-green-600" : "bg-gray-500"}`}
                                >
                                    {whatsappStatus.hasWhatsApp ? (
                                        <><CheckCircle className="w-3 h-3 mr-1" /> WhatsApp</>
                                    ) : (
                                        <><XCircle className="w-3 h-3 mr-1" /> Sem WhatsApp</>
                                    )}
                                </Badge>
                            )}
                        </FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input
                                    placeholder="(11) 99999-9999"
                                    value={field.value ? formatTelefone(field.value) : ""}
                                    onChange={(e) => {
                                        const inputValue = e.target.value;
                                        const cleanedValue = handlePhoneChange(inputValue);
                                        field.onChange(cleanedValue || "");
                                    }}
                                    className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 pr-10"
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {whatsappStatus.isVerifying ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    ) : whatsappStatus.verified ? (
                                        whatsappStatus.hasWhatsApp ? (
                                            <MessageCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-gray-400" />
                                        )
                                    ) : null}
                                </div>
                            </div>
                        </FormControl>
                        <FormMessage />
                        {whatsappStatus.whatsappName && (
                            <p className="text-xs text-green-600 mt-1">
                                Nome no WhatsApp: {whatsappStatus.whatsappName}
                            </p>
                        )}
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name={`contatos.${index}.parentesco`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                            Parentesco
                        </FormLabel>
                        <FormControl>
                            <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="Ex: Mãe, Pai, Responsável"
                                className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    </div>
    );
});

ContactField.displayName = 'ContactField';

export const StudentForm = memo(function StudentForm({
    form,
    handleFormSubmit,
    handleCancel,
    cepChangedManually,
    setCepChangedManually,
    isEditing,
    isSaving = false,
}: StudentFormProps) {
    const cep = form.watch("endereco.cep");
    const possuiEstagiario = form.watch("deficiencia.possuiEstagiario");
    const contatosWatched = form.watch("contatos");
    
    // Memoizar contatos para evitar re-criações desnecessárias
    const contatos = useMemo(() => contatosWatched || [], [contatosWatched]);

    // Memoizar o handler de busca de CEP
    const handleCepChange = useCallback((cepValue: string) => {
        setCepChangedManually(true);
        
        const cleanedCep = cleanCep(cepValue);
        if (cleanedCep.length === 8) {
            fetchAddressFromCep(cleanedCep).then((address) => {
                if (address) {
                    form.setValue("endereco.rua", address.logradouro);
                    form.setValue("endereco.bairro", address.bairro);
                    form.setValue("endereco.cidade", address.localidade);
                    form.setValue("endereco.estado", address.estado);
                    toast.success("Endereço preenchido automaticamente!");
                } else {
                    toast.error("CEP não encontrado ou inválido.");
                }
            });
        } else if (cleanedCep.length > 0 && cleanedCep.length < 8) {
            // Limpar campos quando CEP está incompleto
            form.setValue("endereco.rua", "");
            form.setValue("endereco.numero", "");
            form.setValue("endereco.bairro", "");
            form.setValue("endereco.cidade", "");
            form.setValue("endereco.estado", "");
            form.setValue("endereco.complemento", "");
        }
    }, [form, setCepChangedManually]);

    // Effect para buscar CEP
    useEffect(() => {
        if (cep && cepChangedManually) {
            handleCepChange(cep);
        }
    }, [cep, cepChangedManually, handleCepChange]);

    // Effect para gerenciar campos de estagiário
    useEffect(() => {
        if (!possuiEstagiario) {
            form.setValue("deficiencia.nomeEstagiario", "NÃO NECESSITA");
            form.setValue("deficiencia.justificativaEstagiario", "SEM BARREIRAS");
        }
    }, [possuiEstagiario, form]);

    // Memoizar handlers de contato
    const addContact = useCallback(() => {
        const currentContatos = form.getValues("contatos") || [];
        form.setValue("contatos", [...currentContatos, { nome: "", telefone: "", parentesco: "" }]);
    }, [form]);

    const removeContact = useCallback((index: number) => {
        const currentContatos = form.getValues("contatos") || [];
        const newContatos = currentContatos.filter((_, i) => i !== index);
        form.setValue("contatos", newContatos);
    }, [form]);

    const onError = (errors: any) => {
        console.error('❌ Form validation errors:', errors);
        toast.error("Por favor, corrija os erros no formulário antes de continuar");
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit, onError)} className="space-y-8">
                <div className="text-center bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        Campos marcados com <span className="text-red-500 font-bold">*</span> são obrigatórios
                    </p>
                </div>

                <Tabs defaultValue="pessoais" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-1 border border-slate-200/50 dark:border-slate-600/50">
                        <TabsTrigger value="pessoais" className="rounded-xl font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200">
                            <User className="w-4 h-4 mr-2" />
                            Pessoais
                        </TabsTrigger>
                        <TabsTrigger value="endereco" className="rounded-xl font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200">
                            <Home className="w-4 h-4 mr-2" />
                            Endereço
                        </TabsTrigger>
                        <TabsTrigger value="contatos" className="rounded-xl font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200">
                            <Phone className="w-4 h-4 mr-2" />
                            Contatos
                        </TabsTrigger>
                        <TabsTrigger value="deficiencia" className="rounded-xl font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200">
                            <Heart className="w-4 h-4 mr-2" />
                            Deficiência
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pessoais" className="mt-8">
                        <ModernFormField
                            title="Informações Pessoais"
                            description="Dados básicos do estudante"
                            icon={User}
                            required
                        >
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="nome"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                Nome Completo <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Digite o nome completo do estudante"
                                                    className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="turma"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Turma <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Ex: 1ºA, 2ºB"
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="matricula"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Matrícula
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Número da matrícula"
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Bolsa Família <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <ShadcnSelect onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                                            <SelectItem value="SIM">SIM</SelectItem>
                                                            <SelectItem value="NÃO">NÃO</SelectItem>
                                                        </SelectContent>
                                                    </ShadcnSelect>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Status <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <ShadcnSelect onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                                            <SelectValue placeholder="Selecione o Status" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                                            <SelectItem value="ATIVO">ATIVO</SelectItem>
                                                            <SelectItem value="INATIVO">INATIVO</SelectItem>
                                                        </SelectContent>
                                                    </ShadcnSelect>
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
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Turno <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <ShadcnSelect onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                                            <SelectValue placeholder="Selecione o Turno" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="dataNascimento"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Data de Nascimento
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="dd/mm/aaaa"
                                                        value={field.value ? formatDataNascimento(field.value) : ""}
                                                        onChange={(e) => {
                                                            const inputValue = e.target.value;
                                                            const cleanedValue = cleanDataNascimento(inputValue).slice(0, 8);
                                                            field.onChange(cleanedValue);
                                                        }}
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    E-mail
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="email"
                                                        placeholder="email@exemplo.com"
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </ModernFormField>
                    </TabsContent>

                    <TabsContent value="endereco" className="mt-8">
                        <ModernFormField
                            title="Endereço Residencial"
                            description="Informações de localização do estudante"
                            icon={Home}
                        >
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="endereco.cep"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                CEP
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="00000-000"
                                                    value={field.value ? formatCepLocal(field.value) : ""}
                                                    onChange={(e) => {
                                                        const inputValue = e.target.value;
                                                        const cleanedValue = cleanCep(inputValue);
                                                        field.onChange(cleanedValue);
                                                        setCepChangedManually(true);
                                                    }}
                                                    className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="endereco.rua"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                        Rua/Logradouro
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="Nome da rua"
                                                            className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="endereco.numero"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Número
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="123"
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="endereco.complemento"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Complemento
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Apto, bloco..."
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="endereco.bairro"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Bairro
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Nome do bairro"
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="endereco.cidade"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Cidade
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="Nome da cidade"
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                    Estado
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="SP"
                                                        className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </ModernFormField>
                    </TabsContent>

                    <TabsContent value="contatos" className="mt-8">
                        <ModernFormField
                            title="Contatos de Emergência"
                            description="Números de telefone para contato"
                            icon={Phone}
                        >
                            <div className="space-y-6">
                                {contatos.map((_, index) => (
                                    <ContactField
                                        key={index}
                                        index={index}
                                        form={form}
                                        onRemove={() => removeContact(index)}
                                        canRemove={index > 0}
                                    />
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addContact}
                                    className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200"
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Adicionar Novo Contato
                                </Button>
                            </div>
                        </ModernFormField>
                    </TabsContent>

                    <TabsContent value="deficiencia" className="mt-8">
                        <ModernFormField
                            title="Informações sobre Deficiência"
                            description="Dados de acessibilidade e necessidades especiais"
                            icon={Heart}
                        >
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="deficiencia.estudanteComDeficiencia"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center space-x-3 p-4 bg-amber-50/50 dark:bg-amber-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                                                <FormControl>
                                                    <Checkbox
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
                                                        className="w-5 h-5"
                                                    />
                                                </FormControl>
                                                <FormLabel className="text-lg font-semibold text-amber-800 dark:text-amber-200 cursor-pointer">
                                                    Estudante com Deficiência
                                                </FormLabel>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {form.watch("deficiencia.estudanteComDeficiencia") && (
                                    <div className="space-y-8 animate-in slide-in-from-top-4 duration-300">
                                        {/* Informações Gerais */}
                                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-600/50 rounded-2xl overflow-hidden">
                                            <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 pb-4">
                                                <CardTitle className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                                                    Informações Gerais
                                                </CardTitle>
                                                <CardDescription className="text-purple-600 dark:text-purple-300">
                                                    Tipo de deficiência e características
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-6">
                                                <FormField
                                                    control={form.control}
                                                    name="deficiencia.tipoDeficiencia"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                Tipo de Deficiência <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Select
                                                                        isMulti
                                                                        options={tipoDeficienciaOptions}
                                                                        value={tipoDeficienciaOptions.filter(
                                                                            (option) => field.value?.includes(option.value)
                                                                        )}
                                                                        onChange={(selectedOptions: MultiValue<SelectOption>) => {
                                                                            const newTipos = selectedOptions.map((option) => option.value);
                                                                            field.onChange(newTipos);
                                                                        }}
                                                                        styles={{
                                                                            ...customSelectStyles,
                                                                            control: (provided) => ({
                                                                                ...provided,
                                                                                minHeight: '48px',
                                                                                borderRadius: '12px',
                                                                                border: '2px solid rgb(226 232 240 / 0.5)',
                                                                                backgroundColor: 'rgb(255 255 255 / 0.8)',
                                                                                '&:hover': {
                                                                                    borderColor: 'rgb(59 130 246)',
                                                                                },
                                                                            }),
                                                                        }}
                                                                        placeholder="Selecione os tipos de deficiência"
                                                                    />
                                                                </div>
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
                                                            <div className="flex items-center space-x-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                        className="w-5 h-5"
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="text-base font-semibold text-blue-800 dark:text-blue-200 cursor-pointer">
                                                                    Possui Barreiras
                                                                </FormLabel>
                                                            </div>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </CardContent>
                                        </Card>

                                        {/* Atendimento Educacional */}
                                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-600/50 rounded-2xl overflow-hidden">
                                            <CardHeader className="bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 pb-4">
                                                <CardTitle className="text-lg font-semibold text-green-800 dark:text-green-200">
                                                    Atendimento Educacional
                                                </CardTitle>
                                                <CardDescription className="text-green-600 dark:text-green-300">
                                                    Informações sobre apoio educacional
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <FormField
                                                        control={form.control}
                                                        name="deficiencia.aee"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                    A.E.E.
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <ShadcnSelect onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                                                            <SelectItem value="PAEE">PAEE</SelectItem>
                                                                            <SelectItem value="PAAI">PAAI</SelectItem>
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
                                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                    Instituição
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <ShadcnSelect onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                                                            <SelectItem value="INSTITUTO JÓ CLEMENTE">INSTITUTO JÓ CLEMENTE</SelectItem>
                                                                            <SelectItem value="CLIFAK">CLIFAK</SelectItem>
                                                                            <SelectItem value="CEJOLE">CEJOLE</SelectItem>
                                                                            <SelectItem value="CCA">CCA</SelectItem>
                                                                            <SelectItem value="NENHUM">NENHUM</SelectItem>
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
                                                                <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                    Horário de Atendimento
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <ShadcnSelect onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                                                            <SelectValue placeholder="Selecione" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                                                            <SelectItem value="NENHUM">NENHUM</SelectItem>
                                                                            <SelectItem value="NO TURNO">NO TURNO</SelectItem>
                                                                            <SelectItem value="CONTRATURNO">CONTRATURNO</SelectItem>
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
                                                    name="deficiencia.atendimentoSaude"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                Atendimento de Saúde
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Select
                                                                    isMulti
                                                                    options={atendimentoSaudeOptions}
                                                                    value={atendimentoSaudeOptions.filter(
                                                                        (option) => field.value?.includes(option.value)
                                                                    )}
                                                                    onChange={(selectedOptions: MultiValue<SelectOption>) => {
                                                                        const newTipos = selectedOptions.map((option) => option.value);
                                                                        field.onChange(newTipos);
                                                                    }}
                                                                    styles={{
                                                                        ...customSelectStyles,
                                                                        control: (provided) => ({
                                                                            ...provided,
                                                                            minHeight: '48px',
                                                                            borderRadius: '12px',
                                                                            border: '2px solid rgb(226 232 240 / 0.5)',
                                                                            backgroundColor: 'rgb(255 255 255 / 0.8)',
                                                                            '&:hover': {
                                                                                borderColor: 'rgb(59 130 246)',
                                                                            },
                                                                        }),
                                                                    }}
                                                                    placeholder="Selecione os atendimentos de saúde"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </CardContent>
                                        </Card>

                                        {/* Apoio e Estágio */}
                                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/50 dark:border-slate-600/50 rounded-2xl overflow-hidden">
                                            <CardHeader className="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 pb-4">
                                                <CardTitle className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                                                    Apoio e Estágio
                                                </CardTitle>
                                                <CardDescription className="text-orange-600 dark:text-orange-300">
                                                    Informações sobre estagiários e AVE
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-6">
                                                <FormField
                                                    control={form.control}
                                                    name="deficiencia.possuiEstagiario"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex items-center space-x-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={(checked) => {
                                                                            field.onChange(!!checked);
                                                                            if (!checked) {
                                                                                form.setValue("deficiencia.nomeEstagiario", "NÃO NECESSITA");
                                                                                form.setValue("deficiencia.justificativaEstagiario", "SEM BARREIRAS");
                                                                            } else {
                                                                                form.setValue("deficiencia.nomeEstagiario", "");
                                                                            }
                                                                        }}
                                                                        className="w-5 h-5"
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="text-base font-semibold text-indigo-800 dark:text-indigo-200 cursor-pointer">
                                                                    Possui Estagiário(a)
                                                                </FormLabel>
                                                            </div>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {form.watch("deficiencia.possuiEstagiario") && (
                                                    <div className="space-y-4 p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl border border-indigo-200/30 dark:border-indigo-800/30 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.nomeEstagiario"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                            Nome do(a) Estagiário(a)
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                {...field}
                                                                                placeholder="Nome completo do estagiário"
                                                                                className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                                                                        <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                            Justificativa
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <ShadcnSelect onValueChange={field.onChange} value={field.value}>
                                                                                <SelectTrigger className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-blue-400 transition-all duration-200">
                                                                                    <SelectValue placeholder="Selecione a justificativa" />
                                                                                </SelectTrigger>
                                                                                <SelectContent className="rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
                                                                                    <SelectItem value="MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE">MEDIAÇÃO E APOIO NAS ATIVIDADES DA UE</SelectItem>
                                                                                    <SelectItem value="SEM BARREIRAS">SEM BARREIRAS</SelectItem>
                                                                                </SelectContent>
                                                                            </ShadcnSelect>
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <Separator className="my-6" />

                                                <FormField
                                                    control={form.control}
                                                    name="deficiencia.ave"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex items-center space-x-3 p-4 bg-pink-50/50 dark:bg-pink-900/20 rounded-xl border border-pink-200/50 dark:border-pink-800/50">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value}
                                                                        onCheckedChange={(checked) => {
                                                                            field.onChange(!!checked);
                                                                            if (!checked) {
                                                                                form.setValue("deficiencia.nomeAve", "");
                                                                                form.setValue("deficiencia.justificativaAve", []);
                                                                            }
                                                                        }}
                                                                        className="w-5 h-5"
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="text-base font-semibold text-pink-800 dark:text-pink-200 cursor-pointer">
                                                                    Possui AVE
                                                                </FormLabel>
                                                            </div>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {form.watch("deficiencia.ave") && (
                                                    <div className="space-y-4 p-4 bg-pink-50/30 dark:bg-pink-900/10 rounded-xl border border-pink-200/30 dark:border-pink-800/30 animate-in slide-in-from-top-2 duration-200">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <FormField
                                                                control={form.control}
                                                                name="deficiencia.nomeAve"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                            Nome do(a) AVE
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                {...field}
                                                                                placeholder="Nome completo do AVE"
                                                                                className="h-12 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
                                                                        <FormLabel className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                                            Justificativa
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Select
                                                                                isMulti
                                                                                options={justificativaAveOptions}
                                                                                value={justificativaAveOptions.filter(
                                                                                    (option) => field.value?.includes(option.value)
                                                                                )}
                                                                                onChange={(selectedOptions: MultiValue<SelectOption>) => {
                                                                                    const newJustificativas = selectedOptions.map((option) => option.value);
                                                                                    field.onChange(newJustificativas);
                                                                                }}
                                                                                styles={{
                                                                                    ...customSelectStyles,
                                                                                    control: (provided) => ({
                                                                                        ...provided,
                                                                                        minHeight: '48px',
                                                                                        borderRadius: '12px',
                                                                                        border: '2px solid rgb(226 232 240 / 0.5)',
                                                                                        backgroundColor: 'rgb(255 255 255 / 0.8)',
                                                                                        '&:hover': {
                                                                                            borderColor: 'rgb(59 130 246)',
                                                                                        },
                                                                                    }),
                                                                                }}
                                                                                placeholder="Selecione as justificativas"
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </ModernFormField>
                    </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-slate-200/50 dark:border-slate-600/50">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="h-12 px-8 text-base rounded-xl border-2 border-slate-200/50 dark:border-slate-600/50 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X className="w-5 h-5 mr-2" />
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="h-12 px-8 text-base rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                {isEditing ? 'Atualizando...' : 'Salvando...'}
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-2" />
                                {isEditing ? 'Atualizar' : 'Salvar'} Estudante
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
});