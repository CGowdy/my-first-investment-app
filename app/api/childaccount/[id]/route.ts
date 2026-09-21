import {ChildAccount} from "@models/child-account";
import {Collection, findById, withMongoTransaction} from "@server/database/mongodb";
import {canAccessChild} from "../../../server/auth/authorization";
import {readSession} from "../../../server/auth/session";
import {settleChildGrowth} from "../../../server/growth/settle-child-growth";

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
        const result = await withMongoTransaction(async databaseSession => {
            const childAccount = (await findById<ChildAccount>(Collection.ChildAccounts, id, databaseSession))?.document;
            if (!childAccount || !canAccessChild(session, childAccount)) return null;
            return settleChildGrowth(childAccount, new Date(), databaseSession);
        });
        if (!result) {
            return childNotFound();
        }

        return Response.json(result);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load child account"}}, {status: 500});
    }
};
