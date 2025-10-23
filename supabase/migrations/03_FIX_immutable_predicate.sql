-- ============================================================================
-- FIX: Remover índices com predicados não-IMMUTABLE
-- ============================================================================
-- Erro: "functions in index predicate must be marked IMMUTABLE"
-- Causa: WHERE status IN (...) não é IMMUTABLE
-- Solução: Criar índices separados para cada status OU remover WHERE clause
-- ============================================================================

-- ============================================================================
-- OPÇÃO 1: Índices sem WHERE (mais genéricos mas funcionam)
-- ============================================================================

-- Medical Certificates: Status + Date (SEM WHERE IN)
CREATE INDEX IF NOT EXISTS idx_certificates_status_date
  ON medical_certificates(status, submitted_date DESC);

-- ============================================================================
-- OPÇÃO 2: Índices específicos para cada status (mais otimizados)
-- ============================================================================

-- Certificates: Apenas PENDING
CREATE INDEX IF NOT EXISTS idx_certificates_pending_only
  ON medical_certificates(student_id, submitted_date)
  WHERE status = 'PENDING';

-- Certificates: Apenas UNDER_REVIEW
CREATE INDEX IF NOT EXISTS idx_certificates_under_review_only
  ON medical_certificates(student_id, submitted_date)
  WHERE status = 'UNDER_REVIEW';

COMMENT ON INDEX idx_certificates_pending_only IS
'Partial index for pending certificates only. Smaller and faster for approval queue.';

COMMENT ON INDEX idx_certificates_under_review_only IS
'Partial index for certificates under review. Smaller and faster for review queue.';

-- ============================================================================
-- MENSAGEM
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Índices corrigidos: removed IN predicate, using separate indexes';
END $$;
