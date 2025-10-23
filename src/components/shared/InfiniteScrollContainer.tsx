/**
 * Infinite Scroll Container Component
 *
 * OTIMIZAÇÃO: Carregamento progressivo de dados com Intersection Observer
 * Substitui paginação tradicional (melhor UX em conexões lentas)
 *
 * Uso:
 * - Lista de estudantes
 * - Lista de faltas
 * - Lista de interações
 * - Qualquer listagem grande
 */

'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface InfiniteScrollContainerProps {
  /**
   * Conteúdo a ser renderizado (lista de itens)
   */
  children: React.ReactNode;

  /**
   * Callback executado quando usuário scrolla até o fim
   */
  onLoadMore: () => void;

  /**
   * Se há mais páginas para carregar
   */
  hasMore: boolean;

  /**
   * Se está carregando a primeira página
   */
  isLoading: boolean;

  /**
   * Se está carregando próxima página (opcional)
   */
  isFetchingNextPage?: boolean;

  /**
   * Mensagem exibida durante carregamento (opcional)
   */
  loadingMessage?: string;

  /**
   * Mensagem exibida ao chegar no fim (opcional)
   */
  endMessage?: string;

  /**
   * Threshold do Intersection Observer (0-1)
   * @default 0.5 (trigger quando 50% do elemento estiver visível)
   */
  threshold?: number;

  /**
   * Classe CSS customizada para o container
   */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Infinite Scroll Container
 *
 * Usa Intersection Observer API para detectar quando usuário scrollou até o fim
 * e carregar mais dados automaticamente
 *
 * @example
 * ```tsx
 * <InfiniteScrollContainer
 *   onLoadMore={fetchNextPage}
 *   hasMore={hasNextPage}
 *   isLoading={isLoading}
 *   isFetchingNextPage={isFetchingNextPage}
 * >
 *   {students.map(student => (
 *     <StudentCard key={student.id} student={student} />
 *   ))}
 * </InfiniteScrollContainer>
 * ```
 */
export function InfiniteScrollContainer({
  children,
  onLoadMore,
  hasMore,
  isLoading,
  isFetchingNextPage = false,
  loadingMessage = 'Carregando mais...',
  endMessage = 'Fim da lista',
  threshold = 0.5,
  className = '',
}: InfiniteScrollContainerProps) {
  // ✅ Intersection Observer para detectar scroll até o fim
  const { ref, inView } = useInView({
    threshold, // Trigger quando X% do elemento estiver visível
    triggerOnce: false, // Permitir múltiplos triggers
    skip: !hasMore || isLoading, // Não observar se não há mais dados
  });

  // ✅ Carregar mais quando trigger estiver visível
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, isFetchingNextPage, onLoadMore]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ============================================================ */}
      {/* CONTEÚDO (lista de itens) */}
      {/* ============================================================ */}
      {children}

      {/* ============================================================ */}
      {/* TRIGGER DE SCROLL (elemento observado) */}
      {/* ============================================================ */}
      {hasMore && (
        <div
          ref={ref}
          className="flex items-center justify-center py-8 min-h-[100px]"
        >
          {(isLoading || isFetchingNextPage) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{loadingMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MENSAGEM DE FIM */}
      {/* ============================================================ */}
      {!hasMore && !isLoading && (
        <div className="text-center py-8 text-sm text-muted-foreground border-t">
          {endMessage}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// VARIANTS
// ============================================================================

/**
 * Variante com skeleton loading (primeira página)
 *
 * @example
 * ```tsx
 * {isLoading && <InfiniteScrollSkeleton count={10} />}
 * {!isLoading && (
 *   <InfiniteScrollContainer ...>
 *     {items}
 *   </InfiniteScrollContainer>
 * )}
 * ```
 */
export function InfiniteScrollSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="h-20 w-full bg-muted animate-pulse rounded-lg"
        />
      ))}
    </div>
  );
}

/**
 * Variante com grid layout
 *
 * @example
 * ```tsx
 * <InfiniteScrollGrid
 *   columns={3}
 *   onLoadMore={fetchNextPage}
 *   hasMore={hasNextPage}
 *   isLoading={isLoading}
 * >
 *   {items}
 * </InfiniteScrollGrid>
 * ```
 */
export function InfiniteScrollGrid({
  children,
  columns = 3,
  ...props
}: InfiniteScrollContainerProps & { columns?: number }) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <InfiniteScrollContainer {...props}>
      <div className={`grid ${gridClass} gap-4`}>
        {children}
      </div>
    </InfiniteScrollContainer>
  );
}
