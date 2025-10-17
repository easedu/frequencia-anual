/**
 * DisabilityTables Component
 *
 * Tabelas de Estagiários e AVEs com busca e ordenação.
 * Componente presentacional memoizado.
 */

import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Estudante } from "@/types";
import { ArrowUp, ArrowDown } from "lucide-react";

interface DisabilityTablesProps {
  // Estagiários
  filteredEstagiarios: Estudante[];
  filtroTabelaEstagiario: string;
  onFiltroTabelaEstagiarioChange: (value: string) => void;
  sortEstagiario: "asc" | "desc" | null;
  onSortEstagiarioChange: (sort: "asc" | "desc" | null) => void;

  // AVEs
  filteredAves: Estudante[];
  filtroTabelaAve: string;
  onFiltroTabelaAveChange: (value: string) => void;
  sortAve: "asc" | "desc" | null;
  onSortAveChange: (sort: "asc" | "desc" | null) => void;

  // Callback para selecionar estudante
  onSelectStudent?: (student: Estudante) => void;
}

export const DisabilityTables = memo(function DisabilityTables({
  filteredEstagiarios,
  filtroTabelaEstagiario,
  onFiltroTabelaEstagiarioChange,
  sortEstagiario,
  onSortEstagiarioChange,
  filteredAves,
  filtroTabelaAve,
  onFiltroTabelaAveChange,
  sortAve,
  onSortAveChange,
  onSelectStudent,
}: DisabilityTablesProps) {
  const handleSortEstagiarioClick = () => {
    if (sortEstagiario === null) onSortEstagiarioChange("asc");
    else if (sortEstagiario === "asc") onSortEstagiarioChange("desc");
    else onSortEstagiarioChange(null);
  };

  const handleSortAveClick = () => {
    if (sortAve === null) onSortAveChange("asc");
    else if (sortAve === "asc") onSortAveChange("desc");
    else onSortAveChange(null);
  };

  return (
    <>
      {/* Tabela de Estagiários */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estudantes com Estagiário ({filteredEstagiarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por turma, estudante ou estagiário..."
            value={filtroTabelaEstagiario}
            onChange={(e) => onFiltroTabelaEstagiarioChange(e.target.value)}
            className="mb-4"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Estudante</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      Estagiário
                      <Button variant="ghost" size="sm" onClick={handleSortEstagiarioClick}>
                        {sortEstagiario === "asc" && <ArrowUp className="h-4 w-4" />}
                        {sortEstagiario === "desc" && <ArrowDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead>Justificativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstagiarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum estudante com estagiário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEstagiarios.map((student) => (
                    <TableRow
                      key={student.estudanteId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectStudent?.(student)}
                    >
                      <TableCell>{student.turma}</TableCell>
                      <TableCell>{student.nome}</TableCell>
                      <TableCell>{student.deficiencia?.nomeEstagiario || "N/A"}</TableCell>
                      <TableCell>{student.deficiencia?.justificativaEstagiario || "N/A"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de AVEs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estudantes com AVE ({filteredAves.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por turma, estudante ou AVE..."
            value={filtroTabelaAve}
            onChange={(e) => onFiltroTabelaAveChange(e.target.value)}
            className="mb-4"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Estudante</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      AVE
                      <Button variant="ghost" size="sm" onClick={handleSortAveClick}>
                        {sortAve === "asc" && <ArrowUp className="h-4 w-4" />}
                        {sortAve === "desc" && <ArrowDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableHead>
                  <TableHead>Justificativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAves.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum estudante com AVE encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAves.map((student) => (
                    <TableRow
                      key={student.estudanteId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectStudent?.(student)}
                    >
                      <TableCell>{student.turma}</TableCell>
                      <TableCell>{student.nome}</TableCell>
                      <TableCell>{student.deficiencia?.nomeAve || "N/A"}</TableCell>
                      <TableCell>
                        {Array.isArray(student.deficiencia?.justificativaAve)
                          ? student.deficiencia.justificativaAve.join(", ")
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
});
