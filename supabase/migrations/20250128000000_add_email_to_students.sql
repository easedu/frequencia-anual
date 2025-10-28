-- Migration: Adicionar campo email à tabela students
-- Data: 2025-01-28
-- Descrição: Adiciona coluna email (opcional) para armazenar email do estudante

-- Adicionar coluna email
ALTER TABLE students
ADD COLUMN IF NOT EXISTS email TEXT;

-- Comentário da coluna
COMMENT ON COLUMN students.email IS 'Email do estudante (opcional)';

-- Index para busca por email (caso necessário no futuro)
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email) WHERE email IS NOT NULL;
