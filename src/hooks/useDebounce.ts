import { useState, useEffect } from 'react';

/**
 * Hook de debounce para otimizar buscas e reduzir queries desnecessárias
 *
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 500ms)
 * @returns Valor debounced
 *
 * @example
 * const SearchComponent = () => {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearch = useDebounce(searchTerm, 500);
 *
 *   useEffect(() => {
 *     // Apenas executa query após 500ms sem digitação
 *     if (debouncedSearch) {
 *       fetchResults(debouncedSearch);
 *     }
 *   }, [debouncedSearch]);
 *
 *   return <input onChange={(e) => setSearchTerm(e.target.value)} />
 * }
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Criar timer para atualizar valor após delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpar timeout se value mudar antes do delay
    // (isso previne múltiplas execuções)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook alternativo que retorna também um estado de "is debouncing"
 * Útil para mostrar loading indicators
 */
export function useDebouncedValue<T>(value: T, delay: number = 500) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return { debouncedValue, isDebouncing };
}
