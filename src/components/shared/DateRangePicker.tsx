/**
 * DateRangePicker Component
 *
 * Componente reutilizável para seleção de período de datas
 * Consolidado de: relatorio-interacoes, relatorio-bolsa-familia, etc
 *
 * Features:
 * - Seleção de data inicial e final
 * - Validação automática (data final >= data inicial)
 * - Formato brasileiro (DD/MM/YYYY)
 * - Opções pré-definidas (Este mês, Último mês, Este ano, etc)
 * - Validação de data não futura (opcional)
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import {
  formatDateToDDMMYYYY,
  parseDateFromDDMMYYYY,
  getCurrentDateBR,
  isNotFutureDate,
} from '@/utils/dateUtils';

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

export interface DateRange {
  startDate: string; // DD/MM/YYYY
  endDate: string;   // DD/MM/YYYY
}

export interface DateRangePickerProps {
  // Valores iniciais
  initialStartDate?: string;
  initialEndDate?: string;

  // Callback quando datas mudam
  onChange?: (range: DateRange) => void;

  // Validações
  allowFutureDates?: boolean;
  maxRangeDays?: number | null; // Máximo de dias entre início e fim (null = sem limite)

  // Labels
  startLabel?: string;
  endLabel?: string;

  // Quick presets
  showPresets?: boolean;
  presets?: DateRangePreset[];

  // Estilo
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

export interface DateRangePreset {
  label: string;
  startDate: string; // DD/MM/YYYY
  endDate: string;   // DD/MM/YYYY
}

// ════════════════════════════════════════════════════════════════
// PRESETS PADRÃO
// ════════════════════════════════════════════════════════════════

const getDefaultPresets = (): DateRangePreset[] => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // Primeiro dia do mês atual
  const firstDayThisMonth = new Date(currentYear, currentMonth, 1);
  const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0);

  // Primeiro dia do mês passado
  const firstDayLastMonth = new Date(currentYear, currentMonth - 1, 1);
  const lastDayLastMonth = new Date(currentYear, currentMonth, 0);

  // Primeiro dia do ano
  const firstDayThisYear = new Date(currentYear, 0, 1);

  return [
    {
      label: 'Este mês',
      startDate: formatDateToDDMMYYYY(firstDayThisMonth),
      endDate: formatDateToDDMMYYYY(lastDayThisMonth),
    },
    {
      label: 'Mês passado',
      startDate: formatDateToDDMMYYYY(firstDayLastMonth),
      endDate: formatDateToDDMMYYYY(lastDayLastMonth),
    },
    {
      label: 'Este ano',
      startDate: formatDateToDDMMYYYY(firstDayThisYear),
      endDate: getCurrentDateBR(),
    },
    {
      label: 'Últimos 7 dias',
      startDate: formatDateToDDMMYYYY(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)),
      endDate: getCurrentDateBR(),
    },
    {
      label: 'Últimos 30 dias',
      startDate: formatDateToDDMMYYYY(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
      endDate: getCurrentDateBR(),
    },
  ];
};

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function DateRangePicker({
  initialStartDate = '',
  initialEndDate = '',
  onChange,
  allowFutureDates = false,
  maxRangeDays = null,
  startLabel = 'Data Inicial',
  endLabel = 'Data Final',
  showPresets = true,
  presets = getDefaultPresets(),
  className = '',
  variant = 'horizontal',
}: DateRangePickerProps) {

  // ──────────────────────────────────────────────────────────────
  // Estado
  // ──────────────────────────────────────────────────────────────

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [error, setError] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────
  // Validações
  // ──────────────────────────────────────────────────────────────

  const validateDates = (start: string, end: string): string | null => {
    if (!start || !end) return null;

    const startDateObj = parseDateFromDDMMYYYY(start);
    const endDateObj = parseDateFromDDMMYYYY(end);

    // Data final deve ser >= data inicial
    if (endDateObj < startDateObj) {
      return 'Data final deve ser maior ou igual à data inicial';
    }

    // Data não pode ser futura (se configurado)
    if (!allowFutureDates) {
      if (!isNotFutureDate(start)) {
        return 'Data inicial não pode ser futura';
      }
      if (!isNotFutureDate(end)) {
        return 'Data final não pode ser futura';
      }
    }

    // Máximo de dias no range (se configurado)
    if (maxRangeDays) {
      const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > maxRangeDays) {
        return `Período máximo de ${maxRangeDays} dias`;
      }
    }

    return null;
  };

  // ──────────────────────────────────────────────────────────────
  // Efeitos
  // ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const validationError = validateDates(startDate, endDate);
    setError(validationError);

    // Chamar callback apenas se válido
    if (!validationError && startDate && endDate) {
      onChange?.({ startDate, endDate });
    }
  }, [startDate, endDate, onChange]);

  // ──────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  // ──────────────────────────────────────────────────────────────
  // Layout
  // ──────────────────────────────────────────────────────────────

  const containerClass = variant === 'horizontal'
    ? `space-y-4 ${className}`
    : `space-y-4 ${className}`;

  const inputsClass = variant === 'horizontal'
    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
    : 'space-y-4';

  return (
    <div className={containerClass}>
      {/* Inputs de Data */}
      <div className={inputsClass}>
        {/* Data Inicial */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>{startLabel}</span>
          </Label>
          <Input
            type="text"
            placeholder="DD/MM/YYYY"
            value={startDate}
            onChange={handleStartChange}
            maxLength={10}
            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Data Final */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-green-600" />
            <span>{endLabel}</span>
          </Label>
          <Input
            type="text"
            placeholder="DD/MM/YYYY"
            value={endDate}
            onChange={handleEndChange}
            maxLength={10}
            className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Presets (Opções Rápidas) */}
      {showPresets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VARIANTES PRÉ-CONFIGURADAS
// ════════════════════════════════════════════════════════════════

/**
 * DateRangePicker sem presets (mais compacto)
 */
export function DateRangePickerCompact(props: Omit<DateRangePickerProps, 'showPresets'>) {
  return <DateRangePicker {...props} showPresets={false} />;
}

/**
 * DateRangePicker vertical (mobile-friendly)
 */
export function DateRangePickerVertical(props: Omit<DateRangePickerProps, 'variant'>) {
  return <DateRangePicker {...props} variant="vertical" />;
}
