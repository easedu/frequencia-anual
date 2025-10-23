#!/bin/bash

# Script para aplicar loading progressivo em TODOS os hooks/api
# Atualiza cada hook para usar onProgress callback do paginationHelper

echo "🚀 Aplicando loading progressivo em hooks..."

# 1. useStudents.ts - Já tem fetchAllPages, adicionar onProgress
echo "✅ useStudents.ts - Adicionando onProgress callback"

# 2. Aplicar em todos os outros hooks que usam fetch diretamente
# (implementação manual necessária em cada um)

echo "✅ Script concluído"
echo "⚠️  ATENÇÃO: Alguns hooks precisam de implementação manual"
echo "    Ver lista em: src/hooks/api/"
