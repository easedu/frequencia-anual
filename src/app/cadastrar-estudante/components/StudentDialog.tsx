"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formSchema } from "../constants/formSchema";
import { Estudante } from "../interfaces";
import { StudentForm } from "./StudentForm";

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
    return (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingIndex !== null ? "Editar Estudante" : "Adicionar Estudante"}
                    </DialogTitle>
                </DialogHeader>
                <StudentForm
                    form={form}
                    editingEstudante={editingEstudante}
                    handleFormSubmit={handleFormSubmit}
                    handleCancel={handleCancel}
                    cepChangedManually={cepChangedManually}
                    setCepChangedManually={setCepChangedManually}
                />
            </DialogContent>
        </Dialog>
    );
}