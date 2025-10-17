/**
 * DisabilityCharts Component
 *
 * Renderiza 6 gráficos de pizza (PieCharts) para análise de deficiência.
 * Componente presentacional memoizado. Consolida ~300 linhas de código repetitivo.
 */

import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartData } from "@/hooks/useDisabilityProfile";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

interface DisabilityChartsProps {
  tiposDeficienciaData: ChartData[];
  aeeData: ChartData[];
  instituicaoData: ChartData[];
  horarioData: ChartData[];
  estagiarioData: ChartData[];
  aveData: ChartData[];
}

// Componente auxiliar para renderizar um chart individual
const ChartCard = memo(function ChartCard({
  title,
  data,
}: {
  title: string;
  data: ChartData[];
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export const DisabilityCharts = memo(function DisabilityCharts({
  tiposDeficienciaData,
  aeeData,
  instituicaoData,
  horarioData,
  estagiarioData,
  aveData,
}: DisabilityChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <ChartCard title="Tipo de Deficiência" data={tiposDeficienciaData} />
      <ChartCard title="Instituição de Apoio" data={instituicaoData} />
      <ChartCard title="AEE (PAEE/PAAI)" data={aeeData} />
      <ChartCard title="Horário de Atendimento" data={horarioData} />
      <ChartCard title="Justificativa Estagiário" data={estagiarioData} />
      <ChartCard title="Justificativa AVE" data={aveData} />
    </div>
  );
});
