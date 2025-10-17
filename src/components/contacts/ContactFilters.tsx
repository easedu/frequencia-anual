/**
 * ContactFilters Component
 *
 * Filtros de busca e seleção para lista de contatos.
 * Extrai ~80-100 linhas do componente telefones/page.tsx
 */

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface ContactFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedTurma: string;
  onTurmaChange: (value: string) => void;
  selectedVerificationStatus: string;
  onVerificationStatusChange: (value: string) => void;
  selectedPhoneType: string;
  onPhoneTypeChange: (value: string) => void;
  selectedWhatsAppStatus: string;
  onWhatsAppStatusChange: (value: string) => void;
  uniqueTurmas: string[];
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const ContactFilters = memo(function ContactFilters({
  searchTerm,
  onSearchChange,
  selectedTurma,
  onTurmaChange,
  selectedVerificationStatus,
  onVerificationStatusChange,
  selectedPhoneType,
  onPhoneTypeChange,
  selectedWhatsAppStatus,
  onWhatsAppStatusChange,
  uniqueTurmas,
}: ContactFiltersProps) {
  return (
    <Card className="border-2 border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Busca */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Nome, telefone..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Turma */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Turma</Label>
            <Select value={selectedTurma} onValueChange={onTurmaChange}>
              <SelectTrigger className="h-10 border-gray-300">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Turmas</SelectItem>
                {uniqueTurmas.map(turma => (
                  <SelectItem key={turma} value={turma}>{turma}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status de Verificação */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Verificação</Label>
            <Select value={selectedVerificationStatus} onValueChange={onVerificationStatusChange}>
              <SelectTrigger className="h-10 border-gray-300">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="not-verified">Não Verificados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Telefone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Tipo</Label>
            <Select value={selectedPhoneType} onValueChange={onPhoneTypeChange}>
              <SelectTrigger className="h-10 border-gray-300">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="mobile">Celular</SelectItem>
                <SelectItem value="landline">Fixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status WhatsApp */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">WhatsApp</Label>
            <Select value={selectedWhatsAppStatus} onValueChange={onWhatsAppStatusChange}>
              <SelectTrigger className="h-10 border-gray-300">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="has-whatsapp">Tem WhatsApp</SelectItem>
                <SelectItem value="no-whatsapp">Sem WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
