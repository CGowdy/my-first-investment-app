import {ApprovalStatus, Transaction} from "@models/transaction";
import {Collection, findById, insertOne, updateOneById} from "@mongoDataApiHelper";
import {ChildAccount} from "@models/child-account";
import {canManageChild} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) {
            return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
        }

        const {id} = await params;
        const child = (await findById<ChildAccount>(Collection.ChildAccounts, id))?.document;
        if (!child || !canManageChild(session, child)) {
            return Response.json({error: {code: "NOT_FOUND", message: "Child account not found"}}, {status: 404});
        }

        const body = await req.json() as Record<string, unknown>;
        if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount === 0) {
            return Response.json({error: {code: "INVALID_ADJUSTMENT", message: "Adjustment must be a non-zero number"}}, {status: 400});
        }
        const finalBalance = child.balance + body.amount;
        if (finalBalance < 0) {
            return Response.json({error: {code: "INVALID_ADJUSTMENT", message: "Adjustment cannot make the balance negative"}}, {status: 400});
        }

        const transaction: Transaction = {
            amount: body.amount,
            childId: id,
            originalBalance: child.balance,
            finalBalance,
            approved: ApprovalStatus.AdminApproved,
            reason: "Parent Balance Adjustment",
            date: new Date(),
        };
        const insertResult = await insertOne(Collection.Transactions, transaction);
        if (!insertResult?.insertedId) throw new Error("Failed to record adjustment");

        const updateResult = await updateOneById<ChildAccount>(Collection.ChildAccounts, id, {balance: finalBalance});
        if (!updateResult?.matchedCount) throw new Error("Failed to update child account");

        return Response.json({...child, balance: finalBalance});
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to adjust balance"}}, {status: 500});
    }
}
