/**
 * 🚀 Progressive Loader - Carregamento Progressivo de Dados
 *
 * Solução para ERR_CONNECTION_RESET em conexões lentas.
 * Carrega dados em chunks pequenos ao invés de tudo de uma vez.
 *
 * Vantagens:
 * - ✅ Evita timeout (chunks pequenos < 1s cada)
 * - ✅ Feedback visual imediato (primeiros dados em < 1s)
 * - ✅ Funciona em conexões lentas
 * - ✅ UX melhor (usuário vê progresso)
 *
 * @example
 * // Backend (API Route)
 * const students = await loadProgressively(
 *   (offset, limit) => supabaseAdmin
 *     .from('students')
 *     .select('*')
 *     .range(offset, offset + limit - 1),
 *   { pageSize: 100 }
 * );
 *
 * @example
 * // Frontend (Hook com callback de progresso)
 * const students = await loadProgressively(
 *   (offset, limit) => supabase
 *     .from('students')
 *     .select('*')
 *     .range(offset, offset + limit - 1),
 *   {
 *     pageSize: 50,
 *     onProgress: (data) => setStudents(data) // Atualiza UI progressivamente
 *   }
 * );
 */

export interface ProgressiveLoaderOptions {
  /** Tamanho de cada chunk (padrão: 100 para backend, 50 para frontend) */
  pageSize?: number;

  /** Callback chamado após cada chunk carregado (para atualizar UI) */
  onProgress?: (currentData: any[]) => void;

  /** Limite máximo de registros (padrão: 10000) */
  maxRecords?: number;

  /** Timeout por chunk em ms (padrão: 5000ms = 5s) */
  chunkTimeout?: number;
}

export interface LoaderFunction {
  (offset: number, limit: number): Promise<{ data: any[] | null; error: any }>;
}

/**
 * Carrega dados progressivamente em chunks
 *
 * @param loaderFn - Função que executa a query com offset/limit
 * @param options - Opções de configuração
 * @returns Array com todos os dados carregados
 */
export async function loadProgressively<T = any>(
  loaderFn: LoaderFunction,
  options: ProgressiveLoaderOptions = {}
): Promise<T[]> {
  const {
    pageSize = 100,
    onProgress,
    maxRecords = 10000,
    chunkTimeout = 5000,
  } = options;

  const allData: T[] = [];
  let offset = 0;

  while (offset < maxRecords) {
    try {
      // Timeout por chunk (evita travamento)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Chunk timeout')), chunkTimeout)
      );

      const dataPromise = loaderFn(offset, pageSize);

      const { data, error } = await Promise.race([dataPromise, timeoutPromise]);

      if (error) {
        console.error(`[ProgressiveLoader] Error at offset ${offset}:`, error);
        // Continua com dados já carregados ao invés de falhar tudo
        break;
      }

      if (!data || data.length === 0) {
        // Fim dos dados
        break;
      }

      // Adiciona chunk aos dados totais
      allData.push(...data);

      // Callback de progresso (atualiza UI no frontend)
      if (onProgress) {
        onProgress([...allData]);
      }

      // Se retornou menos que pageSize, acabaram os dados
      if (data.length < pageSize) {
        break;
      }

      offset += pageSize;

      // Pequeno delay para evitar rate limiting (apenas no frontend)
      if (typeof window !== 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`[ProgressiveLoader] Error at offset ${offset}:`, error);
      // Retorna dados já carregados ao invés de falhar tudo
      break;
    }
  }

  return allData;
}

/**
 * Versão simplificada para backend (sem onProgress)
 *
 * @example
 * const students = await loadAll(
 *   (offset, limit) => supabaseAdmin.from('students').select('*').range(offset, offset + limit - 1)
 * );
 */
export async function loadAll<T = any>(
  loaderFn: LoaderFunction,
  pageSize = 100
): Promise<T[]> {
  return loadProgressively<T>(loaderFn, { pageSize });
}

/**
 * Versão para frontend com callback de progresso obrigatório
 *
 * @example
 * await loadWithProgress(
 *   (offset, limit) => supabase.from('students').select('*').range(offset, offset + limit - 1),
 *   (data) => setStudents(data)
 * );
 */
export async function loadWithProgress<T = any>(
  loaderFn: LoaderFunction,
  onProgress: (data: T[]) => void,
  pageSize = 50
): Promise<T[]> {
  return loadProgressively<T>(loaderFn, { pageSize, onProgress });
}
