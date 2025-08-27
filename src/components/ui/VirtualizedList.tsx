/**
 * Componente de lista virtualizada para performance otimizada
 * Renderiza apenas items visíveis, melhorando performance com grandes datasets
 */

"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import { debounce } from 'lodash-es';
import { UI_CONFIG } from '@/config/constants';
import { logger } from '@/utils/logger';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: number | string;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactElement;
  overscan?: number;
  onItemsRendered?: (props: { visibleStartIndex: number; visibleStopIndex: number }) => void;
  className?: string;
  loading?: boolean;
  loadingComponent?: React.ReactElement;
  emptyComponent?: React.ReactElement;
  searchTerm?: string;
  filterFn?: (item: T, searchTerm: string) => boolean;
}

/**
 * Lista virtualizada com altura fixa
 */
export function VirtualizedList<T>({
  items,
  itemHeight = UI_CONFIG.VIRTUAL_ITEM_HEIGHT,
  height,
  width = '100%',
  renderItem,
  overscan = 5,
  onItemsRendered,
  className = '',
  loading = false,
  loadingComponent,
  emptyComponent,
  searchTerm = '',
  filterFn
}: VirtualizedListProps<T>) {
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const listRef = useRef<List>(null);

  // Memoizar filtragem para evitar recálculos desnecessários
  const debouncedFilter = useMemo(
    () => debounce((items: T[], term: string) => {
      const startTime = performance.now();
      
      if (!term || !filterFn) {
        setFilteredItems(items);
        return;
      }

      const filtered = items.filter(item => filterFn(item, term));
      setFilteredItems(filtered);

      const duration = performance.now() - startTime;
      logger.performanceLog('List filtering', duration, {
        originalCount: items.length,
        filteredCount: filtered.length,
        searchTerm: term
      });
    }, 300),
    [filterFn]
  );

  // Aplicar filtro quando items ou searchTerm mudarem
  useEffect(() => {
    debouncedFilter(items, searchTerm);
    return () => debouncedFilter.cancel();
  }, [items, searchTerm, debouncedFilter]);

  // Scroll para o topo quando filtro mudar
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [searchTerm]);

  // Loading state
  if (loading && loadingComponent) {
    return loadingComponent;
  }

  // Empty state
  if (!loading && filteredItems.length === 0 && emptyComponent) {
    return emptyComponent;
  }

  return (
    <div className={`virtualized-list ${className}`}>
      <List
        ref={listRef}
        height={height}
        width={width}
        itemCount={filteredItems.length}
        itemSize={itemHeight}
        itemData={filteredItems}
        overscanCount={overscan}
        onItemsRendered={onItemsRendered}
      >
        {renderItem}
      </List>
    </div>
  );
}

interface VariableSizeVirtualizedListProps<T> extends Omit<VirtualizedListProps<T>, 'itemHeight' | 'renderItem'> {
  getItemSize: (index: number) => number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T[] }) => React.ReactElement;
  estimatedItemSize?: number;
}

/**
 * Lista virtualizada com altura variável
 */
export function VariableSizeVirtualizedList<T>({
  items,
  getItemSize,
  height,
  width = '100%',
  renderItem,
  overscan = 5,
  onItemsRendered,
  className = '',
  loading = false,
  loadingComponent,
  emptyComponent,
  searchTerm = '',
  filterFn,
  estimatedItemSize = UI_CONFIG.VIRTUAL_ITEM_HEIGHT
}: VariableSizeVirtualizedListProps<T>) {
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const listRef = useRef<VariableSizeList>(null);

  const debouncedFilter = useMemo(
    () => debounce((items: T[], term: string) => {
      if (!term || !filterFn) {
        setFilteredItems(items);
        return;
      }
      setFilteredItems(items.filter(item => filterFn(item, term)));
    }, 300),
    [filterFn]
  );

  useEffect(() => {
    debouncedFilter(items, searchTerm);
    return () => debouncedFilter.cancel();
  }, [items, searchTerm, debouncedFilter]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0);
    }
  }, [searchTerm]);

  if (loading && loadingComponent) {
    return loadingComponent;
  }

  if (!loading && filteredItems.length === 0 && emptyComponent) {
    return emptyComponent;
  }

  return (
    <div className={`virtualized-list ${className}`}>
      <VariableSizeList
        ref={listRef}
        height={height}
        width={width}
        itemCount={filteredItems.length}
        itemSize={getItemSize}
        itemData={filteredItems}
        overscanCount={overscan}
        estimatedItemSize={estimatedItemSize}
        onItemsRendered={onItemsRendered}
      >
        {renderItem}
      </VariableSizeList>
    </div>
  );
}

/**
 * Hook para implementar scroll infinito com virtualização
 */
export function useInfiniteScroll<T>({
  items,
  hasMore,
  loadMore,
  threshold = 5
}: {
  items: T[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  threshold?: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleItemsRendered = useCallback(
    async ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (
        hasMore &&
        !loading &&
        visibleStopIndex >= items.length - threshold
      ) {
        setLoading(true);
        try {
          await loadMore();
        } catch (error) {
          logger.error('Failed to load more items', {}, error as Error);
        } finally {
          setLoading(false);
        }
      }
    },
    [hasMore, loading, items.length, loadMore, threshold]
  );

  return {
    onItemsRendered: handleItemsRendered,
    loading
  };
}

/**
 * Componente de loading para listas virtualizadas
 */
export const VirtualizedListSkeleton: React.FC<{
  height: number;
  itemHeight?: number;
  itemCount?: number;
}> = ({ height, itemHeight = UI_CONFIG.VIRTUAL_ITEM_HEIGHT, itemCount = 10 }) => {
  const items = Array.from({ length: itemCount }, (_, i) => i);

  return (
    <div className="space-y-2" style={{ height }}>
      {items.map(i => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 rounded-md"
          style={{ height: itemHeight }}
        />
      ))}
    </div>
  );
};

/**
 * Componente de estado vazio para listas virtualizadas
 */
export const VirtualizedListEmpty: React.FC<{
  icon?: React.ReactElement;
  title: string;
  description?: string;
  action?: React.ReactElement;
}> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
};

/**
 * HOC para adicionar virtualização a componentes existentes
 */
export function withVirtualization<T, P extends { items: T[] }>(
  Component: React.ComponentType<P>
) {
  return function VirtualizedComponent({
    items,
    ...props
  }: P & {
    virtualize?: boolean;
    virtualHeight?: number;
    virtualItemHeight?: number;
  }) {
    const {
      virtualize = items.length > 100,
      virtualHeight = 400,
      virtualItemHeight = UI_CONFIG.VIRTUAL_ITEM_HEIGHT,
      ...componentProps
    } = props as any;

    if (!virtualize) {
      return <Component items={items} {...componentProps} />;
    }

    const renderItem = ({ index, style, data }: any) => (
      <div style={style}>
        <Component items={[data[index]]} {...componentProps} />
      </div>
    );

    return (
      <VirtualizedList
        items={items}
        height={virtualHeight}
        itemHeight={virtualItemHeight}
        renderItem={renderItem}
      />
    );
  };
}