/**
 * RegisterDateRangeFormCard - Componente Genérico
 *
 * Formulário reutilizável para cadastro de registros com:
 * - Data de início
 * - Número de dias
 * - Descrição
 *
 * Usado por:
 * - RegisterAtestadoCard
 * - RegisterSuspensaoCard
 *
 * Sprint 2: Componentização e reutilização
 */

import { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateInput } from "@/app/utils";
import { Calendar, Clock, Edit3, Plus, X, Save, Loader2, LucideIcon } from "lucide-react";

interface RegisterDateRangeFormCardProps<T> {
  // Theme
  title: string;
  titleIcon: LucideIcon;
  headerGradient: string; // Ex: "from-emerald-500 to-teal-600"
  iconColor: string; // Ex: "text-emerald-600"
  buttonColor: string; // Ex: "bg-emerald-600 hover:bg-emerald-700"

  // Data
  editingItem: T | null;

  // Form fields
  startDate: string;
  days: string;
  description: string;

  // Setters
  setStartDate: (value: string) => void;
  setDays: (value: string) => void;
  setDescription: (value: string) => void;
  setEditingItem: (value: T | null) => void;

  // Handlers
  onAdd: () => Promise<void>;
  onEdit: () => Promise<void>;

  // Labels (customizáveis)
  startDateLabel?: string;
  daysLabel?: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;

  // Optional
  id?: string;
  isSubmitting?: boolean;
}

function RegisterDateRangeFormCardComponent<T>({
  title,
  titleIcon: TitleIcon,
  headerGradient,
  iconColor,
  buttonColor,
  editingItem,
  startDate,
  days,
  description,
  setStartDate,
  setDays,
  setDescription,
  setEditingItem,
  onAdd,
  onEdit,
  startDateLabel = "Data de Início",
  daysLabel = "Dias de Validade",
  descriptionLabel = "Descrição",
  descriptionPlaceholder = "Descrição...",
  id,
  isSubmitting = false,
}: RegisterDateRangeFormCardProps<T>) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCancel = () => {
    setEditingItem(null);
    setStartDate("");
    setDays("");
    setDescription("");
  };

  return (
    <Card ref={cardRef} id={id} className="shadow-lg border-0">
      <CardHeader className={`bg-gradient-to-r ${headerGradient} text-white rounded-t-lg py-3`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center space-x-2">
            <TitleIcon className="w-4 h-4" />
            <span>{editingItem ? `Editar ${title}` : `Cadastrar ${title}`}</span>
          </CardTitle>

          {editingItem && (
            <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
              <Edit3 className="w-3 h-3 mr-1" />
              Editando
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Campos de Data e Dias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor={`${id}-start-date`} className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <Calendar className={`w-3 h-3 ${iconColor}`} />
                <span>{startDateLabel}</span>
              </Label>
              <Input
                id={`${id}-start-date`}
                placeholder="dd/mm/aaaa"
                value={startDate}
                onChange={(e) => setStartDate(formatDateInput(e.target.value))}
                maxLength={10}
                className="border-gray-300 focus:border-current focus:ring-current transition-colors h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${id}-days`} className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <Clock className={`w-3 h-3 ${iconColor}`} />
                <span>{daysLabel}</span>
              </Label>
              <Input
                id={`${id}-days`}
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="Número de dias"
                min="1"
                className="border-gray-300 focus:border-current focus:ring-current transition-colors h-9"
              />
            </div>
          </div>

          {/* Campo de Descrição */}
          <div className="space-y-1">
            <Label htmlFor={`${id}-description`} className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <TitleIcon className={`w-3 h-3 ${iconColor}`} />
              <span>{descriptionLabel}</span>
            </Label>
            <Textarea
              id={`${id}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={descriptionPlaceholder}
              rows={3}
              className="border-gray-300 focus:border-current focus:ring-current transition-colors resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
            <Button
              onClick={editingItem ? onEdit : onAdd}
              disabled={isSubmitting}
              className={`flex-1 ${buttonColor} text-white transition-colors duration-200 flex items-center justify-center space-x-2 h-9 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : editingItem ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </>
              )}
            </Button>

            {editingItem && (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 sm:flex-initial border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2 h-9"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export without memo temporarily (debugging input issue)
export const RegisterDateRangeFormCard = RegisterDateRangeFormCardComponent;
