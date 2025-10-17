/**
 * DisabilityFilters Component
 *
 * Filtros para o dashboard de deficiência (6 selects + StudentSelector).
 * Componente presentacional memoizado.
 */

import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChartData } from "@/hooks/useDisabilityProfile";

interface DisabilityFiltersProps {
  filtroTipoDeficiencia: string;
  onFiltroTipoDeficienciaChange: (value: string) => void;
  tiposDeficienciaData: ChartData[];

  filtroInstituicao: string;
  onFiltroInstituicaoChange: (value: string) => void;

  filtroAee: string;
  onFiltroAeeChange: (value: string) => void;

  filtroHorario: string;
  onFiltroHorarioChange: (value: string) => void;

  filtroEstagiario: string;
  onFiltroEstagiarioChange: (value: string) => void;

  filtroAve: string;
  onFiltroAveChange: (value: string) => void;
}

export const DisabilityFilters = memo(function DisabilityFilters({
  filtroTipoDeficiencia,
  onFiltroTipoDeficienciaChange,
  tiposDeficienciaData,
  filtroInstituicao,
  onFiltroInstituicaoChange,
  filtroAee,
  onFiltroAeeChange,
  filtroHorario,
  onFiltroHorarioChange,
  filtroEstagiario,
  onFiltroEstagiarioChange,
  filtroAve,
  onFiltroAveChange,
}: DisabilityFiltersProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Grid de 6 Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo de Deficiência */}
          <div>
            <Label htmlFor="filtro-tipo-deficiencia" className="mb-2 block">
              Filtrar por Tipo de Deficiência
            </Label>
            <Select onValueChange={onFiltroTipoDeficienciaChange} value={filtroTipoDeficiencia}>
              <SelectTrigger id="filtro-tipo-deficiencia">
                <SelectValue placeholder="Selecione o tipo de deficiência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {tiposDeficienciaData.map((tipo) => (
                  <SelectItem key={tipo.name} value={tipo.name}>
                    {tipo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Instituição */}
          <div>
            <Label htmlFor="filtro-instituicao" className="mb-2 block">
              Filtrar por Instituição
            </Label>
            <Select onValueChange={onFiltroInstituicaoChange} value={filtroInstituicao}>
              <SelectTrigger id="filtro-instituicao">
                <SelectValue placeholder="Selecione a instituição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                {["INSTITUTO JÔ CLEMENTE", "CLIFAK", "CEJOLE", "CCA", "NENHUM"].map((inst) => (
                  <SelectItem key={inst} value={inst}>
                    {inst}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AEE */}
          <div>
            <Label htmlFor="filtro-aee" className="mb-2 block">
              Filtrar por AEE
            </Label>
            <Select onValueChange={onFiltroAeeChange} value={filtroAee}>
              <SelectTrigger id="filtro-aee">
                <SelectValue placeholder="Selecione o tipo de AEE" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="PAEE">PAEE</SelectItem>
                <SelectItem value="PAAI">PAAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Horário */}
          <div>
            <Label htmlFor="filtro-horario" className="mb-2 block">
              Filtrar por Horário
            </Label>
            <Select onValueChange={onFiltroHorarioChange} value={filtroHorario}>
              <SelectTrigger id="filtro-horario">
                <SelectValue placeholder="Selecione o horário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="NO TURNO">No Turno</SelectItem>
                <SelectItem value="CONTRATURNO">Contraturno</SelectItem>
                <SelectItem value="NENHUM">Nenhum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estagiário */}
          <div>
            <Label htmlFor="filtro-estagiario" className="mb-2 block">
              Filtrar por Estagiário
            </Label>
            <Select onValueChange={onFiltroEstagiarioChange} value={filtroEstagiario}>
              <SelectTrigger id="filtro-estagiario">
                <SelectValue placeholder="Selecione a opção de estagiário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="true">Com Estagiário</SelectItem>
                <SelectItem value="false">Sem Estagiário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AVE */}
          <div>
            <Label htmlFor="filtro-ave" className="mb-2 block">
              Filtrar por AVE
            </Label>
            <Select onValueChange={onFiltroAveChange} value={filtroAve}>
              <SelectTrigger id="filtro-ave">
                <SelectValue placeholder="Selecione a opção de AVE" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="true">Com AVE</SelectItem>
                <SelectItem value="false">Sem AVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
