import {Collection, findById, insertOne, updateOneById, withMongoTransaction} from "@server/database/mongodb";
import {ChildAccount} from "@models/child-account";
import {Transaction} from "@models/transaction";
import {createBalanceAdjustment} from "../../../../domain/balance-adjustment";
import {createGrowthAccrual} from "../../../../domain/growth-accrual";
import {canManageChild} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";
import {persistChildGrowth} from "../../../../server/growth/settle-child-growth";

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) {
            return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
        }

        const body = await req.json() as Record<string, unknown>;
        if (typeof body.amount !== "number") {
            return Response.json({error: {code: "INVALID_ADJUSTMENT", message: "Adjustment must be a number"}}, {status: 400});
        }
        const {id} = await params;

        const result = await withMongoTransaction(async databaseSession => {
            const child = (await findById<ChildAccount>(Collection.ChildAccounts, id, databaseSession))?.document;
            if (!child?._id || !canManageChild(session, child)) return {error: "NOT_FOUND" as const};

            const recordedAt = new Date();
            const growth = createGrowthAccrual(child, recordedAt, {checkpointIfZero: true});
            const decision = createBalanceAdjustment(growth.account, id, body.amount as number, session.userId, recordedAt);
            if (!decision.ok) return {error: decision.reason};
            const settledChild = await persistChildGrowth(child, growth, databaseSession);

            const transactionResult = await insertOne<Transaction>(
                Collection.Transactions,
                decision.transaction,
                databaseSession,
            );
            if (!transactionResult?.insertedId) throw new Error("Failed to record adjustment");

            const accountResult = await updateOneById<ChildAccount>(
                Collection.ChildAccounts,
                id,
                {balance: decision.balance},
                databaseSession,
            );
            if (!accountResult?.matchedCount) throw new Error("Failed to update child account");

            return {child: {...settledChild, balance: decision.balance}};
        });

        if ("error" in result) {
            if (result.error === "NOT_FOUND") {
                return Response.json({error: {code: "NOT_FOUND", message: "Child account not found"}}, {status: 404});
            }
            const message = result.error === "INSUFFICIENT_BALANCE"
                ? "Adjustment cannot make the balance negative"
                : "Adjustment must be a non-zero finite number";
            return Response.json({error: {code: result.error, message}}, {status: 400});
        }
        return Response.json(result.child);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to adjust balance"}}, {status: 500});
    }
}
