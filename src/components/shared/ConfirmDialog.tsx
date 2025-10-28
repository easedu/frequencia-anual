/**
 * ConfirmDialog Component
 *
 * Componente reutilizável para diálogos de confirmação
 * Consolidado de: múltiplos componentes com confirmações inline
 *
 * Features:
 * - Confirmação de ações críticas (deletar, remover, etc)
 * - Variantes visuais (default, danger, warning, info)
 * - Botões customizáveis
 * - Suporte para loading state
 * - Keyboard shortcuts (Enter = confirmar, Esc = cancelar)
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

export interface ConfirmDialogProps {
  // Estado
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Conteúdo
  title: string;
  description?: string;
  content?: React.ReactNode; // Conteúdo customizado no corpo do dialog

  // Ação
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;

  // Labels dos botões
  confirmLabel?: string;
  cancelLabel?: string;

  // Estilo
  variant?: 'default' | 'danger' | 'warning' | 'info';

  // Loading
  loading?: boolean;

  // Desabilitar botão de confirmar
  disableConfirm?: boolean;
}

// ════════════════════════════════════════════════════════════════
// VARIANTES VISUAIS
// ════════════════════════════════════════════════════════════════

const variants = {
  default: {
    icon: Info,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    confirmVariant: 'default' as const,
  },
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100',
    confirmVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertCircle,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    confirmVariant: 'default' as const,
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    confirmVariant: 'default' as const,
  },
};

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  content,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  disableConfirm = false,
}: ConfirmDialogProps) {
  const variantConfig = variants[variant];
  const IconComponent = variantConfig.icon;

  // ──────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    await onConfirm();
    // Não fechar automaticamente - deixar o componente pai decidir
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  // ──────────────────────────────────────────────────────────────
  // Keyboard Shortcuts
  // ──────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disableConfirm && !loading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onKeyDown={handleKeyDown} className="sm:max-w-md">
        <DialogHeader>
          {/* Ícone */}
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${variantConfig.iconBg}`}>
              <IconComponent size={24} className={variantConfig.iconColor} />
            </div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>

          {/* Descrição */}
          {description && (
            <DialogDescription className="text-sm text-gray-600 mt-2">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Conteúdo Customizado */}
        {content && <div className="py-4">{content}</div>}

        {/* Botões */}
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variantConfig.confirmVariant}
            onClick={handleConfirm}
            disabled={disableConfirm || loading}
            className="flex-1"
          >
            {loading ? 'Processando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════
// HOOK CUSTOMIZADO - useConfirmDialog
// ════════════════════════════════════════════════════════════════

/**
 * Hook para facilitar uso do ConfirmDialog
 *
 * @example
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Confirmar exclusão',
 *     description: 'Esta ação não pode ser desfeita.',
 *     variant: 'danger',
 *   });
 *   if (confirmed) {
 *     // Executar exclusão
 *   }
 * };
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    config: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'>;
    resolve?: (value: boolean) => void;
  }>({
    open: false,
    config: { title: '' },
  });

  const confirm = (
    config: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        config,
        resolve,
      });
    });
  };

  const handleConfirm = async () => {
    dialogState.resolve?.(true);
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  const handleCancel = () => {
    dialogState.resolve?.(false);
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  const ConfirmDialogComponent = (
    <ConfirmDialog
      {...dialogState.config}
      open={dialogState.open}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, ConfirmDialogComponent };
}

// ════════════════════════════════════════════════════════════════
// VARIANTES PRÉ-CONFIGURADAS
// ════════════════════════════════════════════════════════════════

/**
 * Dialog de confirmação de exclusão
 */
export function DeleteConfirmDialog(
  props: Omit<ConfirmDialogProps, 'variant'>
) {
  return (
    <ConfirmDialog
      {...props}
      variant="danger"
      confirmLabel={props.confirmLabel || 'Deletar'}
      title={props.title || 'Confirmar exclusão'}
      description={props.description || 'Esta ação não pode ser desfeita.'}
    />
  );
}

/**
 * Dialog de confirmação de ação crítica
 */
export function DangerConfirmDialog(
  props: Omit<ConfirmDialogProps, 'variant'>
) {
  return (
    <ConfirmDialog
      {...props}
      variant="danger"
    />
  );
}

/**
 * Dialog de aviso
 */
export function WarningDialog(
  props: Omit<ConfirmDialogProps, 'variant'>
) {
  return (
    <ConfirmDialog
      {...props}
      variant="warning"
    />
  );
}

// ════════════════════════════════════════════════════════════════
// EXEMPLOS DE USO
// ════════════════════════════════════════════════════════════════

/**
 * Exemplo 1: Uso básico com estado
 *
 * const [showDialog, setShowDialog] = useState(false);
 *
 * const handleDelete = async () => {
 *   await deleteStudent(id);
 *   toast.success('Estudante deletado!');
 *   setShowDialog(false);
 * };
 *
 * <ConfirmDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   title="Deletar estudante?"
 *   description="Esta ação não pode ser desfeita."
 *   variant="danger"
 *   onConfirm={handleDelete}
 * />
 */

/**
 * Exemplo 2: Uso com hook (mais simples)
 *
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Deletar estudante?',
 *     description: 'Esta ação não pode ser desfeita.',
 *     variant: 'danger',
 *   });
 *
 *   if (confirmed) {
 *     await deleteStudent(id);
 *     toast.success('Estudante deletado!');
 *   }
 * };
 *
 * return (
 *   <>
 *     <Button onClick={handleDelete}>Deletar</Button>
 *     {ConfirmDialogComponent}
 *   </>
 * );
 */

/**
 * Exemplo 3: Uso da variante DeleteConfirmDialog
 *
 * <DeleteConfirmDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   title="Deletar falta?"
 *   description="A falta será removida permanentemente do sistema."
 *   onConfirm={handleDeleteAbsence}
 * />
 */

/**
 * Exemplo 4: Com loading state
 *
 * const [loading, setLoading] = useState(false);
 *
 * const handleConfirm = async () => {
 *   setLoading(true);
 *   try {
 *     await deleteStudent(id);
 *     toast.success('Deletado!');
 *     setShowDialog(false);
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 *
 * <ConfirmDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   title="Deletar estudante?"
 *   variant="danger"
 *   onConfirm={handleConfirm}
 *   loading={loading}
 * />
 */
