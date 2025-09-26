import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, X, Calendar, MessageSquare, AlertTriangle, Edit3 } from "lucide-react";
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
    readonlyType?: boolean; // Nova prop para tornar o tipo não editável
    allowedTypes?: string[]; // Tipos de interação permitidos (quando não readonly)
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
    readonlyType = false,
    allowedTypes,
}: RegisterInteractionCardProps) {
    useEffect(() => {
        if (editingInteraction) {
            setInteractionType(editingInteraction.type);
            setInteractionDate(editingInteraction.date);
            setInteractionDescription(editingInteraction.description);
            setInteractionSensitive(editingInteraction.sensitive || false);
        }
        // Não limpar campos se editingInteraction for null/undefined
        // Isso permite que o componente seja usado em modais sem resetar
    }, [editingInteraction, setInteractionType, setInteractionDate, setInteractionDescription, setInteractionSensitive]);

    const handleSensitiveChange = (checked: boolean | string) => {
        const isChecked = typeof checked === "boolean" ? checked : checked === "true";
        setInteractionSensitive(isChecked);
    };

    const handleCancel = () => {
        setEditingInteraction(null);
        setInteractionType("");
        setInteractionDate(new Date().toLocaleDateString("pt-BR"));
        setInteractionDescription("");
        setInteractionSensitive(false);
    };

    // Usar tipos permitidos se fornecidos, senão usar lista completa
    const interactionTypes = allowedTypes || [
        'Contato telefônico',
        'Contato digital',
        'Conversa com a família',
        'Visita domiciliar da ABAE',
        'Compensação de ausência',
        'Carta registrada',
        'Conselho tutelar',
        'Desligamento',
        'Justificativa da família',
        'Necessário acompanhamento da família',
        'Observações'
    ];

    return (
        <Card id={id} className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg py-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center space-x-2">
                        {editingInteraction ? (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Editar Interação</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                <span>Nova Interação</span>
                            </>
                        )}
                    </CardTitle>

                    {editingInteraction && (
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Editando
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="interaction-type" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                <MessageSquare className="w-3 h-3 text-blue-600" />
                                <span>Tipo de Interação</span>
                            </Label>
                            {readonlyType ? (
                                <div className="h-9 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                                    <span className="text-sm text-gray-700">{interactionType}</span>
                                    <Badge className="ml-2 bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                        Fixo
                                    </Badge>
                                </div>
                            ) : (
                                <Select value={interactionType} onValueChange={setInteractionType}>
                                    <SelectTrigger id="interaction-type" className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors">
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {interactionTypes.map((type) => (
                                            <SelectItem key={type} value={type} className="text-sm">
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="interaction-date" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-blue-600" />
                                <span>Data</span>
                            </Label>
                            <Input
                                id="interaction-date"
                                value={interactionDate}
                                onChange={(e) => setInteractionDate(formatDateInput(e.target.value))}
                                placeholder="dd/mm/aaaa"
                                maxLength={10}
                                className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="interaction-description" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3 text-blue-600" />
                            <span>Descrição</span>
                        </Label>
                        <Textarea
                            id="interaction-description"
                            value={interactionDescription}
                            onChange={(e) => setInteractionDescription(e.target.value)}
                            placeholder="Descreva a interação com a família..."
                            rows={3}
                            className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                        />
                    </div>

                    {userRole === "admin" && (
                        <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                            <Checkbox
                                id="interaction-sensitive"
                                checked={interactionSensitive}
                                onCheckedChange={handleSensitiveChange}
                                className="border-amber-300 text-amber-600 focus:ring-amber-500"
                            />
                            <Label htmlFor="interaction-sensitive" className="text-sm flex items-center space-x-2 cursor-pointer font-medium text-amber-800">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                <span>Marcar como sensível</span>
                            </Label>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        <Button
                            onClick={editingInteraction ? onEditInteraction : onAddInteraction}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 flex items-center justify-center space-x-2 h-9"
                        >
                            {editingInteraction ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Salvar Alterações</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Adicionar Interação</span>
                                </>
                            )}
                        </Button>

                        {editingInteraction && (
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                className="flex-1 sm:flex-initial border-gray-300 hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-2 h-9"
                            >
                                <X className="w-4 h-4" />
                                <span>Cancelar</span>
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}