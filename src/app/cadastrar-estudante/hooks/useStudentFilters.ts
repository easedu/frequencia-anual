"use client";

import { useState, useMemo } from "react";
import { Estudante } from "@/types";
import { cleanDataNascimento } from "../utils/formatters";

export interface StudentFilters {
    turmaFiltro: string;
    nomeFiltro: string;
    statusFiltro: string;
    bolsaFamiliaFiltro: string;
    turnoFiltro: string;
    contatoFiltro: string;
    emailFiltro: string;
    enderecoFiltro: string;
    dataNascimentoFiltro: string;
    comDeficienciaFiltro: string;
    matriculaFiltro: string;
}

export const useStudentFilters = (students: Estudante[]) => {
    // Filter states
    const [turmaFiltro, setTurmaFiltro] = useState<string>("");
    const [nomeFiltro, setNomeFiltro] = useState<string>("");
    const [statusFiltro, setStatusFiltro] = useState<string>("");
    const [bolsaFamiliaFiltro, setBolsaFamiliaFiltro] = useState<string>("");
    const [turnoFiltro, setTurnoFiltro] = useState<string>("");
    const [contatoFiltro, setContatoFiltro] = useState<string>("");
    const [emailFiltro, setEmailFiltro] = useState<string>("");
    const [enderecoFiltro, setEnderecoFiltro] = useState<string>("");
    const [dataNascimentoFiltro, setDataNascimentoFiltro] = useState<string>("");
    const [comDeficienciaFiltro, setComDeficienciaFiltro] = useState<string>("");
    const [matriculaFiltro, setMatriculaFiltro] = useState<string>("");

    // Memoized filtered students
    const filteredStudents = useMemo(() => {
        return students.filter((est) => {
            const matchTurma = turmaFiltro === "" || turmaFiltro === "all" || est.turma === turmaFiltro;
            const matchNome = nomeFiltro === "" || est.nome.toLowerCase().includes(nomeFiltro.toLowerCase());
            const matchMatricula = matriculaFiltro === "" || (est.matricula?.toLowerCase().includes(matriculaFiltro.toLowerCase()) ?? false);
            const matchStatus = statusFiltro === "" || statusFiltro === "all" || est.status === statusFiltro;
            const matchTurno = turnoFiltro === "" || turnoFiltro === "all" || est.turno === turnoFiltro;
            const matchBolsaFamilia = bolsaFamiliaFiltro === "" || bolsaFamiliaFiltro === "all" || est.bolsaFamilia === bolsaFamiliaFiltro;
            const matchContato = contatoFiltro === "" || (est.contatos?.some(
                (contato) =>
                    contato.nome.toLowerCase().includes(contatoFiltro.toLowerCase()) ||
                    contato.telefone.includes(contatoFiltro)
            ) ?? false);
            const matchEmail = emailFiltro === "" || (est.email?.toLowerCase().includes(emailFiltro.toLowerCase()) ?? false);
            const matchEndereco = enderecoFiltro === "" || (est.endereco
                ? `${est.endereco.rua} ${est.endereco.numero} ${est.endereco.bairro} ${est.endereco.cidade} ${est.endereco.estado} ${est.endereco.cep} ${est.endereco.complemento}`
                    .toLowerCase()
                    .includes(enderecoFiltro.toLowerCase())
                : false);
            const matchDataNascimento = dataNascimentoFiltro === "" || (est.dataNascimento?.includes(cleanDataNascimento(dataNascimentoFiltro)) ?? false);
            const matchComDeficiencia = comDeficienciaFiltro === "" || comDeficienciaFiltro === "all" || (est.deficiencia?.estudanteComDeficiencia
                ? comDeficienciaFiltro === "SIM"
                : comDeficienciaFiltro === "NÃO");

            return (
                matchTurma &&
                matchNome &&
                matchMatricula &&
                matchStatus &&
                matchTurno &&
                matchBolsaFamilia &&
                matchContato &&
                matchEmail &&
                matchEndereco &&
                matchDataNascimento &&
                matchComDeficiencia
            );
        });
    }, [
        students,
        turmaFiltro,
        nomeFiltro,
        matriculaFiltro,
        statusFiltro,
        turnoFiltro,
        bolsaFamiliaFiltro,
        contatoFiltro,
        emailFiltro,
        enderecoFiltro,
        dataNascimentoFiltro,
        comDeficienciaFiltro,
    ]);

    return {
        filters: {
            turmaFiltro,
            nomeFiltro,
            statusFiltro,
            bolsaFamiliaFiltro,
            turnoFiltro,
            contatoFiltro,
            emailFiltro,
            enderecoFiltro,
            dataNascimentoFiltro,
            comDeficienciaFiltro,
            matriculaFiltro,
        },
        setters: {
            setTurmaFiltro,
            setNomeFiltro,
            setStatusFiltro,
            setBolsaFamiliaFiltro,
            setTurnoFiltro,
            setContatoFiltro,
            setEmailFiltro,
            setEnderecoFiltro,
            setDataNascimentoFiltro,
            setComDeficienciaFiltro,
            setMatriculaFiltro,
        },
        filteredStudents,
    };
};