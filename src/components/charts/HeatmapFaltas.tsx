import { useMemo } from "react";
import { getHeatmapColor } from "@/utils/attendanceUtils";

interface HeatmapData {
    turma: string;
    b1: number;
    b2: number;
    b3: number;
    b4: number;
}

interface HeatmapFaltasProps {
    heatmapData: HeatmapData[];
}

export default function HeatmapFaltas({ heatmapData }: HeatmapFaltasProps) {
    const maxHeatmapValue = useMemo(
        () => Math.max(...heatmapData.flatMap(d => [d.b1, d.b2, d.b3, d.b4])),
        [heatmapData]
    );

    const totals = useMemo(
        () =>
            heatmapData.reduce(
                (acc, row) => ({
                    b1: acc.b1 + row.b1,
                    b2: acc.b2 + row.b2,
                    b3: acc.b3 + row.b3,
                    b4: acc.b4 + row.b4,
                }),
                { b1: 0, b2: 0, b3: 0, b4: 0 }
            ),
        [heatmapData]
    );

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" aria-label="Heatmap de Faltas por Turma e Bimestre">
                <thead>
                    <tr>
                        <th className="border p-2">Turma</th>
                        <th className="border p-2">1º Bim</th>
                        <th className="border p-2">2º Bim</th>
                        <th className="border p-2">3º Bim</th>
                        <th className="border p-2">4º Bim</th>
                    </tr>
                </thead>
                <tbody>
                    {heatmapData.map(row => (
                        <tr key={row.turma}>
                            <td className="border p-2 text-center">{row.turma}</td>
                            {["b1", "b2", "b3", "b4"].map(key => {
                                const value = row[key as keyof HeatmapData] as number;
                                return (
                                    <td
                                        key={key}
                                        className="border p-2 text-center"
                                        style={{ backgroundColor: getHeatmapColor(value, maxHeatmapValue) }}
                                    >
                                        {value}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold">
                        <td className="border p-2 text-center">Total</td>
                        <td
                            className="border p-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(totals.b1, maxHeatmapValue) }}
                        >
                            {totals.b1}
                        </td>
                        <td
                            className="border p-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(totals.b2, maxHeatmapValue) }}
                        >
                            {totals.b2}
                        </td>
                        <td
                            className="border p-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(totals.b3, maxHeatmapValue) }}
                        >
                            {totals.b3}
                        </td>
                        <td
                            className="border p-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(totals.b4, maxHeatmapValue) }}
                        >
                            {totals.b4}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}