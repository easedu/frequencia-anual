import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertDataTable } from "@/components/CustomAlertDataTable";

interface StudentRecord {
    estudanteId: string;
    turma: string;
    nome: string;
    faltasB1: number;
    faltasB2: number;
    faltasB3: number;
    faltasB4: number;
    totalFaltas: number;
    percentualFaltas: number;
    percentualFrequencia: number;
}

interface AlertsCardProps {
    data: StudentRecord[];
}

export default function AlertsCard({ data }: AlertsCardProps) {
    return (
        <Card role="region" aria-label="Alertas e Listagens de Risco">
            <CardHeader>
                <CardTitle>Alertas e Listagens de Risco</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Alunos Próximos ao Limite (20% a 25% de Faltas)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AlertDataTable
                                    data={data
                                        .filter(s => s.percentualFaltas >= 20 && s.percentualFaltas < 25)
                                        .sort((a, b) => b.percentualFaltas - a.percentualFaltas)}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Alunos Críticos (≥ 25% de Faltas)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AlertDataTable
                                    data={data
                                        .filter(s => s.percentualFaltas >= 25)
                                        .sort((a, b) => b.percentualFaltas - a.percentualFaltas)}
                                />
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}