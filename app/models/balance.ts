export const getAccruedInterest = async (
    currentBalance: number,
    annualRate: number,
    lastUpdated: Date,
    asOf: Date = new Date()
) => {
    const daysSinceLastUpdate = calculateDaysBetweenDates(lastUpdated, asOf);
    const dailyRate = annualRate / 365;
    const accruedInterest = currentBalance * (Math.pow(1 + dailyRate, daysSinceLastUpdate) - 1);

    return Number(accruedInterest.toFixed(2));
}

function calculateDaysBetweenDates(startDate: Date, endDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const startUtc = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

    return Math.max(0, Math.floor((endUtc - startUtc) / msPerDay));
}
