// RegisterInteractionCard.tsx
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input"; // Verifique se este import está correto
import { FamilyInteraction } from "../app/types";
import { formatDateInput } from "../app/utils";

interface RegisterInteractionCardProps {
    interactionType: string;
    interactionDate: string;
    interactionDescription: string;
    interactionSensitive: boolean;
    editingInteraction: FamilyInteraction | null;
    userRole: string | null;
    setInteractionType: (value: string) => void;
    setInteractionDate: (value: string) => void;
    setInteractionDescription: (value: string) => void;
    setInteractionSensitive: (value: boolean) => void;
    setEditingInteraction: (value: FamilyInteraction | null) => void;
    onAddInteraction: () => Promise<void>;
    onEditInteraction: () => Promise<void>;
    id?: string;
}

export default function RegisterInteractionCard({
    interactionType,
    interactionDate,
    interactionDescription,
    interactionSensitive,
    editingInteraction,
    userRole,
    setInteractionType,
    setInteractionDate,
    setInteractionDescription,
    setInteractionSensitive,
    setEditingInteraction,
    onAddInteraction,
    onEditInteraction,
    id,
}: RegisterInteractionCardProps) {
    useEffect(() => {
        console.log("RegisterInteractionCard useEffect triggered, editingInteraction:", editingInteraction);
        if (editingInteraction) {
            setInteractionType(editingInteraction.type);
            setInteractionDate(editingInteraction.date);
            setInteractionDescription(editingInteraction.description);
            setInteractionSensitive(editingInteraction.sensitive || false);
        } else {
            setInteractionType("");
            setInteractionDate(new Date().toLocaleDateString("pt-BR"));
            setInteractionDescription("");
            setInteractionSensitive(false);
        }
    }, [editingInteraction, setInteractionType, setInteractionDate, setInteractionDescription, setInteractionSensitive]);

    const handleSensitiveChange = (checked: boolean | string) => {
        console.log("Checkbox onCheckedChange triggered, checked value:", checked);
        const isChecked = typeof checked === "boolean" ? checked : checked === "true";
        setInteractionSensitive(isChecked);
    };

    const interactionTypes = [
        'Contato telefônico',
        'Contato digital',
        'Conversa com a família',
        'Visita domiciliar da ABAE',
        'Compensação de ausência',
        'Carta registrada',
        'Conselho tutelar',
        'Desligamento',
        'Justificativa da família',
        'Observações'
    ];

    return (
        <Card id={id}>
            <CardHeader>
                <CardTitle>{editingInteraction ? "Editar Interação com a Família" : "Cadastrar Interação com a Família"}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="interaction-type">Tipo de Interação</Label>
                        <Select value={interactionType} onValueChange={setInteractionType}>
                            <SelectTrigger id="interaction-type">
                                <SelectValue placeholder="Selecione o tipo de interação" />
                            </SelectTrigger>
                            <SelectContent>
                                {interactionTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="interaction-date">Data</Label>
                        <Input
                            id="interaction-date"
                            value={interactionDate}
                            onChange={(e) => setInteractionDate(formatDateInput(e.target.value))}
                            placeholder="dd/mm/aaaa"
                            maxLength={10}
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <Label htmlFor="interaction-description">Descrição</Label>
                    <Textarea
                        id="interaction-description"
                        value={interactionDescription}
                        onChange={(e) => setInteractionDescription(e.target.value)}
                        placeholder="Descreva a interação"
                        rows={4}
                    />
                </div>
                {userRole === "admin" && (
                    <div className="mt-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="interaction-sensitive"
                                checked={interactionSensitive}
                                onCheckedChange={handleSensitiveChange}
                            />
                            <Label htmlFor="interaction-sensitive">Marcar como sensível</Label>
                        </div>
                    </div>
                )}
                <div className="mt-4 flex gap-2">
                    <Button onClick={editingInteraction ? onEditInteraction : onAddInteraction}>
                        {editingInteraction ? "Salvar Alterações" : "Adicionar Interação"}
                    </Button>
                    {editingInteraction && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingInteraction(null);
                                setInteractionType("");
                                setInteractionDate(new Date().toLocaleDateString("pt-BR"));
                                setInteractionDescription("");
                                setInteractionSensitive(false);
                            }}
                        >
                            Cancelar
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}