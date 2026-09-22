import {buildChildReport} from "../../../../domain/child-report";
import type {ChildAccount} from "@models/child-account";
import type {Transaction} from "@models/transaction";
import {Collection, findById, findMany, withMongoTransaction} from "@server/database/mongodb";
import {canAccessChild} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";
import {settleChildGrowth} from "../../../../server/growth/settle-child-growth";

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) {
            return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
        }

        const {id} = await params;
        const report = await withMongoTransaction(async databaseSession => {
            const child = (await findById<ChildAccount>(Collection.ChildAccounts, id, databaseSession))?.document;
            if (!child || !canAccessChild(session, child)) return null;

            const settledChild = await settleChildGrowth(child, new Date(), databaseSession);
            const transactionResult = await findMany<Transaction>(
                Collection.Transactions,
                {childId: settledChild._id},
                databaseSession,
            );
            if (!transactionResult) throw new Error("Unable to read the child ledger");
            return buildChildReport(transactionResult.documents);
        });

        if (!report) {
            return Response.json({error: {code: "NOT_FOUND", message: "Child account not found"}}, {status: 404});
        }
        return Response.json(report);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load child report"}}, {status: 500});
    }
}
