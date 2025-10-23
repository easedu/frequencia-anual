-- ============================================================================
-- FIX: Remover comparações JSONB != em predicados de índices
-- ============================================================================
-- Erro: "functions in index predicate must be marked IMMUTABLE"
-- Causa: disabilities != '[]'::jsonb usa operador != que não é IMMUTABLE
-- Solução: Remover comparação de igualdade, manter apenas IS NOT NULL
-- ============================================================================

-- Drop índices antigos com predicado problemático (se existirem)
DROP INDEX IF EXISTS idx_students_disabilities_gin;
DROP INDEX IF EXISTS idx_students_address_gin;

-- Recriar sem comparação !=
CREATE INDEX idx_students_disabilities_gin
  ON students USING gin(disabilities)
  WHERE disabilities IS NOT NULL;

CREATE INDEX idx_students_address_gin
  ON students USING gin(address)
  WHERE address IS NOT NULL;

COMMENT ON INDEX idx_students_disabilities_gin IS
'GIN index for JSONB search in disabilities field. Filters NULL values only.';

COMMENT ON INDEX idx_students_address_gin IS
'GIN index for JSONB search in address field. Filters NULL values only.';

-- ============================================================================
-- MENSAGEM
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Índices GIN corrigidos: removido != comparison, usando apenas IS NOT NULL';
END $$;
