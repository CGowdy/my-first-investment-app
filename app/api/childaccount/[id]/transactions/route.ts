import {Collection, findById, findMany, insertOne} from "@server/database/mongodb";
import {ChildAccount} from "@models/child-account";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {canAccessChild, canSubmitRequestForChild} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";

function authenticationRequired(): Response {
    return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
}

function childNotFound(): Response {
    return Response.json({error: {code: "NOT_FOUND", message: "Child account not found"}}, {status: 404});
}

async function loadChild(id: string): Promise<ChildAccount | null> {
    return (await findById<ChildAccount>(Collection.ChildAccounts, id))?.document ?? null;
}

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) return authenticationRequired();

        const {id} = await params;
        const child = await loadChild(id);
        if (!child || !canSubmitRequestForChild(session, child)) return childNotFound();

        const body = await req.json() as Record<string, unknown>;
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (
            typeof body.amount !== "number"
            || !Number.isFinite(body.amount)
            || body.amount <= 0
            || reason.length < 1
            || reason.length > 500
        ) {
            return Response.json({error: {code: "INVALID_REQUEST", message: "A positive amount and reason are required"}}, {status: 400});
        }

        const transaction: Transaction = {
            amount: body.amount,
            originalBalance: child.balance,
            childId: id,
            reason,
			approved: ApprovalStatus.Pending,
			date: new Date(),
			actorId: session.userId,
		};
        const insertResult = await insertOne(Collection.Transactions, transaction);
        if (!insertResult?.insertedId) throw new Error("Failed to create request");

        const pendingTransactions = await findMany<Transaction>(Collection.Transactions, {
            childId: id,
            approved: ApprovalStatus.Pending,
        });
        return Response.json(pendingTransactions?.documents ?? []);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to create request"}}, {status: 500});
    }
}

export async function GET(_req: Request, {params}: {params: Promise<{id: string}>}) {
    try {
        const session = await readSession();
        if (!session) return authenticationRequired();

        const {id} = await params;
        const child = await loadChild(id);
        if (!child || !canAccessChild(session, child)) return childNotFound();

        const transactions = await findMany<Transaction>(Collection.Transactions, {
            childId: id,
            approved: ApprovalStatus.Pending,
        });
        return Response.json(transactions?.documents ?? []);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load requests"}}, {status: 500});
    }
}
