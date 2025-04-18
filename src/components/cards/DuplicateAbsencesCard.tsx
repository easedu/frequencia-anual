import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AbsenceRecord {
    estudanteId: string;
    turma: string;
    data: string;
    docId: string;
    justified: boolean;
}

interface DuplicateAbsencesCardProps {
    duplicateAbsences: AbsenceRecord[];
    removeDuplicateAbsences: () => Promise<void>;
}

export default function DuplicateAbsencesCard({
    duplicateAbsences,
    removeDuplicateAbsences,
}: DuplicateAbsencesCardProps) {
    return (
        <Card role="region" aria-label="Registros de Faltas Duplicados">
            <CardHeader>
                <CardTitle>Registros de Faltas Duplicados</CardTitle>
            </CardHeader>
            <CardContent>
                {duplicateAbsences.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm" aria-label="Faltas Duplicadas">
                                <thead>
                                    <tr>
                                        <th className="border p-2">ID do Documento</th>
                                        <th className="border p-2">Estudante ID</th>
                                        <th className="border p-2">Turma</th>
                                        <th className="border p-2">Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duplicateAbsences.map((record, index) => (
                                        <tr key={index}>
                                            <td className="border p-2">{record.docId}</td>
                                            <td className="border p-2">{record.estudanteId}</td>
                                            <td className="border p-2">{record.turma}</td>
                                            <td className="border p-2">{record.data}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button
                            onClick={removeDuplicateAbsences}
                            className="mt-4 bg-red-500 hover:bg-red-600"
                            aria-label="Remover registros duplicados"
                        >
                            Remover Duplicatas
                        </Button>
                    </>
                ) : (
                    <p>Nenhum registro de falta duplicado encontrado.</p>
                )}
            </CardContent>
        </Card>
    );
}