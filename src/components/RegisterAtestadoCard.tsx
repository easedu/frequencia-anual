import { useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Atestado } from "../app/types";
import { formatDateInput } from "../app/utils";
import { FileText, Calendar, Clock, Edit3, Plus, X, Save } from "lucide-react";

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
    id?: string;
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

    const handleCancel = () => {
        setEditingAtestado(null);
        setAtestadoStartDate("");
        setAtestadoDays("");
        setAtestadoDescription("");
    };

    return (
        <Card ref={atestadoCardRef} id={id} className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg py-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>{editingAtestado ? "Editar Atestado" : "Cadastrar Atestado"}</span>
                    </CardTitle>

                    {editingAtestado && (
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
                            <Label htmlFor="atestado-start-date" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-emerald-600" />
                                <span>Data de Início</span>
                            </Label>
                            <Input
                                id="atestado-start-date"
                                placeholder="dd/mm/aaaa"
                                value={atestadoStartDate}
                                onChange={(e) => setAtestadoStartDate(formatDateInput(e.target.value))}
                                maxLength={10}
                                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-colors h-9"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="atestado-days" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-emerald-600" />
                                <span>Dias de Validade</span>
                            </Label>
                            <Input
                                id="atestado-days"
                                type="number"
                                value={atestadoDays}
                                onChange={(e) => setAtestadoDays(e.target.value)}
                                placeholder="Número de dias"
                                min="1"
                                className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-colors h-9"
                            />
                        </div>
                    </div>

                    {/* Campo de Descrição */}
                    <div className="space-y-1">
                        <Label htmlFor="atestado-description" className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>Descrição</span>
                        </Label>
                        <Textarea
                            id="atestado-description"
                            value={atestadoDescription}
                            onChange={(e) => setAtestadoDescription(e.target.value)}
                            placeholder="Motivo do atestado médico..."
                            rows={3}
                            className="border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        <Button
                            onClick={editingAtestado ? onEditAtestado : onAddAtestado}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-200 flex items-center justify-center space-x-2 h-9"
                        >
                            {editingAtestado ? (
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

                        {editingAtestado && (
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