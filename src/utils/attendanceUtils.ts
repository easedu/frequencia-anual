export function getBimesterByDate(dateStr: string, bimesterDates: { [key: number]: { start: string; end: string } }): number {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) {
        console.error("Data inválida:", dateStr);
        return 0;
    }

    for (const [bimester, { start, end }] of Object.entries(bimesterDates)) {
        const startDate = parseDate(start);
        const endDate = parseDate(end);
        if (startDate && endDate && date >= startDate && date <= endDate) {
            return Number(bimester);
        }
    }
    return 0;
}

export function formatDateInput(value: string): string {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

export function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    let [day, month, year] = [0, 0, 0];
    if (dateStr.includes("/")) {
        [day, month, year] = dateStr.split("/").map(Number);
    } else if (dateStr.includes("-")) {
        [year, month, day] = dateStr.split("-").map(Number);
    }
    if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || month < 1 || month > 12 || day > 31) return null;
    return new Date(year, month - 1, day);
}

export function formatFirebaseDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
}

export function getHeatmapColor(value: number, max: number): string {
    const intensity = Math.round((value / max) * 255);
    const computed = 200 - intensity;
    return `rgb(255, ${computed < 0 ? 0 : computed}, ${computed < 0 ? 0 : computed})`;
}