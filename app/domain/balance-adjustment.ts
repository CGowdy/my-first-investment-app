import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";

export type BalanceAdjustmentDecision =
    | {ok: true; balance: number; transaction: Transaction}
    | {ok: false; reason: "INVALID_ADJUSTMENT" | "INSUFFICIENT_BALANCE"};

export function createBalanceAdjustment(
    child: ChildAccount,
    childId: string,
    amount: number,
    guardianId: string,
    recordedAt: Date,
): BalanceAdjustmentDecision {
    if (!Number.isFinite(amount) || amount === 0) {
        return {ok: false, reason: "INVALID_ADJUSTMENT"};
    }

    const balance = child.balance + amount;
    if (balance < 0) return {ok: false, reason: "INSUFFICIENT_BALANCE"};

    return {
        ok: true,
        balance,
        transaction: {
            amount,
            childId,
            originalBalance: child.balance,
            finalBalance: balance,
            approved: ApprovalStatus.AdminApproved,
            reason: "Parent Balance Adjustment",
            date: recordedAt,
            actorId: guardianId,
        },
    };
}
