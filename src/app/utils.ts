import { AnoLetivoData, BimesterDate, BimesterDates } from "@/types";
import { logger } from "@/utils/logger";

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

export function formatDataNascimento(data: string): string {
    const digits = data.replace(/\D/g, "");
    if (digits.length === 0) return "Nenhum";
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export function parseDateToFirebase(dateStr: string): string | null {
    const [day, month, year] = dateStr.split('/').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Se está em formato ISO (YYYY-MM-DD)
    if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
        // ✅ Usar Date.UTC para evitar problemas de timezone
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    // Se está em formato BR (DD/MM/YYYY)
    if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
        // ✅ Usar Date.UTC para evitar problemas de timezone
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    return null;
}

export function getBimesterByDate(dateStr: string, bimesterDates: BimesterDates): number {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) return 0;

    for (const [bimester, { start, end }] of Object.entries(bimesterDates) as [string, { start: string; end: string }][]) {
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

/**
 * MIGRADO PARA SUPABASE
 * Calcula dias letivos usando AcademicYearService
 */
export const calculateDiasLetivos = async (start: string, end: string): Promise<{ ateHoje: number; b1: number; b2: number; b3: number; b4: number; anual: number }> => {
    try {
        // Usar Supabase via AcademicYearService
        const { AcademicYearService } = await import('@/services/supabase/academicYearService');
        const currentYear = new Date().getFullYear();

        const startDateObj = parseDate(start);
        const endDateObj = parseDate(end) || new Date();
        if (!startDateObj || !endDateObj) {
            return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
        }

        // Buscar dados do ano letivo completo via Supabase
        const academicYearData = await AcademicYearService.getAcademicYearComplete(currentYear);
        if (!academicYearData) {
            return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
        }

        // Contar dias letivos por bimestre
        const totalsByBimester = { b1: 0, b2: 0, b3: 0, b4: 0 };

        const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];
        bimesterKeys.forEach((key, index) => {
            const bimesterData = academicYearData[key];
            if (bimesterData?.dates) {
                const count = bimesterData.dates.filter((day: any) => day.isChecked).length;
                if (index === 0) totalsByBimester.b1 = count;
                if (index === 1) totalsByBimester.b2 = count;
                if (index === 2) totalsByBimester.b3 = count;
                if (index === 3) totalsByBimester.b4 = count;
            }
        });

        // Contar dias até hoje no período especificado
        // Converter datas para formato DD/MM/YYYY que o AcademicYearService espera
        const startStr = `${startDateObj.getDate().toString().padStart(2, '0')}/${(startDateObj.getMonth() + 1).toString().padStart(2, '0')}/${startDateObj.getFullYear()}`;
        const endStr = `${endDateObj.getDate().toString().padStart(2, '0')}/${(endDateObj.getMonth() + 1).toString().padStart(2, '0')}/${endDateObj.getFullYear()}`;

        const totalAteHoje = await AcademicYearService.countSchoolDaysInPeriod(
            startStr,
            endStr,
            currentYear
        );

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
        logger.error("Erro ao calcular dias letivos (Supabase)", { start, end }, error as Error);
        return { ateHoje: 0, b1: 0, b2: 0, b3: 0, b4: 0, anual: 0 };
    }
};

/**
 * MIGRADO PARA SUPABASE
 * Obtém dias letivos no período usando AcademicYearService
 */
export async function getDiasLetivosNoPeriodo(startDate: Date, endDate: Date): Promise<string[]> {
    try {
        const { AcademicYearService } = await import('@/services/supabase/academicYearService');
        const currentYear = new Date().getFullYear();

        // Buscar dados do ano letivo completo via Supabase
        const academicYearData = await AcademicYearService.getAcademicYearComplete(currentYear);
        if (!academicYearData) {
            return [];
        }

        const diasLetivos: string[] = [];

        // Percorrer todos os bimestres (chaves do objeto)
        const bimesterKeys = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

        for (const key of bimesterKeys) {
            const bimesterData = academicYearData[key];
            if (bimesterData?.dates) {
                // Filtrar dias letivos marcados no período
                const bimesterDates = bimesterData.dates
                    .filter((day: any) => {
                        if (!day.isChecked) return false;

                        const date = parseDate(day.date);
                        return date && date >= startDate && date <= endDate;
                    })
                    .map((day: any) => day.date);

                diasLetivos.push(...bimesterDates);
            }
        }

        return diasLetivos;
    } catch (error) {
        logger.error("Erro ao obter dias letivos no período (Supabase)", { startDate: startDate.toISOString(), endDate: endDate.toISOString() }, error as Error);
        return [];
    }
};
