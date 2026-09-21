import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";

export type ApprovalFailure = "INVALID_REQUEST" | "INVALID_TRANSITION" | "INSUFFICIENT_BALANCE";

export type ApprovalDecision =
    | {ok: true; transaction: Transaction; balance: number}
    | {ok: false; reason: ApprovalFailure};

export function approvePurchaseRequest(
    request: Transaction,
    child: ChildAccount,
    guardianId: string,
    approvedAt: Date,
): ApprovalDecision {
    if (
        request.childId !== child._id
        || !Number.isFinite(request.amount)
        || request.amount <= 0
    ) {
        return {ok: false, reason: "INVALID_REQUEST"};
    }
    if (request.approved !== ApprovalStatus.Pending) {
        return {ok: false, reason: "INVALID_TRANSITION"};
    }

    const balance = child.balance - request.amount;
    if (balance < 0) return {ok: false, reason: "INSUFFICIENT_BALANCE"};

    return {
        ok: true,
        balance,
        transaction: {
            ...request,
            approved: ApprovalStatus.Approved,
            originalBalance: child.balance,
            finalBalance: balance,
            actorId: guardianId,
            approvedAt,
        },
    };
}
