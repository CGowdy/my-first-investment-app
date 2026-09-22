import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";

export type GrowthAccrualDecision = {
    accrued: boolean;
    elapsedDays: number;
    account: ChildAccount;
    transaction?: Transaction;
};

export const GROWTH_ACTOR_ID = "system:growth-rule";

export function calculateDailyGrowth(balance: number, annualInterestPercent: number): number {
    return balance * (annualInterestPercent / 100 / 365);
}

export function calculateCompoundedGrowth(
    balance: number,
    annualInterestPercent: number,
    elapsedDays: number,
): number {
    const dailyRate = annualInterestPercent / 100 / 365;
    return roundCurrency(balance * (Math.pow(1 + dailyRate, elapsedDays) - 1));
}

export function calculateCompoundedBalance(
    balance: number,
    annualInterestPercent: number,
    elapsedDays: number,
): number {
    return roundCurrency(balance + calculateCompoundedGrowth(balance, annualInterestPercent, elapsedDays));
}

export function createGrowthAccrual(
    child: ChildAccount,
    asOf: Date,
    options: {checkpointIfZero?: boolean} = {},
): GrowthAccrualDecision {
    const lastUpdated = new Date(child.balanceLastUpdated);
    const elapsedDays = wholeUtcDaysBetween(lastUpdated, asOf);
    const checkpointedAccount = options.checkpointIfZero
        && Number.isFinite(lastUpdated.getTime())
        && Number.isFinite(asOf.getTime())
        && asOf > lastUpdated
        ? {...child, balanceLastUpdated: asOf}
        : child;
    if (
        !Number.isFinite(elapsedDays)
        || elapsedDays === 0
        || !child._id
        || !Number.isFinite(child.balance)
        || child.balance <= 0
        || !Number.isFinite(child.interest)
        || child.interest <= 0
    ) {
        return {accrued: false, elapsedDays, account: checkpointedAccount};
    }

    const amount = calculateCompoundedGrowth(child.balance, child.interest, elapsedDays);
    if (!Number.isFinite(amount)) return {accrued: false, elapsedDays, account: child};
    if (amount === 0) {
        return {
            accrued: false,
            elapsedDays,
            account: checkpointedAccount,
        };
    }

    const balance = calculateCompoundedBalance(child.balance, child.interest, elapsedDays);
    const balanceLastUpdated = options.checkpointIfZero
        ? asOf
        : new Date(lastUpdated.getTime() + elapsedDays * 86_400_000);
    return {
        accrued: true,
        elapsedDays,
        account: {...child, balance, balanceLastUpdated},
        transaction: {
            amount,
            childId: child._id,
            originalBalance: child.balance,
            finalBalance: balance,
            date: asOf,
            reason: `Simulated growth: ${elapsedDays} ${elapsedDays === 1 ? "day" : "days"} at ${child.interest}% annual`,
            approved: ApprovalStatus.AdminApproved,
            actorId: GROWTH_ACTOR_ID,
        },
    };
}

function wholeUtcDaysBetween(start: Date, end: Date): number {
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function roundCurrency(value: number): number {
    return Number(value.toFixed(2));
}
