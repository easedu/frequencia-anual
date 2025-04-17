import { db } from "@/firebase.config";
import { doc, getDoc } from "firebase/firestore";
import { AnoLetivoData, BimesterDate, BimesterDates } from "./types";

export function formatFirebaseDate(dateStr: string | undefined): string {
    if (!dateStr || typeof dateStr !== "string") return "01/01/1970";
    const [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "01/01/1970";
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

export function formatDateInput(value: string): string {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

export function formatPhoneNumber(value: string | undefined): string {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

export function formatCep(cep: string | undefined): string {
    if (!cep) return '';
    const digits = cep.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

interface Endereco {
    rua?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
}

export function formatAddress(endereco?: Endereco): string {
    if (!endereco) return 'Nenhum';
    const { rua, numero, complemento, bairro, cidade, estado, cep } = endereco;
    const parts = [
        rua || '',
        numero ? `nº ${numero}` : '',
        complemento ? `, ${complemento}` : '',
        bairro || '',
        cidade && estado ? `${cidade}-${estado}` : cidade || estado || '',
        cep ? formatCep(cep) : '',
    ].filter(part => part.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : 'Nenhum';
}

export function parseDateToFirebase(dateStr: string): string | null {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parseDate(dateStr: string): Date | null {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
}

export function getBimesterByDate(dateStr: string, bimesterDates: BimesterDates): number {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) return 0;

    for (const [bimester, { start, end }] of Object.entries(bimesterDates)) {
        const startDate = parseDate(start);
        const endDate = parseDate(end);
        if (startDate && endDate && date >= startDate && date <= endDate) {
            return Number(bimester);
        }
    }
    return 0;
}

export function getFrequencyColor(percentual: number): string {
    if (percentual >= 81 && percentual <= 100) return "text-green-600 text-center";
    else if (percentual >= 75 && percentual <= 80) return "text-yellow-600 text-center";
    else return "text-red-600 text-center";
}

export const calculateDiasLetivos = async (start: string, end: string): Promise<{ ateHoje: number; b1: number; b2: number; b3: number; b4: number; anual: number }> => {
    try {
        const docRef = doc(db, "2025", "ano_letivo");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
        }

        const anoData = docSnap.data() as AnoLetivoData;
        const startDateObj = parseDate(start);
        const endDateObj = parseDate(end) || new Date();
        if (!startDateObj || !endDateObj) {
            return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
        }

        let totalAteHoje = 0;
        const totalsByBimester: { b1: number; b2: number; b3: number; b4: number } = { b1: 0, b2: 0, b3: 0, b4: 0 };
        const bimesters: (keyof AnoLetivoData)[] = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

        for (let i = 0; i < bimesters.length; i++) {
            const bimesterKey = bimesters[i];
            if (anoData[bimesterKey]?.dates) {
                const bimesterStart = parseDate(anoData[bimesterKey].startDate);
                const bimesterEnd = parseDate(anoData[bimesterKey].endDate);
                if (!bimesterStart || !bimesterEnd) continue;

                const bimesterCount = anoData[bimesterKey].dates.filter((d: BimesterDate) => {
                    const date = parseDate(d.date);
                    return d.isChecked && date && date >= bimesterStart && date <= bimesterEnd;
                }).length;

                if (i === 0) totalsByBimester.b1 = bimesterCount;
                if (i === 1) totalsByBimester.b2 = bimesterCount;
                if (i === 2) totalsByBimester.b3 = bimesterCount;
                if (i === 3) totalsByBimester.b4 = bimesterCount;
            }
        }

        for (const bimesterKey of bimesters) {
            if (anoData[bimesterKey]?.dates) {
                totalAteHoje += anoData[bimesterKey].dates.filter((d: BimesterDate) => {
                    const date = parseDate(d.date);
                    return d.isChecked && date && date >= startDateObj && date <= endDateObj;
                }).length;
            }
        }

        const totalAnual = totalsByBimester.b1 + totalsByBimester.b2 + totalsByBimester.b3 + totalsByBimester.b4;

        return {
            ateHoje: totalAteHoje,
            b1: totalsByBimester.b1,
            b2: totalsByBimester.b2,
            b3: totalsByBimester.b3,
            b4: totalsByBimester.b4,
            anual: totalAnual,
        };
    } catch (error) {
        console.error("Erro ao calcular dias letivos:", error);
        return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
    }
};