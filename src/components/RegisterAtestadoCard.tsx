import { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Atestado } from "../app/types";
import { formatDateInput } from "../app/utils";

interface RegisterAtestadoCardProps {
    atestadoStartDate: string;
    atestadoDays: string;
    atestadoDescription: string;
    editingAtestado: Atestado | null;
    setAtestadoStartDate: (value: string) => void;
    setAtestadoDays: (value: string) => void;
    setAtestadoDescription: (value: string) => void;
    setEditingAtestado: (value: Atestado | null) => void;
    onAddAtestado: () => Promise<void>;
    onEditAtestado: () => Promise<void>;
    id?: string; // Added optional id prop
}

export default function RegisterAtestadoCard({
    atestadoStartDate,
    atestadoDays,
    atestadoDescription,
    editingAtestado,
    setAtestadoStartDate,
    setAtestadoDays,
    setAtestadoDescription,
    setEditingAtestado,
    onAddAtestado,
    onEditAtestado,
    id,
}: RegisterAtestadoCardProps) {
    const atestadoCardRef = useRef<HTMLDivElement>(null);

    return (
        <Card ref={atestadoCardRef} id={id}>
            <CardHeader>
                <CardTitle>Cadastrar Atestado</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="atestado-start-date">Data de Início</Label>
                        <Input
                            id="atestado-start-date"
                            placeholder="dd/mm/aaaa"
                            value={atestadoStartDate}
                            onChange={(e) => setAtestadoStartDate(formatDateInput(e.target.value))}
                            maxLength={10}
                        />
                    </div>
                    <div>
                        <Label htmlFor="atestado-days">Dias de Validade</Label>
                        <Input
                            id="atestado-days"
                            type="number"
                            value={atestadoDays}
                            onChange={(e) => setAtestadoDays(e.target.value)}
                            placeholder="Digite o número de dias"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <Label htmlFor="atestado-description">Descrição</Label>
                    <Textarea
                        id="atestado-description"
                        value={atestadoDescription}
                        onChange={(e) => setAtestadoDescription(e.target.value)}
                        placeholder="Descreva o atestado"
                        rows={4}
                    />
                </div>
                <Button
                    onClick={editingAtestado ? onEditAtestado : onAddAtestado}
                    className="mt-4"
                >
                    {editingAtestado ? "Salvar Alterações" : "Adicionar Atestado"}
                </Button>
                {editingAtestado && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setEditingAtestado(null);
                            setAtestadoStartDate(new Date().toLocaleDateString("pt-BR"));
                            setAtestadoDays("");
                            setAtestadoDescription("");
                        }}
                        className="mt-4 ml-2"
                    >
                        Cancelar
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}