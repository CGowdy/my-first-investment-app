import {Collection, findById, findMany, updateOne} from "@mongoDataApiHelper";
import {ChildAccount} from "@models/child-account";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {canManageChild} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";

export async function POST(_req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});

        const {id} = await params;
        const transaction = (await findById<Transaction>(Collection.Transactions, id))?.document;
        if (!transaction) return Response.json({error: {code: "NOT_FOUND", message: "Request not found"}}, {status: 404});
        const child = (await findById<ChildAccount>(Collection.ChildAccounts, transaction.childId))?.document;
        if (!child || !canManageChild(session, child)) {
            return Response.json({error: {code: "NOT_FOUND", message: "Request not found"}}, {status: 404});
        }
        if (transaction.approved !== ApprovalStatus.Pending) {
            return Response.json({error: {code: "INVALID_TRANSITION", message: "Only pending requests can be denied"}}, {status: 409});
        }

        const updateResult = await updateOne<Transaction>(Collection.Transactions, {
            _id: {$oid: id},
            approved: ApprovalStatus.Pending,
        }, {approved: ApprovalStatus.Rejected});
        if (!updateResult?.matchedCount) {
            return Response.json({error: {code: "INVALID_TRANSITION", message: "Request is no longer pending"}}, {status: 409});
        }

        const pending = await findMany<Transaction>(Collection.Transactions, {
            childId: transaction.childId,
            approved: ApprovalStatus.Pending,
        });
        return Response.json(pending?.documents ?? []);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to deny request"}}, {status: 500});
    }
}
