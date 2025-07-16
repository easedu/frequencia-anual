import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { X, Plus, Edit } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formSchema } from '../constants/formSchema';
import { Estudante } from '../interfaces';
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

export function StudentDialog({
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

    return (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-white/20 dark:border-slate-700/20 rounded-3xl shadow-2xl">
                {/* Custom Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 -m-6 mb-0 px-8 py-6 rounded-t-3xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                {isEditing ? (
                                    <Edit className="w-7 h-7 text-white" />
                                ) : (
                                    <Plus className="w-7 h-7 text-white" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {isEditing ? 'Editar Estudante' : 'Novo Estudante'}
                                </h2>
                                <p className="text-blue-100 mt-1 text-lg">
                                    {isEditing
                                        ? 'Atualize as informações do estudante'
                                        : 'Preencha os dados do novo estudante'
                                    }
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                            className="text-white hover:bg-white/20 rounded-2xl p-3 transition-all duration-200"
                        >
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
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
}