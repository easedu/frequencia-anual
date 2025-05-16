// RegisterOccurrenceCard.tsx
import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Occurrence } from "../app/types";
import { formatDateInput } from "../app/utils";

interface RegisterOccurrenceCardProps {
    occurrenceDate: string;
    occurrenceDescription: string;
    occurrenceSensitive: boolean;
    editingOccurrence: Occurrence | null;
    userRole: string | null;
    setOccurrenceDate: (value: string) => void;
    setOccurrenceDescription: (value: string) => void;
    setOccurrenceSensitive: (value: boolean) => void;
    setEditingOccurrence: (value: Occurrence | null) => void;
    onAddOccurrence: () => Promise<void>;
    onEditOccurrence: () => Promise<void>;
    id?: string;
}

export default function RegisterOccurrenceCard({
    occurrenceDate,
    occurrenceDescription,
    occurrenceSensitive,
    editingOccurrence,
    userRole,
    setOccurrenceDate,
    setOccurrenceDescription,
    setOccurrenceSensitive,
    setEditingOccurrence,
    onAddOccurrence,
    onEditOccurrence,
    id,
}: RegisterOccurrenceCardProps) {
    useEffect(() => {
        console.log("RegisterOccurrenceCard useEffect triggered, editingOccurrence:", editingOccurrence);
        if (editingOccurrence) {
            setOccurrenceDate(editingOccurrence.date);
            setOccurrenceDescription(editingOccurrence.description);
            setOccurrenceSensitive(editingOccurrence.sensitive || false);
        } else {
            setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
            setOccurrenceDescription("");
            setOccurrenceSensitive(false);
        }
    }, [editingOccurrence, setOccurrenceDate, setOccurrenceDescription, setOccurrenceSensitive]);

    const handleSensitiveChange = (checked: boolean | string) => {
        console.log("Checkbox onCheckedChange triggered, checked value:", checked);
        const isChecked = typeof checked === "boolean" ? checked : checked === "true";
        setOccurrenceSensitive(isChecked);
    };

    return (
        <Card id={id}>
            <CardHeader>
                <CardTitle>{editingOccurrence ? "Editar Ocorrência" : "Cadastrar Ocorrência"}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="occurrence-date">Data</Label>
                        <Input
                            id="occurrence-date"
                            value={occurrenceDate}
                            onChange={(e) => setOccurrenceDate(formatDateInput(e.target.value))}
                            placeholder="dd/mm/aaaa"
                            maxLength={10}
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <Label htmlFor="occurrence-description">Descrição</Label>
                    <Textarea
                        id="occurrence-description"
                        value={occurrenceDescription}
                        onChange={(e) => setOccurrenceDescription(e.target.value)}
                        placeholder="Descreva a ocorrência"
                        rows={4}
                    />
                </div>
                {userRole === "admin" && (
                    <div className="mt-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="occurrence-sensitive"
                                checked={occurrenceSensitive}
                                onCheckedChange={handleSensitiveChange}
                            />
                            <Label htmlFor="occurrence-sensitive">Marcar como sensível</Label>
                        </div>
                    </div>
                )}
                <div className="mt-4 flex gap-2">
                    <Button onClick={editingOccurrence ? onEditOccurrence : onAddOccurrence}>
                        {editingOccurrence ? "Salvar Alterações" : "Adicionar Ocorrência"}
                    </Button>
                    {editingOccurrence && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingOccurrence(null);
                                setOccurrenceDate(new Date().toLocaleDateString("pt-BR"));
                                setOccurrenceDescription("");
                                setOccurrenceSensitive(false);
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