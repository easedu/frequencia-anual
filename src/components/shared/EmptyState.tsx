/**
 * EmptyState Component
 *
 * Componente reutilizável para estado vazio genérico
 * Consolidado de: múltiplos componentes com mensagens "Nenhum resultado"
 *
 * Features:
 * - Ícone customizável
 * - Título e descrição
 * - Call-to-action opcional (botão)
 * - Variantes visuais (default, info, warning, error)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  FileQuestion,
  Search,
  AlertCircle,
  Info,
  Users,
  Calendar,
  LucideIcon,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

export interface EmptyStateProps {
  // Ícone
  icon?: LucideIcon;
  iconSize?: number;

  // Conteúdo
  title: string;
  description?: string;

  // Call-to-action
  actionLabel?: string;
  onAction?: () => void;

  // Estilo
  variant?: 'default' | 'info' | 'warning' | 'error' | 'search';
  className?: string;
}

// ════════════════════════════════════════════════════════════════
// VARIANTES VISUAIS
// ════════════════════════════════════════════════════════════════

const variants = {
  default: {
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400',
    textColor: 'text-gray-600',
    descriptionColor: 'text-gray-500',
    Icon: FileQuestion,
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-900',
    descriptionColor: 'text-blue-700',
    Icon: Info,
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-400',
    textColor: 'text-yellow-900',
    descriptionColor: 'text-yellow-700',
    Icon: AlertCircle,
  },
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-400',
    textColor: 'text-red-900',
    descriptionColor: 'text-red-700',
    Icon: AlertCircle,
  },
  search: {
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    iconColor: 'text-slate-400',
    textColor: 'text-slate-700',
    descriptionColor: 'text-slate-500',
    Icon: Search,
  },
};

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function EmptyState({
  icon,
  iconSize = 48,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const variantConfig = variants[variant];
  const IconComponent = icon || variantConfig.Icon;

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        p-12 rounded-lg border-2 border-dashed
        ${variantConfig.bgColor}
        ${variantConfig.borderColor}
        ${className}
      `}
    >
      {/* Ícone */}
      <IconComponent
        size={iconSize}
        className={`mb-4 ${variantConfig.iconColor}`}
      />

      {/* Título */}
      <h3 className={`text-lg font-semibold mb-2 ${variantConfig.textColor}`}>
        {title}
      </h3>

      {/* Descrição */}
      {description && (
        <p className={`text-sm text-center max-w-md mb-6 ${variantConfig.descriptionColor}`}>
          {description}
        </p>
      )}

      {/* Call-to-action */}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// VARIANTES PRÉ-CONFIGURADAS
// ════════════════════════════════════════════════════════════════

/**
 * EmptyState para busca sem resultados
 */
export function EmptySearchState(props: Omit<EmptyStateProps, 'variant'>) {
  return (
    <EmptyState
      {...props}
      variant="search"
      title={props.title || 'Nenhum resultado encontrado'}
      description={props.description || 'Tente ajustar os filtros de busca'}
    />
  );
}

/**
 * EmptyState para lista de estudantes vazia
 */
export function EmptyStudentsState(props: Omit<EmptyStateProps, 'variant' | 'icon'>) {
  return (
    <EmptyState
      {...props}
      variant="default"
      icon={Users}
      title={props.title || 'Nenhum estudante encontrado'}
      description={props.description || 'Não há estudantes cadastrados nesta turma'}
    />
  );
}

/**
 * EmptyState para períodos/datas vazias
 */
export function EmptyCalendarState(props: Omit<EmptyStateProps, 'variant' | 'icon'>) {
  return (
    <EmptyState
      {...props}
      variant="info"
      icon={Calendar}
      title={props.title || 'Nenhum registro neste período'}
      description={props.description || 'Selecione um período diferente para visualizar dados'}
    />
  );
}

/**
 * EmptyState para erro
 */
export function ErrorState(props: Omit<EmptyStateProps, 'variant'>) {
  return (
    <EmptyState
      {...props}
      variant="error"
      title={props.title || 'Erro ao carregar dados'}
      description={props.description || 'Tente novamente mais tarde'}
    />
  );
}

/**
 * EmptyState informativo
 */
export function InfoState(props: Omit<EmptyStateProps, 'variant'>) {
  return (
    <EmptyState
      {...props}
      variant="info"
    />
  );
}

// ════════════════════════════════════════════════════════════════
// EXEMPLOS DE USO
// ════════════════════════════════════════════════════════════════

/**
 * Exemplo 1: Uso básico
 *
 * <EmptyState
 *   title="Nenhuma falta registrada"
 *   description="Este estudante não possui faltas no período selecionado"
 * />
 */

/**
 * Exemplo 2: Com ação
 *
 * <EmptyState
 *   title="Nenhum estudante cadastrado"
 *   description="Cadastre estudantes para começar a usar o sistema"
 *   actionLabel="Cadastrar Estudante"
 *   onAction={() => router.push('/cadastrar-estudante')}
 * />
 */

/**
 * Exemplo 3: Busca vazia
 *
 * <EmptySearchState
 *   title="Nenhum resultado para 'João Silva'"
 *   description="Verifique se o nome está correto ou tente outro filtro"
 * />
 */

/**
 * Exemplo 4: Lista de estudantes vazia
 *
 * <EmptyStudentsState
 *   title="Nenhum estudante na turma 5A"
 *   actionLabel="Adicionar Estudante"
 *   onAction={handleAddStudent}
 * />
 */

/**
 * Exemplo 5: Erro
 *
 * <ErrorState
 *   title="Erro ao carregar estudantes"
 *   description="Não foi possível conectar ao servidor. Tente novamente."
 *   actionLabel="Tentar Novamente"
 *   onAction={handleRetry}
 * />
 */
