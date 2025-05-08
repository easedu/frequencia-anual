import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Student } from "../app/types";
import { formatAddress, formatPhoneNumber, formatDataNascimento } from "../app/utils";

interface StudentInfoCardProps {
    student: Student;
}

export default function StudentInfoCard({ student }: StudentInfoCardProps) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Informações do Aluno</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <Label>Nome</Label>
                        <p className="text-lg font-semibold">{student.nome}</p>
                    </div>
                    <div>
                        <Label>Turma</Label>
                        <p className="text-lg font-semibold">{student.turma}</p>
                    </div>
                    <div>
                        <Label>Bolsa Família</Label>
                        <p className="text-lg font-semibold">{student.bolsaFamilia}</p>
                    </div>
                    <div>
                        <Label>Status</Label>
                        <p className="text-lg font-semibold">{student.status}</p>
                    </div>
                    <div>
                        <Label>Turno</Label>
                        <p className="text-lg font-semibold">{student.turno}</p>
                    </div>
                    <div>
                        <Label>Data de Nascimento</Label>
                        <p className="text-lg font-semibold">{student.dataNascimento ? formatDataNascimento(student.dataNascimento) : "Nenhum"}</p>
                    </div>
                    <div>
                        <Label>E-mail</Label>
                        <p className="text-lg font-semibold">{student.email || "Nenhum"}</p>
                    </div>
                    <div className="md:col-span-3">
                        <Label>Endereço</Label>
                        <p className="text-lg font-semibold">{formatAddress(student.endereco)}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                    <div>
                        <Label>Contatos</Label>
                        <p className="text-lg font-semibold">
                            {student.contatos && student.contatos.length > 0
                                ? student.contatos
                                    .map((contato) => `${contato.nome}: ${formatPhoneNumber(contato.telefone)}`)
                                    .join(" / ")
                                : "Nenhum"}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}