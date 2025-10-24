/**
 * HTTP Cache Headers Utility
 *
 * ✅ OTIMIZAÇÃO FASE 1: Cache HTTP para reduzir latência
 *
 * Headers configurados:
 * - Cache-Control: Controla cache em CDN e navegador
 * - Vary: Define quais headers influenciam o cache
 * - X-Cache-Strategy: Metadados para debug
 */

import { NextResponse } from 'next/server';

export type CacheStrategy =
  | 'dynamic' // Dados que mudam frequentemente (5 min)
  | 'semi-static' // Dados que mudam ocasionalmente (15 min)
  | 'static' // Dados que raramente mudam (1 hora)
  | 'no-cache'; // Não cachear (dados sensíveis/tempo real)

/**
 * Configurações de cache por estratégia
 */
const CACHE_CONFIGS: Record<
  CacheStrategy,
  {
    sMaxAge: number; // Tempo de cache no CDN (segundos)
    staleWhileRevalidate: number; // Tempo adicional com revalidação em background
    description: string;
  }
> = {
  dynamic: {
    sMaxAge: 300, // 5 minutos
    staleWhileRevalidate: 600, // +10 minutos
    description: 'Dados dinâmicos (students, absences, tasks)',
  },
  'semi-static': {
    sMaxAge: 900, // 15 minutos
    staleWhileRevalidate: 1800, // +30 minutos
    description: 'Dados semi-estáticos (academic years, reports)',
  },
  static: {
    sMaxAge: 3600, // 1 hora
    staleWhileRevalidate: 7200, // +2 horas
    description: 'Dados estáticos (configurações, metadados)',
  },
  'no-cache': {
    sMaxAge: 0,
    staleWhileRevalidate: 0,
    description: 'Sem cache (auth, dados sensíveis)',
  },
};

/**
 * Adiciona HTTP Cache headers a um NextResponse
 *
 * @param response - NextResponse a ser modificado
 * @param strategy - Estratégia de cache
 * @param additionalHeaders - Headers adicionais opcionais
 * @returns NextResponse com headers de cache configurados
 *
 * @example
 * ```ts
 * const response = NextResponse.json({ data });
 * return withCacheHeaders(response, 'dynamic');
 * ```
 */
export function withCacheHeaders(
  response: NextResponse,
  strategy: CacheStrategy = 'dynamic',
  additionalHeaders?: Record<string, string>
): NextResponse {
  const config = CACHE_CONFIGS[strategy];

  if (strategy === 'no-cache') {
    // Sem cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  } else {
    // Com cache
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${config.sMaxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`
    );

    // Vary: indica quais headers afetam o cache
    response.headers.set('Vary', 'Accept-Encoding, Authorization');
  }

  // Metadados para debug
  response.headers.set('X-Cache-Strategy', strategy);

  // Headers adicionais
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

/**
 * Cria NextResponse com cache headers configurados
 *
 * @param data - Dados a serem retornados
 * @param strategy - Estratégia de cache
 * @param additionalHeaders - Headers adicionais opcionais
 * @returns NextResponse com cache headers
 *
 * @example
 * ```ts
 * return responseWithCache({ items, pagination }, 'dynamic');
 * ```
 */
export function responseWithCache(
  data: any,
  strategy: CacheStrategy = 'dynamic',
  additionalHeaders?: Record<string, string>
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        cacheStrategy: strategy,
      },
    },
    { status: 200 }
  );

  return withCacheHeaders(response, strategy, additionalHeaders);
}

/**
 * Headers específicos para Materialized Views
 * MVs são refreshadas a cada 5 minutos via pg_cron
 */
export function mvCacheHeaders() {
  return {
    'X-Source': 'materialized_view',
    'X-MV-Refresh': '5min', // Indicador de frequência de refresh
  };
}

/**
 * Calcula tempo de cache baseado em frequência de atualização de dados
 *
 * @param dataUpdateFrequencyMinutes - Frequência de atualização dos dados em minutos
 * @returns Estratégia de cache apropriada
 *
 * @example
 * ```ts
 * // MVs são refreshadas a cada 5 min → cache de 5 min
 * const strategy = getCacheStrategyByUpdateFrequency(5); // 'dynamic'
 * ```
 */
export function getCacheStrategyByUpdateFrequency(dataUpdateFrequencyMinutes: number): CacheStrategy {
  if (dataUpdateFrequencyMinutes === 0) return 'no-cache';
  if (dataUpdateFrequencyMinutes <= 5) return 'dynamic';
  if (dataUpdateFrequencyMinutes <= 15) return 'semi-static';
  return 'static';
}

/**
 * Headers para APIs que usam Materialized Views (refreshadas a cada 5 min)
 */
export const MV_CACHE_STRATEGY: CacheStrategy = 'dynamic'; // 5 min cache (sincronizado com refresh)

/**
 * Headers para APIs de dados em tempo real (sem MV)
 */
export const REAL_TIME_CACHE_STRATEGY: CacheStrategy = 'no-cache';

/**
 * Headers para APIs de count/aggregation
 */
export const AGGREGATION_CACHE_STRATEGY: CacheStrategy = 'dynamic';
