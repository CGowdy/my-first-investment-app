import {calculateCompoundedBalance} from "./growth-accrual";

export type GrowthProjectionPoint = {
    day: number;
    baselineBalance: number;
    scenarioBalance: number;
};

export type GrowthProjection = {
    scenarioStartingBalance: number;
    baselineFinalBalance: number;
    scenarioFinalBalance: number;
    scenarioGrowth: number;
    points: GrowthProjectionPoint[];
};

type GrowthProjectionInput = {
    currentBalance: number;
    pretendChange: number;
    annualInterestPercent: number;
    days: number;
};

const MAX_CHART_POINTS = 61;

export function buildGrowthProjection(input: GrowthProjectionInput): GrowthProjection | null {
    const {currentBalance, pretendChange, annualInterestPercent, days} = input;
    const scenarioStartingBalance = currentBalance + pretendChange;
    if (
        !Number.isFinite(currentBalance) || currentBalance < 0
        || !Number.isFinite(pretendChange)
        || !Number.isFinite(annualInterestPercent) || annualInterestPercent < 0 || annualInterestPercent > 100
        || !Number.isInteger(days) || days < 1 || days > 3650
        || scenarioStartingBalance < 0
    ) return null;

    const balanceAtDay = (startingBalance: number, day: number) => calculateCompoundedBalance(
        startingBalance,
        annualInterestPercent,
        day,
    );
    const sampleEveryDays = Math.max(1, Math.ceil(days / (MAX_CHART_POINTS - 1)));
    const sampledDays = Array.from(
        {length: Math.floor(days / sampleEveryDays) + 1},
        (_, index) => index * sampleEveryDays,
    );
    if (sampledDays.at(-1) !== days) sampledDays.push(days);

    const baselineFinalBalance = balanceAtDay(currentBalance, days);
    const scenarioFinalBalance = balanceAtDay(scenarioStartingBalance, days);
    return {
        scenarioStartingBalance: roundCurrency(scenarioStartingBalance),
        baselineFinalBalance,
        scenarioFinalBalance,
        scenarioGrowth: roundCurrency(scenarioFinalBalance - scenarioStartingBalance),
        points: sampledDays.map(day => ({
            day,
            baselineBalance: balanceAtDay(currentBalance, day),
            scenarioBalance: balanceAtDay(scenarioStartingBalance, day),
        })),
    };
}

function roundCurrency(value: number): number {
    return Number(value.toFixed(2));
}
