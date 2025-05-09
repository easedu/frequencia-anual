"use client";

import { Edit } from "lucide-react";
import { Estudante, Contato } from "../interfaces";
import { formatTelefone, formatCep, formatDataNascimento } from "../utils/formatters";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
    TableHead,
} from "@/components/ui/table";

interface StudentTableProps {
    currentRecords: Estudante[];
    visibleColumns: Set<string>;
    sortColumn: string;
    sortDirection: "asc" | "desc";
    handleSort: (column: string) => void;
    setEditingEstudante: (estudante: Estudante) => void;
    setEditingIndex: (index: number) => void;
    setOpenModal: (open: boolean) => void;
    students: Estudante[];
}

export function StudentTable({
    currentRecords,
    visibleColumns,
    sortColumn,
    sortDirection,
    handleSort,
    setEditingEstudante,
    setEditingIndex,
    setOpenModal,
    students,
}: StudentTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {visibleColumns.has("turma") && (
                            <TableHead
                                onClick={() => handleSort("turma")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Turma{" "}
                                {sortColumn === "turma" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("nome") && (
                            <TableHead
                                onClick={() => handleSort("nome")}
                                className="cursor-pointer font-bold"
                            >
                                Nome do Estudante{" "}
                                {sortColumn === "nome" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("dataNascimento") && (
                            <TableHead
                                onClick={() => handleSort("dataNascimento")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Data de Nascimento{" "}
                                {sortColumn === "dataNascimento" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("turno") && (
                            <TableHead
                                onClick={() => handleSort("turno")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Turno{" "}
                                {sortColumn === "turno" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("bolsaFamilia") && (
                            <TableHead
                                onClick={() => handleSort("bolsaFamilia")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Bolsa Família{" "}
                                {sortColumn === "bolsaFamilia" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("status") && (
                            <TableHead
                                onClick={() => handleSort("status")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Status{" "}
                                {sortColumn === "status" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("contatos") && (
                            <TableHead
                                onClick={() => handleSort("contatos")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Contatos{" "}
                                {sortColumn === "contatos" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("email") && (
                            <TableHead
                                onClick={() => handleSort("email")}
                                className="cursor-pointer font-bold text-center"
                            >
                                E-mail{" "}
                                {sortColumn === "email" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("endereco") && (
                            <TableHead
                                onClick={() => handleSort("endereco")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Endereço{" "}
                                {sortColumn === "endereco" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("deficiencia") && (
                            <TableHead
                                onClick={() => handleSort("deficiencia")}
                                className="cursor-pointer font-bold text-center"
                            >
                                Deficiência{" "}
                                {sortColumn === "deficiencia" && (
                                    <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                                )}
                            </TableHead>
                        )}
                        {visibleColumns.has("actions") && (
                            <TableHead className="font-bold text-center">Ações</TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {currentRecords.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={visibleColumns.size}
                                className="text-center text-gray-500 py-10"
                            >
                                Não há estudantes para exibir com os filtros aplicados.
                            </TableCell>
                        </TableRow>
                    ) : (
                        currentRecords.map((est: Estudante, index: number) => (
                            <TableRow key={est.estudanteId || index}>
                                {visibleColumns.has("turma") && (
                                    <TableCell className="text-center">
                                        {est.turma}
                                    </TableCell>
                                )}
                                {visibleColumns.has("nome") && (
                                    <TableCell className="text-left">{est.nome}</TableCell>
                                )}
                                {visibleColumns.has("dataNascimento") && (
                                    <TableCell className="text-center">
                                        {est.dataNascimento
                                            ? formatDataNascimento(est.dataNascimento)
                                            : "NENHUMA"}
                                    </TableCell>
                                )}
                                {visibleColumns.has("turno") && (
                                    <TableCell className="text-center">
                                        {est.turno}
                                    </TableCell>
                                )}
                                {visibleColumns.has("bolsaFamilia") && (
                                    <TableCell className="text-center">
                                        {est.bolsaFamilia}
                                    </TableCell>
                                )}
                                {visibleColumns.has("status") && (
                                    <TableCell className="text-center">
                                        {est.status}
                                    </TableCell>
                                )}
                                {visibleColumns.has("contatos") && (
                                    <TableCell className="text-center">
                                        {est.contatos && est.contatos.length > 0
                                            ? est.contatos
                                                .map(
                                                    (contato: Contato) =>
                                                        `${contato.nome}: ${formatTelefone(
                                                            contato.telefone
                                                        )}`
                                                )
                                                .join(", ")
                                            : "NENHUM"}
                                    </TableCell>
                                )}
                                {visibleColumns.has("email") && (
                                    <TableCell className="text-center">
                                        {est.email || "NENHUM"}
                                    </TableCell>
                                )}
                                {visibleColumns.has("endereco") && (
                                    <TableCell className="text-center">
                                        {est.endereco
                                            ? `${est.endereco.rua}, ${est.endereco.numero}, ${est.endereco.complemento
                                                ? `${est.endereco.complemento}, `
                                                : ""
                                            }${est.endereco.bairro}, ${est.endereco.cidade}-${est.endereco.estado
                                            }, ${formatCep(est.endereco.cep)}`
                                            : "NENHUM"}
                                    </TableCell>
                                )}
                                {visibleColumns.has("deficiencia") && (
                                    <TableCell className="text-center">
                                        {est.deficiencia?.estudanteComDeficiencia
                                            ? `${est.deficiencia.tipoDeficiencia?.join(", ") || "NENHUM"}`
                                            : "NENHUM"}
                                    </TableCell>
                                )}
                                {visibleColumns.has("actions") && (
                                    <TableCell className="text-center">
                                        <Edit
                                            className="cursor-pointer inline-block"
                                            onClick={() => {
                                                const globalIndex = students.findIndex(
                                                    (item) =>
                                                        item.turma === est.turma &&
                                                        item.nome === est.nome &&
                                                        item.status === est.status &&
                                                        item.bolsaFamilia === est.bolsaFamilia &&
                                                        item.estudanteId === est.estudanteId
                                                );
                                                setEditingEstudante(est);
                                                setEditingIndex(globalIndex);
                                                setOpenModal(true);
                                            }}
                                        />
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}