import React, { memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
        podeReceberMensagem: z.boolean().default(true),
        nome: z.string().min(1, "Nome do contato é obrigatório"),
        telefone: z.string().min(1, "Telefone é obrigatório"),
        parentesco: z.string().min(1, "Parentesco é obrigatório"),
    })).optional(),
    deficiencia: z.object({
        estudanteComDeficiencia: z.boolean(),
        tipoDeficiencia: z.string().optional(),
        observacoes: z.string().optional(),
    }).optional(),
});
import { Estudante } from '@/types';
import { StudentForm } from './StudentForm';

interface StudentDialogProps {
    openModal: boolean;
    setOpenModal: (open: boolean) => void;
    form: UseFormReturn<z.infer<typeof formSchema>>;
    editingIndex: number | null;
    editingEstudante: Estudante | null;
    handleFormSubmit: (data: z.infer<typeof formSchema>) => void;
    handleCancel: () => void;
    cepChangedManually: boolean;
    setCepChangedManually: (value: boolean) => void;
    isSaving?: boolean;
}

export const StudentDialog = memo(function StudentDialog({
    openModal,
    setOpenModal,
    form,
    editingIndex,
    editingEstudante,
    handleFormSubmit,
    handleCancel,
    cepChangedManually,
    setCepChangedManually,
    isSaving = false,
}: StudentDialogProps) {
    const isEditing = editingIndex !== null;

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            handleCancel();
        }
        setOpenModal(open);
    };

    return (
        <Dialog open={openModal} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-0">
                <DialogHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-3 border-b border-blue-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                            {isEditing ? (
                                <Edit className="w-5 h-5 text-white" />
                            ) : (
                                <Plus className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-lg font-semibold text-white">
                                {isEditing ? 'Editar Estudante' : 'Novo Estudante'}
                            </DialogTitle>
                            <DialogDescription className="text-blue-100 text-xs">
                                {isEditing
                                    ? 'Atualize as informações do estudante'
                                    : 'Preencha os dados do novo estudante'
                                }
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
                    <StudentForm
                        form={form}
                        editingEstudante={editingEstudante}
                        handleFormSubmit={handleFormSubmit}
                        handleCancel={handleCancel}
                        cepChangedManually={cepChangedManually}
                        setCepChangedManually={setCepChangedManually}
                        isEditing={isEditing}
                        isSaving={isSaving}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
});