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
        nome: z.string(),
        telefone: z.string(),
        parentesco: z.string(),
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
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl p-0">
                <DialogHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6 rounded-t-3xl">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            {isEditing ? (
                                <Edit className="w-7 h-7 text-white" />
                            ) : (
                                <Plus className="w-7 h-7 text-white" />
                            )}
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-2xl font-bold text-white">
                                {isEditing ? 'Editar Estudante' : 'Novo Estudante'}
                            </DialogTitle>
                            <DialogDescription className="text-blue-100 mt-1 text-lg">
                                {isEditing
                                    ? 'Atualize as informações do estudante'
                                    : 'Preencha os dados do novo estudante'
                                }
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <StudentForm
                        form={form}
                        editingEstudante={editingEstudante}
                        handleFormSubmit={handleFormSubmit}
                        handleCancel={handleCancel}
                        cepChangedManually={cepChangedManually}
                        setCepChangedManually={setCepChangedManually}
                        isEditing={isEditing}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
});