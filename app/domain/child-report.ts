import type {ChildReport, ChildReportItem, ChildReportSummary} from "@models/child-report";
import {ApprovalStatus, type Transaction} from "@models/transaction";
import {GROWTH_ACTOR_ID} from "./growth-accrual";

export function buildChildReport(transactions: Transaction[]): ChildReport {
    const spendingItems = transactions
        .filter(transaction => transaction.approved === ApprovalStatus.Approved)
        .map(toReportItem)
        .sort(newestFirst);
    const growthItems = transactions
        .filter(transaction => transaction.actorId === GROWTH_ACTOR_ID)
        .map(toReportItem)
        .sort(newestFirst);

    return {
        spending: summarize(spendingItems),
        growth: summarize(growthItems),
    };
}

function toReportItem(transaction: Transaction): ChildReportItem {
    return {
        id: transaction._id ?? `${transaction.childId}-${new Date(transaction.date).toISOString()}`,
        amount: transaction.amount,
        reason: transaction.reason,
        date: new Date(transaction.date).toISOString(),
        ...(transaction.finalBalance === undefined ? {} : {resultingBalance: transaction.finalBalance}),
    };
}

function newestFirst(left: ChildReportItem, right: ChildReportItem): number {
    return new Date(right.date).getTime() - new Date(left.date).getTime();
}

function summarize(items: ChildReportItem[]): ChildReportSummary {
    return {
        total: roundCurrency(items.reduce((total, item) => total + item.amount, 0)),
        count: items.length,
        items,
    };
}

function roundCurrency(value: number): number {
    return Number(value.toFixed(2));
}
