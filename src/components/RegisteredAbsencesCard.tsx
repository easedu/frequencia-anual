import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AbsenceRecord, Atestado, BimesterDates } from "../app/types";
import { getBimesterByDate } from "../app/utils";

interface RegisteredAbsencesCardProps {
    absences: AbsenceRecord[];
    atestados: Atestado[];
    bimesterDates: BimesterDates;
}

interface BimestreAbsencesProps {
    title: string;
    bimester: number;
    absences: AbsenceRecord[];
    atestados: Atestado[];
    bimesterDates: BimesterDates;
}

const BimestreAbsences: React.FC<BimestreAbsencesProps> = ({ title, bimester, absences, atestados, bimesterDates }) => {
    const filteredAbsences = absences.filter((absence) => getBimesterByDate(absence.data, bimesterDates) === bimester);

    return (
        <div>
            <h3 className="text-lg font-semibold mb-2 text-left">{title}</h3>
            {filteredAbsences.map((absence, index) => (
                <TooltipProvider key={index}>
                    <Tooltip>
                        <div className="grid grid-cols-[100px,50px] items-center min-h-[24px] mb-1 mx-auto">
                            <p className={`text-sm text-center ${absence.justified ? 'text-green-600' : ''}`}>
                                {absence.data}
                            </p>
                            {absence.justified ? (
                                <TooltipTrigger asChild>
                                    <span className="inline-flex items-center justify-center bg-green-500 text-white text-[10px] px-1 py-0.5 rounded">
                                        Atestado
                                    </span>
                                </TooltipTrigger>
                            ) : (
                                <span></span>
                            )}
                        </div>
                        {absence.justified && absence.atestadoId && (
                            <TooltipContent className="p-1 text-xs max-w-[200px]">
                                <p>
                                    Atestado: {atestados.find(a => a.id === absence.atestadoId)?.description || 'Sem descrição'}<br />
                                    Início: {atestados.find(a => a.id === absence.atestadoId)?.startDate || ''}<br />
                                    Dias: {atestados.find(a => a.id === absence.atestadoId)?.days || ''}<br />
                                    Criado por: {atestados.find(a => a.id === absence.atestadoId)?.createdBy || ''}
                                </p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            ))}
        </div>
    );
};

export default function RegisteredAbsencesCard({ absences, atestados, bimesterDates }: RegisteredAbsencesCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Faltas Registradas</CardTitle>
            </CardHeader>
            <CardContent>
                {absences.length > 0 && Object.keys(bimesterDates).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <BimestreAbsences title="1º Bimestre" bimester={1} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                        <BimestreAbsences title="2º Bimestre" bimester={2} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                        <BimestreAbsences title="3º Bimestre" bimester={3} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                        <BimestreAbsences title="4º Bimestre" bimester={4} absences={absences} atestados={atestados} bimesterDates={bimesterDates} />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center">Nenhuma falta registrada ou períodos de bimestre não carregados.</p>
                )}
            </CardContent>
        </Card>
    );
}