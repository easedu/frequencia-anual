import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase.config';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { FIREBASE_PATHS } from '@/config/constants';

/**
 * API Route para limpeza de atestados duplicados
 *
 * Identificação de duplicatas:
 * - Mesmo startDate + days + description = duplicata
 *
 * Comportamento:
 * - dryRun=true: Apenas analisa e retorna duplicatas (sem deletar)
 * - dryRun=false: Deleta duplicatas (mantém o registro mais antigo por ID)
 *
 * Autenticação: API Key via header x-api-key
 *
 * Uso:
 * curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \
 *   -H "x-api-key: dev-api-key-change-in-production" \
 *   -H "Content-Type: application/json" \
 *   -d '{"estudanteId":"abc123","dryRun":true}'
 */

interface AtestadoData {
  id: string;
  ref: any;
  startDate: string;
  days: number;
  description: string;
  createdBy?: string;
}

interface DuplicateGroup {
  key: string;
  total: number;
  registros: Array<{
    id: string;
    createdBy?: string;
  }>;
  toRemove: string[];
  toKeep: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação: Verificar chave de API secreta (simples e sem dependências)
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.ADMIN_API_KEY || 'dev-api-key-change-in-production';

    if (!apiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'API key inválida ou ausente. Use header: x-api-key' },
        { status: 401 }
      );
    }

    // 2. Obter parâmetros
    const { estudanteId, dryRun = true } = await request.json();

    if (!estudanteId) {
      return NextResponse.json(
        { error: 'estudanteId é obrigatório' },
        { status: 400 }
      );
    }

    // 3. Buscar todos os atestados do estudante
    const atestadosSnapshot = await getDocs(
      collection(db, FIREBASE_PATHS.medicalCertificates(estudanteId))
    );

    const atestados: AtestadoData[] = atestadosSnapshot.docs.map(doc => ({
      id: doc.id,
      ref: doc.ref,
      startDate: doc.data().startDate as string,
      days: doc.data().days as number,
      description: doc.data().description as string,
      createdBy: doc.data().createdBy as string | undefined,
    }));

    // 4. Agrupar duplicatas
    const grupos = new Map<string, AtestadoData[]>();

    atestados.forEach((atestado) => {
      // Chave única: startDate + days + description
      const key = `${atestado.startDate}-${atestado.days}-${atestado.description}`;

      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key)!.push(atestado);
    });

    // 5. Identificar duplicatas
    const duplicatas: DuplicateGroup[] = [];
    const toRemove: AtestadoData[] = [];

    grupos.forEach((grupo, key) => {
      if (grupo.length > 1) {
        // Ordenar por ID (manter o mais antigo, assumindo IDs gerados sequencialmente)
        grupo.sort((a, b) => a.id.localeCompare(b.id));

        const toKeep = grupo[0];
        const toDelete = grupo.slice(1);

        duplicatas.push({
          key,
          total: grupo.length,
          registros: grupo.map(a => ({ id: a.id, createdBy: a.createdBy })),
          toRemove: toDelete.map(a => a.id),
          toKeep: toKeep.id,
        });

        toRemove.push(...toDelete);
      }
    });

    // 6. Se não for dry-run, remover duplicatas
    let removed = 0;
    if (!dryRun && toRemove.length > 0) {
      const batch = writeBatch(db);

      toRemove.forEach(atestado => {
        batch.delete(atestado.ref);
        removed++;
      });

      await batch.commit();
    }

    // 7. Retornar resultado
    return NextResponse.json({
      success: true,
      dryRun,
      estudanteId,
      totalAtestados: atestados.length,
      duplicatasEncontradas: duplicatas.length,
      registrosDuplicados: toRemove.length,
      duplicatasRemovidas: removed,
      duplicatas: duplicatas.map(d => ({
        ...d,
        detalhes: {
          startDate: atestados.find(a => a.id === d.toKeep)?.startDate,
          days: atestados.find(a => a.id === d.toKeep)?.days,
          description: atestados.find(a => a.id === d.toKeep)?.description,
        }
      })),
      message: dryRun
        ? `Análise concluída. ${duplicatas.length} grupo(s) de duplicatas encontrado(s) (${toRemove.length} registros duplicados). Use dryRun=false para remover.`
        : `Limpeza concluída. ${removed} registro(s) duplicado(s) removido(s) com sucesso.`,
    });

  } catch (error: any) {
    console.error('❌ Erro ao limpar duplicatas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao limpar duplicatas',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// Suportar GET para documentação
export async function GET() {
  return NextResponse.json({
    name: 'Clean Duplicate Atestados API',
    version: '1.0.0',
    description: 'Remove atestados duplicados (mesmo startDate, days e description)',
    authentication: 'Basic Auth',
    usage: {
      method: 'POST',
      endpoint: '/api/admin/clean-duplicate-atestados',
      headers: {
        'x-api-key': 'string (required) - Dev: dev-api-key-change-in-production',
        'Content-Type': 'application/json',
      },
      body: {
        estudanteId: 'string (required)',
        dryRun: 'boolean (optional, default: true)',
      },
      example: `curl -X POST http://localhost:3000/api/admin/clean-duplicate-atestados \\
  -H "x-api-key: dev-api-key-change-in-production" \\
  -H "Content-Type: application/json" \\
  -d '{"estudanteId":"e3d06f0c-35fa-420c-bacd-0e4f4749c37c","dryRun":true}'`,
    },
    quota_impact: {
      dry_run: '1 query + N docs reads (N = número de atestados)',
      real: '1 query + N docs reads + D writes (D = duplicatas removidas)',
      example_beatriz: '3 reads + 1 write (0.011% quota)',
    },
  });
}
