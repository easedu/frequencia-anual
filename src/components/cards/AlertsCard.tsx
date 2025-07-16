import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertDataTable, EnhancedStudentRecord } from "@/components/CustomAlertDataTable";
import { Estudante } from "@/hooks/useStudents";

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

// Tipo estendido que inclui informações de deficiência - agora usando a interface do componente
interface StudentRecordWithDisability extends EnhancedStudentRecord { }

interface AlertsCardProps {
    data: StudentRecord[];
    students?: Estudante[]; // Lista de estudantes com informações completas
}

export default function AlertsCard({ data, students = [] }: AlertsCardProps) {
    // Função para enriquecer os dados de frequência com informações de deficiência
    const enrichDataWithDisability = (frequencyData: StudentRecord[]): StudentRecordWithDisability[] => {
        return frequencyData.map(student => {
            const studentInfo = students.find(s => s.estudanteId === student.estudanteId);

            return {
                ...student,
                temDeficiencia: studentInfo?.deficiencia?.estudanteComDeficiencia || false,
                tipoDeficiencia: studentInfo?.deficiencia?.tipoDeficiencia || []
            };
        });
    };

    // Função para filtrar estudantes por range de frequência e enriquecer com dados de deficiência
    const filterAndEnrichStudents = (
        frequencyData: StudentRecord[],
        targetRange: { min: number; max?: number }
    ): StudentRecordWithDisability[] => {
        // Primeiro filtra por range de frequência, depois enriquece com dados de deficiência
        const studentsInRange = frequencyData.filter(s => {
            if (targetRange.max !== undefined) {
                return s.percentualFaltas >= targetRange.min && s.percentualFaltas < targetRange.max;
            } else {
                return s.percentualFaltas >= targetRange.min;
            }
        });

        // Enriquece os dados filtrados com informações de deficiência
        return enrichDataWithDisability(studentsInRange);
    };

    const nearLimitStudents = filterAndEnrichStudents(data, { min: 20, max: 25 })
        .sort((a, b) => b.percentualFaltas - a.percentualFaltas);

    const criticalStudents = filterAndEnrichStudents(data, { min: 25 })
        .sort((a, b) => b.percentualFaltas - a.percentualFaltas);

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
                                <CardTitle>
                                    Alunos Próximos ao Limite (20% a 25% de Faltas)
                                    {nearLimitStudents.some(s => s.temDeficiencia) && (
                                        <span className="text-sm font-normal text-blue-600 ml-2">
                                            • Inclui estudantes com deficiência
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AlertDataTable data={nearLimitStudents} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Alunos Críticos (≥ 25% de Faltas)
                                    {criticalStudents.some(s => s.temDeficiencia) && (
                                        <span className="text-sm font-normal text-blue-600 ml-2">
                                            • Inclui estudantes com deficiência
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AlertDataTable data={criticalStudents} />
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}