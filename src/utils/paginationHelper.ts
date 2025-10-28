/**
 * Utilitário de Paginação Recursiva
 *
 * Carrega TODAS as páginas de uma API paginada de forma recursiva
 * Útil para dashboards e análises que precisam de todos os dados
 */

import { logger } from './logger';

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FetchAllPagesOptions {
  /** URL base da API (ex: '/api/students') */
  baseUrl: string;
  /** Token de autenticação (Bearer) */
  token: string;
  /** Filtros adicionais como query params */
  filters?: Record<string, string | number | boolean | undefined>;
  /** Limite por página (default: 1000) */
  pageLimit?: number;
  /** Nome do recurso para logs (ex: 'estudantes', 'faltas') */
  resourceName?: string;
  /** Callback para receber dados progressivamente conforme carregam */
  onProgress?: (data: unknown[], progress: { loaded: number; total: number }) => void;
}

/**
 * Busca TODAS as páginas de uma API paginada recursivamente
 * 🚀 OTIMIZADO: Carregamento paralelo de até 5 páginas simultaneamente
 *
 * @example
 * const allStudents = await fetchAllPages({
 *   baseUrl: '/api/students',
 *   token: await user.getIdToken(),
 *   filters: { status: 'ATIVO' },
 *   resourceName: 'estudantes'
 * });
 */
export async function fetchAllPages<T>(options: FetchAllPagesOptions): Promise<T[]> {
  const {
    baseUrl,
    token,
    filters = {},
    pageLimit = 1000, // ✅ Aumentado de 250 para 1000 (4x mais rápido)
    resourceName = 'registros',
    onProgress
  } = options;

  // 🚀 FASE 1: Buscar primeira página para saber total de páginas
  const firstPageParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      firstPageParams.append(key, String(value));
    }
  });
  firstPageParams.append('page', '1');
  firstPageParams.append('limit', pageLimit.toString());

  const firstResponse = await fetch(`${baseUrl}?${firstPageParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!firstResponse.ok) {
    logger.error(`❌ Erro ao carregar primeira página de ${resourceName}`);
    return [];
  }

  const firstData: PaginatedResponse<T> = await firstResponse.json();
  const allData: T[] = [...firstData.data];
  const totalPages = firstData.pagination.totalPages;

  // 🚀 PROGRESSIVE RENDERING: Notificar callback com primeira página
  if (onProgress) {
    onProgress(allData, { loaded: allData.length, total: firstData.pagination.total });
  }

  // Se só há 1 página, retornar
  if (totalPages === 1) {
    return allData;
  }

  // 🚀 FASE 2: Carregar páginas restantes EM PARALELO (batches de 10)
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const batchSize = 10; // ✅ Carregar 10 páginas por vez (2x mais rápido)

  for (let i = 0; i < remainingPages.length; i += batchSize) {
    const batch = remainingPages.slice(i, i + batchSize);

    // Buscar batch de páginas em paralelo
    const batchPromises = batch.map(async (pageNum) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      params.append('page', pageNum.toString());
      params.append('limit', pageLimit.toString());

      try {
        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          logger.error(`❌ Erro ao carregar página ${pageNum} de ${resourceName}`);
          return null;
        }

        const data: PaginatedResponse<T> = await response.json();
        
        return data.data;
      } catch (error) {
        logger.error(`❌ Erro ao buscar página ${pageNum} de ${resourceName}`, {}, error as Error);
        return null;
      }
    });

    // Aguardar batch completar
    const batchResults = await Promise.all(batchPromises);

    // Adicionar dados válidos
    batchResults.forEach((pageData) => {
      if (pageData) {
        allData.push(...pageData);
      }
    });

    // 🚀 PROGRESSIVE RENDERING: Notificar callback após cada batch
    if (onProgress) {
      onProgress([...allData], { loaded: allData.length, total: firstData.pagination.total });
    }
  }

  return allData;
}

/**
 * Hook helper para criar um fetchAll function
 *
 * @example
 * const fetchAllStudents = useFetchAll();
 * const allStudents = await fetchAllStudents('/api/students', { status: 'ATIVO' });
 */
export function createFetchAllFunction(token: string) {
  return async <T>(
    baseUrl: string,
    filters?: Record<string, string | number | boolean | undefined>,
    resourceName?: string
  ): Promise<T[]> => {
    return fetchAllPages<T>({
      baseUrl,
      token,
      filters,
      resourceName
    });
  };
}
