import {ChildAccount} from "@models/child-account";
import {Collection, findById, updateOneById} from "@mongoDataApiHelper";
import {canAccessChild, canManageChild} from "../../../server/auth/authorization";
import {readSession} from "../../../server/auth/session";

function authenticationRequired(): Response {
    return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
}

function childNotFound(): Response {
    return Response.json({error: {code: "NOT_FOUND", message: "Child account not found"}}, {status: 404});
}

export const GET = async (_req: Request, {params}: {params: Promise<{id: string}>}) => {
    try {
        const session = await readSession();
        if (!session) return authenticationRequired();

        const {id} = await params;
        const childAccount = (await findById<ChildAccount>(Collection.ChildAccounts, id))?.document;
        if (!childAccount) {
            return childNotFound();
        }
        if (!canAccessChild(session, childAccount)) return childNotFound();

        return Response.json(childAccount);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load child account"}}, {status: 500});
    }
};

export const PUT = async (req: Request, {params}: {params: Promise<{id: string}>}) => {
    try {
        const session = await readSession();
        if (!session) return authenticationRequired();

        const {id} = await params;
        const childAccount = (await findById<ChildAccount>(Collection.ChildAccounts, id))?.document;
        if (!childAccount) {
            return childNotFound();
        }
        if (!canManageChild(session, childAccount)) return childNotFound();

        const body = await req.json() as Record<string, unknown>;
        if (typeof body.balance !== "number" || !Number.isFinite(body.balance) || body.balance < 0) {
            return Response.json({error: {code: "INVALID_BALANCE", message: "Balance must be a non-negative number"}}, {status: 400});
        }

        const updateResult = await updateOneById<ChildAccount>(Collection.ChildAccounts, id, {balance: body.balance});
        if (!updateResult?.matchedCount) {
            return childNotFound();
        }
        return Response.json(updateResult);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to update child account"}}, {status: 500});
    }
};
