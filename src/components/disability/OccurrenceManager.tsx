/**
 * OccurrenceManager Component
 *
 * Gerenciamento completo de ocorrências (CRUD) para estudantes.
 * Formulário + Lista + Ações (editar/deletar) + Dialog de confirmação.
 */

import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash } from "lucide-react";
import { Estudante } from "@/types";
import { Ocorrencia } from "@/hooks/useDisabilityProfile";

interface OccurrenceManagerProps {
  selectedStudent: Estudante | null;
  occurrences: Ocorrencia[];
  filteredOccurrences: Ocorrencia[];
  filtroTabelaOcorrencias: string;
  onFiltroTabelaOcorrenciasChange: (value: string) => void;

  occurrenceDate: string;
  onOccurrenceDateChange: (date: string) => void;
  occurrenceDescription: string;
  onOccurrenceDescriptionChange: (desc: string) => void;
  occurrenceSensitive: boolean;
  onOccurrenceSensitiveChange: (sensitive: boolean | string) => void;

  editingOccurrence: Ocorrencia | null;
  showDeleteOccurrenceDialog: string | null;
  onShowDeleteOccurrenceDialogChange: (id: string | null) => void;

  userRole: string | null;

  onAddOccurrence: () => Promise<void>;
  onEditOccurrence: () => Promise<void>;
  onDeleteOccurrence: (id: string) => Promise<void>;
  onStartEdit: (occ: Ocorrencia) => void;
  onCancelEdit: () => void;
}

export const OccurrenceManager = memo(function OccurrenceManager({
  selectedStudent,
  occurrences,
  filteredOccurrences,
  filtroTabelaOcorrencias,
  onFiltroTabelaOcorrenciasChange,
  occurrenceDate,
  onOccurrenceDateChange,
  occurrenceDescription,
  onOccurrenceDescriptionChange,
  occurrenceSensitive,
  onOccurrenceSensitiveChange,
  editingOccurrence,
  showDeleteOccurrenceDialog,
  onShowDeleteOccurrenceDialogChange,
  userRole,
  onAddOccurrence,
  onEditOccurrence,
  onDeleteOccurrence,
  onStartEdit,
  onCancelEdit,
}: OccurrenceManagerProps) {
  if (!selectedStudent) return null;

  const canEdit = userRole === "admin" || userRole === "professor";

  return (
    <div id="occurrence-section" className="space-y-6">
      {/* Formulário de Ocorrência */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingOccurrence ? "Editar Ocorrência" : "Registrar Nova Ocorrência"} -{" "}
            {selectedStudent.nome}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="occurrence-date">Data da Ocorrência</Label>
              <Input
                id="occurrence-date"
                type="text"
                placeholder="DD/MM/AAAA"
                value={occurrenceDate}
                onChange={(e) => onOccurrenceDateChange(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="occurrence-description">Descrição da Ocorrência</Label>
              <Textarea
                id="occurrence-description"
                placeholder="Descreva a ocorrência..."
                value={occurrenceDescription}
                onChange={(e) => onOccurrenceDescriptionChange(e.target.value)}
                disabled={!canEdit}
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="occurrence-sensitive"
                checked={occurrenceSensitive}
                onCheckedChange={onOccurrenceSensitiveChange}
                disabled={!canEdit}
              />
              <Label htmlFor="occurrence-sensitive" className="font-normal">
                Ocorrência sensível/grave (acesso restrito a coordenação)
              </Label>
            </div>

            <div className="flex gap-2">
              {editingOccurrence ? (
                <>
                  <Button onClick={onEditOccurrence} disabled={!canEdit}>
                    Salvar Edição
                  </Button>
                  <Button variant="outline" onClick={onCancelEdit}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={onAddOccurrence} disabled={!canEdit}>
                  Registrar Ocorrência
                </Button>
              )}
            </div>

            {!canEdit && (
              <p className="text-sm text-muted-foreground">
                Você não tem permissão para adicionar ou editar ocorrências.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ocorrências */}
      <Card id="occurrence-card">
        <CardHeader>
          <CardTitle>Ocorrências Registradas ({occurrences.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar ocorrências por data, descrição ou autor..."
            value={filtroTabelaOcorrencias}
            onChange={(e) => onFiltroTabelaOcorrenciasChange(e.target.value)}
            className="mb-4"
          />

          {filteredOccurrences.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma ocorrência registrada para este estudante.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredOccurrences.map((occ) => (
                <div
                  key={occ.id}
                  className={`p-4 border rounded-lg ${
                    occ.sensitive
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{occ.date}</span>
                        {occ.sensitive && (
                          <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">
                            SENSÍVEL
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{occ.description}</p>
                      <p className="text-xs text-gray-500">
                        Registrado por: {occ.createdBy}
                      </p>
                    </div>

                    {canEdit && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStartEdit(occ)}
                          title="Editar ocorrência"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onShowDeleteOccurrenceDialogChange(occ.id)}
                          title="Excluir ocorrência"
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={showDeleteOccurrenceDialog !== null}
        onOpenChange={() => onShowDeleteOccurrenceDialogChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir esta ocorrência? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onShowDeleteOccurrenceDialogChange(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDeleteOccurrenceDialog) {
                  onDeleteOccurrence(showDeleteOccurrenceDialog);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
