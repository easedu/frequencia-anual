/**
 * Componentes de Loading Skeleton reutilizáveis
 * Usados para melhorar a perceived performance durante carregamento de dados
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

/**
 * Skeleton para Cards de KPI
 */
export function KPICardSkeleton() {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-lg py-3">
        <Skeleton className="h-6 w-32 bg-white/20" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para Tabela de Estudantes
 */
export function StudentTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header da tabela */}
      <div className="flex gap-2 p-4 bg-gray-50 rounded-lg">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Linhas da tabela */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 p-4 border-b">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para Card com Gráfico
 */
export function ChartCardSkeleton() {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-lg py-3">
        <Skeleton className="h-6 w-40 bg-white/20" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>

          {/* Área do gráfico */}
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para Lista de Interações
 */
export function InteractionListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton para Card de Frequência
 */
export function FrequencyCardSkeleton() {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-lg py-3">
        <Skeleton className="h-6 w-48 bg-white/20" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-3 w-16 mx-auto" />
                <Skeleton className="h-8 w-12 mx-auto" />
              </div>
            ))}
          </div>

          {/* Tabela de faltas por bimestre */}
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para Dashboard Grid (múltiplos cards)
 */
export function DashboardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para Formulário de Estudante
 */
export function StudentFormSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Seção de dados pessoais */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>

        {/* Seção de contatos */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton para Heatmap
 */
export function HeatmapSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para Lista de Tarefas
 */
export function TaskListSkeleton({ tasks = 5 }: { tasks?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: tasks }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton para Card de Alert/Warning
 */
export function AlertCardSkeleton() {
  return (
    <Card className="border-l-4 border-orange-500 shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para Filtros de Busca
 */
export function FiltersSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton para Stats/Métricas (row de números)
 */
export function StatsSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: stats }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton para Page Header
 */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton para Small Card (card compacto)
 */
export function SmallCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton para Grid de Cards Pequenos
 */
export function SmallCardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <SmallCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para Full Page Loading
 * Combina header + filtros + tabela
 */
export function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeaderSkeleton />
        <FiltersSkeleton />
        <StatsSkeleton />
        <Card className="p-6">
          <StudentTableSkeleton rows={10} />
        </Card>
      </div>
    </div>
  );
}
