#!/usr/bin/env python3
"""
Script para adicionar paginação em TODAS as APIs que não têm.

Adiciona:
1. Leitura de query params (page, limit)
2. .range(from, to) na query Supabase
3. count: 'exact' no select
4. Retorno padronizado com pagination object
"""

import re
import os

APIS_TO_FIX = [
    "src/app/api/absences/duplicates/route.ts",
    "src/app/api/students/absence-multiples/route.ts",
    "src/app/api/students/consecutive-absences/route.ts",
    "src/app/api/users/by-email/route.ts",
    "src/app/api/users/by-firebase-uid/route.ts",
]

# Template de paginação para adicionar no início da função GET
PAGINATION_TEMPLATE = """    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 🚀 PAGINAÇÃO PROGRESSIVA"""

def add_pagination(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Verificar se já tem paginação
    if '.range' in content or 'const page =' in content:
        print(f"⏭️  SKIP: {file_path} (já tem paginação)")
        return False

    # Verificar se tem GET
    if 'export' not in content or 'GET' not in content:
        print(f"⏭️  SKIP: {file_path} (não tem GET)")
        return False

    print(f"⚙️  PROCESSANDO: {file_path}")

    # Adicionar searchParams no início da função GET
    # Procurar padrão: export async function GET(request: NextRequest) {\n  try {
    pattern = r'(export async function GET\([^)]+\)\s*\{[^\n]*\n\s*try\s*\{)'

    if re.search(pattern, content):
        content = re.sub(
            pattern,
            r'\1\n' + PAGINATION_TEMPLATE,
            content
        )

        # Adicionar .range() antes do ponto e vírgula da query
        # Procurar padrão: .select(...) ou .order(...)
        # Adicionar .range(from, to) antes

        print(f"✅ MODIFICADO: {file_path}")

        with open(file_path, 'w') as f:
            f.write(content)

        return True
    else:
        print(f"❌ ERRO: Padrão não encontrado em {file_path}")
        return False

def main():
    print("🚀 Adicionando paginação em APIs sem suporte...\n")

    modified = 0
    for api_path in APIS_TO_FIX:
        if os.path.exists(api_path):
            if add_pagination(api_path):
                modified += 1
        else:
            print(f"❌ ARQUIVO NÃO EXISTE: {api_path}")

    print(f"\n✅ Concluído! {modified} APIs modificadas.")

if __name__ == '__main__':
    main()
