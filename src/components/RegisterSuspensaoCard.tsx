import { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Suspensao } from "../app/types";
import { formatDateInput } from "../app/utils";
import { AlertCircle, Calendar, Clock, Edit3, Plus, X, Save } from "lucide-react";

interface RegisterSuspensaoCardProps {
    suspensaoStartDate: string;
    suspensaoDays: string;
    suspensaoDescription: string;
    editingSuspensao: Suspensao | null;
    setSuspensaoStartDate: (value: string) => void;
    setSuspensaoDays: (value: string) => void;
    setSuspensaoDescription: (value: string) => void;
    setEditingSuspensao: (value: Suspensao | null) => void;
    onAddSuspensao: () => Promise<void>;
    onEditSuspensao: () => Promise<void>;
    id?: string;
}

export default function RegisterSuspensaoCard({
    suspensaoStartDate,
    suspensaoDays,
    suspensaoDescription,
    editingSuspensao,
    setSuspensaoStartDate,
    setSuspensaoDays,
    setSuspensaoDescription,
    setEditingSuspensao,
    onAddSuspensao,
    onEditSuspensao,
    id,
}: RegisterSuspensaoCardProps) {
    const suspensaoCardRef = useRef<HTMLDivElement>(null);

    const handleCancel = () => {
        setEditingSuspensao(null);
        setSuspensaoStartDate("");
        setSuspensaoDays("");
        setSuspensaoDescription("");
    };

    return (
        <Card ref={suspensaoCardRef} id={id} className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg py-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>{editingSuspensao ? "Editar Suspensão" : "Cadastrar Suspensão"}</span>
                    </CardTitle>

                    {editingSuspensao && (
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />
                            Editando
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4">
                <div className="space-y-4">
                    {/* Campos de Data e Dias */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="suspensao-start-date" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-orange-600" />
                                <span>Data de Início</span>
                            </Label>
                            <Input
                                id="suspensao-start-date"
                                placeholder="dd/mm/aaaa"
                                value={suspensaoStartDate}
                                onChange={(e) => setSuspensaoStartDate(formatDateInput(e.target.value))}
                                maxLength={10}
                                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 transition-colors h-9"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="suspensao-days" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-orange-600" />
                                <span>Dias de Suspensão</span>
                            </Label>
                            <Input
                                id="suspensao-days"
                                type="number"
                                value={suspensaoDays}
                                onChange={(e) => setSuspensaoDays(e.target.value)}
                                placeholder="Número de dias"
                                min="1"
                                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 transition-colors h-9"
                            />
                        </div>
                    </div>

                    {/* Campo de Descrição */}
                    <div className="space-y-1">
                        <Label htmlFor="suspensao-description" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3 text-orange-600" />
                            <span>Descrição/Motivo</span>
                        </Label>
                        <Textarea
                            id="suspensao-description"
                            value={suspensaoDescription}
                            onChange={(e) => setSuspensaoDescription(e.target.value)}
                            placeholder="Motivo da suspensão..."
                            rows={3}
                            className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        <Button
                            onClick={editingSuspensao ? onEditSuspensao : onAddSuspensao}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white transition-colors duration-200 flex items-center justify-center space-x-2 h-9"
                        >
                            {editingSuspensao ? (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Salvar</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Adicionar</span>
                                </>
                            )}
                        </Button>

                        {editingSuspensao && (
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
