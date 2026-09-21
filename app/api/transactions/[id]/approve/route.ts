import {Collection, findById, findMany, updateOne, updateOneById, withMongoTransaction} from "@mongoDataApiHelper";
import {ChildAccount} from "@models/child-account";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {canManageChild} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";
import {approvePurchaseRequest} from "../../../../domain/purchase-request";

export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});

        const {id} = await params;
        const result = await withMongoTransaction(async databaseSession => {
            const transaction = (await findById<Transaction>(Collection.Transactions, id, databaseSession))?.document;
            if (!transaction) return {error: "NOT_FOUND" as const};
            const child = (await findById<ChildAccount>(Collection.ChildAccounts, transaction.childId, databaseSession))?.document;
            if (!child || !canManageChild(session, child)) return {error: "NOT_FOUND" as const};
            const decision = approvePurchaseRequest(transaction, child, session.userId, new Date());
            if (!decision.ok) return {error: decision.reason};

            const transactionUpdate = await updateOne<Transaction>(Collection.Transactions, {
                _id: {$oid: id},
                approved: ApprovalStatus.Pending,
            }, {
                approved: decision.transaction.approved,
                originalBalance: decision.transaction.originalBalance,
                finalBalance: decision.transaction.finalBalance,
                actorId: decision.transaction.actorId,
                approvedAt: decision.transaction.approvedAt,
            }, databaseSession);
            if (!transactionUpdate?.matchedCount) return {error: "INVALID_TRANSITION" as const};

            const accountUpdate = await updateOneById<ChildAccount>(
                Collection.ChildAccounts,
                child._id!,
                {balance: decision.balance},
                databaseSession,
            );
            if (!accountUpdate?.matchedCount) throw new Error("Failed to update child balance");

            const pending = await findMany<Transaction>(Collection.Transactions, {
                childId: transaction.childId,
                approved: ApprovalStatus.Pending,
            }, databaseSession);
            return {pending: pending?.documents ?? []};
        });

        if ("error" in result) {
            if (result.error === "NOT_FOUND") {
                return Response.json({error: {code: "NOT_FOUND", message: "Request not found"}}, {status: 404});
            }
            if (result.error === "INSUFFICIENT_BALANCE") {
                return Response.json({error: {code: "INSUFFICIENT_BALANCE", message: "Request exceeds the available balance"}}, {status: 409});
            }
            return Response.json({error: {code: "INVALID_TRANSITION", message: "Request is no longer pending"}}, {status: 409});
        }
        return Response.json(result.pending);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to approve request"}}, {status: 500});
    }
}
