import {ApprovalStatus, Transaction} from "@models/transaction";
import {ChildAccount} from "@models/child-account";
import {Collection, findMany} from "@mongoDataApiHelper";
import {canManageFamily} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) {
            return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
        }

        const {id} = await params;
        if (!canManageFamily(session, id)) {
            return Response.json({error: {code: "FORBIDDEN", message: "Access denied"}}, {status: 403});
        }

        const childAccounts = (await findMany<ChildAccount>(Collection.ChildAccounts, {
            parentId: session.familyId,
        }))?.documents ?? [];
        if (childAccounts.length === 0) return Response.json([]);

        const transactions = await findMany<Transaction>(Collection.Transactions, {
            childId: {$in: childAccounts.map(child => child._id)},
            approved: ApprovalStatus.Pending,
        });
        return Response.json(transactions?.documents ?? []);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load requests"}}, {status: 500});
    }
}
