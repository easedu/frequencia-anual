/**
 * Componente de Infinite Scroll
 *
 * FASE 2 - OTIMIZAÇÃO: Carregamento progressivo com Intersection Observer
 *
 * Características:
 * - Detecta quando usuário scrollou até o fim
 * - Carrega próxima página automaticamente
 * - Loading indicator apenas no fim da lista (não bloqueia UI)
 * - Funciona com React Query useInfiniteQuery
 *
 * Performance:
 * - Primeira página: < 1s
 * - Páginas seguintes: < 500ms cada
 * - UX suave em 3G lento
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteStudents();
 *
 * <InfiniteScrollContainer
 *   onLoadMore={fetchNextPage}
 *   hasMore={hasNextPage}
 *   isLoading={isLoading}
 *   isFetchingNextPage={isFetchingNextPage}
 * >
 *   {data?.pages.flatMap(page => page.data).map(item => (
 *     <ItemCard key={item.id} item={item} />
 *   ))}
 * </InfiniteScrollContainer>
 * ```
 */

'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface InfiniteScrollContainerProps {
  /** Conteúdo a ser renderizado (lista de itens) */
  children: React.ReactNode;

  /** Callback para carregar próxima página */
  onLoadMore: () => void;

  /** Se há mais páginas para carregar */
  hasMore: boolean;

  /** Se está carregando a primeira página */
  isLoading: boolean;

  /** Se está carregando próxima página (infinite scroll) */
  isFetchingNextPage?: boolean;

  /** Mensagem exibida durante carregamento */
  loadingMessage?: string;

  /** Mensagem exibida ao chegar no fim da lista */
  endMessage?: string;

  /** Threshold do Intersection Observer (0-1) */
  threshold?: number;

  /** Classe CSS customizada para container */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InfiniteScrollContainer({
  children,
  onLoadMore,
  hasMore,
  isLoading,
  isFetchingNextPage = false,
  loadingMessage = 'Carregando mais...',
  endMessage = 'Fim da lista',
  threshold = 0.5,
  className = 'space-y-4',
}: InfiniteScrollContainerProps) {
  // Intersection Observer para detectar quando usuário scrollou até o fim
  const { ref, inView } = useInView({
    threshold, // Trigger quando 50% do elemento estiver visível (padrão)
    triggerOnce: false, // Permitir múltiplos triggers
  });

  // Carregar mais quando "trigger" estiver visível
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, isFetchingNextPage, onLoadMore]);

  return (
    <div className={className}>
      {/* Conteúdo (lista de itens) */}
      {children}

      {/* Trigger de scroll (invisível, apenas para detectar scroll) */}
      {hasMore && (
        <div ref={ref} className="flex items-center justify-center py-8">
          {(isLoading || isFetchingNextPage) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{loadingMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de fim (quando não há mais páginas) */}
      {!hasMore && !isLoading && (
        <div className="text-center py-8 text-sm text-muted-foreground border-t">
          {endMessage}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON (componente auxiliar)
// ============================================================================

/**
 * Skeleton para primeira página loading
 * Usa padrão do shadcn/ui
 */
export function InfiniteScrollSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="h-20 w-full bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

// ============================================================================
// ERROR STATE (componente auxiliar)
// ============================================================================

/**
 * Estado de erro para infinite scroll
 */
export function InfiniteScrollError({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-8">
      <div className="text-red-600 mb-4">
        <p className="text-lg font-semibold">Erro ao carregar dados</p>
        <p className="text-sm">{error?.message || 'Erro desconhecido'}</p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATE (componente auxiliar)
// ============================================================================

/**
 * Estado vazio para infinite scroll
 */
export function InfiniteScrollEmpty({
  message = 'Nenhum item encontrado',
  icon,
}: {
  message?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
