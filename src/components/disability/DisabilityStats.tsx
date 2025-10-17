/**
 * DisabilityStats Component
 *
 * Exibe estatísticas principais do dashboard de deficiência em cards coloridos.
 * Componente presentacional memoizado para performance.
 *
 * Extrai ~100 linhas do componente perfil-deficiente/page.tsx
 */

import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════

interface DisabilityStatsProps {
  totalComDeficienciaOficial: number;
  totalComDeficiencia: number;
  totalNaoMarcadosOficialmente: number;
  totalComBarreiras: number;
  totalComEstagiario: number;
  totalComAve: number;
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════

export const DisabilityStats = memo(function DisabilityStats({
  totalComDeficienciaOficial,
  totalComDeficiencia,
  totalNaoMarcadosOficialmente,
  totalComBarreiras,
  totalComEstagiario,
  totalComAve,
}: DisabilityStatsProps) {
  return (
    <>
      {/* Alerta Temporário - Estudantes não marcados oficialmente */}
      {totalNaoMarcadosOficialmente > 0 && (
        <Card className="mb-6 border-yellow-400 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
                ⚠️
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 mb-2">
                  🔧 MODO DE VISUALIZAÇÃO TEMPORÁRIO ATIVADO
                </h3>
                <p className="text-sm text-yellow-800 mb-2">
                  Esta página está exibindo{" "}
                  <strong>{totalComDeficiencia} estudantes</strong> que têm dados de deficiência
                  preenchidos:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 ml-4">
                  <li>
                    ✅ <strong>{totalComDeficienciaOficial}</strong> estudantes marcados
                    oficialmente como PCD (checkbox marcado)
                  </li>
                  <li>
                    ⚠️ <strong>{totalNaoMarcadosOficialmente}</strong> estudantes com dados de
                    deficiência preenchidos MAS não marcados oficialmente
                  </li>
                </ul>
                <p className="text-sm text-yellow-800 mt-3 font-medium">
                  📋 Revise se a quantidade total ({totalComDeficiencia}) faz sentido. Se sim,
                  podemos criar um script para marcar todos automaticamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total de Estudantes com Deficiência */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">
              Total com Deficiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalComDeficiencia}</div>
            <p className="text-xs text-blue-100 mt-1">estudantes</p>
          </CardContent>
        </Card>

        {/* Com Barreiras de Acesso */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">
              Com Barreiras de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalComBarreiras}</div>
            <p className="text-xs text-orange-100 mt-1">estudantes</p>
          </CardContent>
        </Card>

        {/* Com Estagiário */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Com Estagiário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalComEstagiario}</div>
            <p className="text-xs text-purple-100 mt-1">estudantes</p>
          </CardContent>
        </Card>

        {/* Com AVE */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Com AVE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalComAve}</div>
            <p className="text-xs text-green-100 mt-1">estudantes</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
});
