"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

import { formSchema } from "../constants/formSchema";
import { Estudante } from "@/types";
import { cleanTelefone, cleanCep } from "../utils/formatters";

export const useStudentForm = (
    students: Estudante[],
    saveStudents: (students: Estudante[]) => Promise<void>,
    setStudents: (students: Estudante[]) => void
) => {
    const [editingEstudante, setEditingEstudante] = useState<Estudante | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [cepChangedManually, setCepChangedManually] = useState<boolean>(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: "",
            turma: "",
            matricula: "",
            bolsaFamilia: "NÃO",
            status: "ATIVO",
            dataNascimento: "",
            turno: "MANHÃ",
            email: "",
            endereco: {
                cep: "",
                rua: "",
                numero: "",
                bairro: "",
                cidade: "",
                estado: "",
                complemento: "",
            },
            contatos: [{ nome: "", telefone: "" }],
            deficiencia: {
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
            },
        },
    });

    // Reset form when editing student changes
    useEffect(() => {
        if (editingEstudante) {
            setCepChangedManually(false);
            form.reset({
                nome: editingEstudante.nome || "",
                turma: editingEstudante.turma || "",
                matricula: editingEstudante.matricula || "",
                bolsaFamilia: editingEstudante.bolsaFamilia || "NÃO",
                status: (editingEstudante.status as "ATIVO" | "INATIVO") || "ATIVO",
                dataNascimento: editingEstudante.dataNascimento || "",
                turno: editingEstudante.turno || "MANHÃ",
                email: editingEstudante.email || "",
                endereco: {
                    cep: editingEstudante.endereco?.cep || "",
                    rua: editingEstudante.endereco?.rua || "",
                    numero: editingEstudante.endereco?.numero || "",
                    bairro: editingEstudante.endereco?.bairro || "",
                    cidade: editingEstudante.endereco?.cidade || "",
                    estado: editingEstudante.endereco?.estado || "",
                    complemento: editingEstudante.endereco?.complemento || "",
                },
                contatos: editingEstudante.contatos?.length
                    ? editingEstudante.contatos
                    : [{ nome: "", telefone: "" }],
                deficiencia: editingEstudante.deficiencia || {
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
                },
            });
        }
    }, [editingEstudante, form]);

    const handleFormSubmit = useCallback(async (data: z.infer<typeof formSchema>) => {
        if (!editingEstudante) return;

        const newTurma = data.turma.toUpperCase();
        const newNome = data.nome.toUpperCase();

        // Check for duplicates
        const duplicateExists = students.some(
            (est, index) =>
                est.turma.toUpperCase() === newTurma &&
                est.nome.toUpperCase() === newNome &&
                (editingIndex === null || index !== editingIndex)
        );

        if (duplicateExists) {
            toast.error("Já existe um estudante com esse nome e turma!");
            return;
        }

        // Create student object
        const student: Estudante = {
            estudanteId: editingEstudante.estudanteId || uuidv4(),
            turma: newTurma,
            nome: newNome,
            matricula: data.matricula?.trim() || "",
            status: data.status.toUpperCase(),
            turno: data.turno.toUpperCase() as "MANHÃ" | "TARDE",
            bolsaFamilia: data.bolsaFamilia,
            contatos: data.contatos
                ?.filter((contato) => contato.nome?.trim() || contato.telefone?.trim())
                .map((contato) => ({
                    nome: contato.nome!.trim(),
                    telefone: cleanTelefone(contato.telefone!),
                })) || [],
            email: data.email?.trim() || "",
            dataNascimento: data.dataNascimento?.trim() || "",
            deficiencia: data.deficiencia?.estudanteComDeficiencia
                ? {
                    estudanteComDeficiencia: data.deficiencia.estudanteComDeficiencia,
                    tipoDeficiencia: data.deficiencia.tipoDeficiencia || [],
                    possuiBarreiras: data.deficiencia.possuiBarreiras ?? true,
                    aee: data.deficiencia.aee,
                    instituicao: data.deficiencia.instituicao,
                    horarioAtendimento: data.deficiencia.horarioAtendimento || "NENHUM",
                    atendimentoSaude: data.deficiencia.atendimentoSaude || [],
                    possuiEstagiario: data.deficiencia.possuiEstagiario || false,
                    nomeEstagiario: data.deficiencia.nomeEstagiario || "NÃO NECESSITA",
                    justificativaEstagiario: data.deficiencia.justificativaEstagiario || "SEM BARREIRAS",
                    ave: data.deficiencia.ave || false,
                    nomeAve: data.deficiencia.nomeAve || "",
                    justificativaAve: data.deficiencia.justificativaAve || [],
                }
                : undefined,
            endereco: data.endereco?.cep
                ? {
                    rua: data.endereco.rua!.trim(),
                    numero: data.endereco.numero!.trim(),
                    bairro: data.endereco.bairro!.trim(),
                    cidade: data.endereco.cidade!.trim(),
                    estado: data.endereco.estado!.trim(),
                    cep: cleanCep(data.endereco.cep),
                    complemento: data.endereco.complemento?.trim() || "",
                }
                : undefined,
            provaSaoPaulo: editingEstudante.provaSaoPaulo || [],
        };

        // Update students array
        const newStudents = [...students];
        if (editingIndex !== null) {
            newStudents[editingIndex] = student;
        } else {
            newStudents.push(student);
        }

        setStudents(newStudents);
        handleCancel();

        try {
            await saveStudents(newStudents);
            toast.success("Registro salvo com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar o registro no Firebase.");
        }
    }, [editingEstudante, students, editingIndex, saveStudents, setStudents]);

    const handleCancel = useCallback(() => {
        setEditingEstudante(null);
        setEditingIndex(null);
        setOpenModal(false);
        setCepChangedManually(false);
        form.reset();
    }, [form]);

    const handleNewStudent = useCallback(() => {
        setEditingEstudante({
            estudanteId: "",
            turma: "",
            nome: "",
            matricula: "",
            status: "ATIVO",
            turno: "MANHÃ",
            bolsaFamilia: "NÃO",
            contatos: [{ nome: "", telefone: "" }],
            email: "",
            dataNascimento: "",
            endereco: {
                rua: "",
                numero: "",
                bairro: "",
                cidade: "",
                estado: "",
                cep: "",
                complemento: "",
            },
            deficiencia: {
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
            },
            provaSaoPaulo: [],
        });
        setEditingIndex(null);
        setOpenModal(true);
        setCepChangedManually(false);
    }, []);

    return {
        form,
        editingEstudante,
        setEditingEstudante,
        editingIndex,
        setEditingIndex,
        openModal,
        setOpenModal,
        cepChangedManually,
        setCepChangedManually,
        handleFormSubmit,
        handleCancel,
        handleNewStudent,
    };
};