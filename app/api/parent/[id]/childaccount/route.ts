import {ChildAccount} from "@models/child-account";
import {Collection, findMany, withMongoTransaction} from "@server/database/mongodb";
import {canManageFamily} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";
import {settleChildGrowth} from "../../../../server/growth/settle-child-growth";

export const revalidate = 0;

export const GET = async (_req: Request, {params}: {params: Promise<{id: string}>}) => {
    try {
        const session = await readSession();
        if (!session) {
            return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
        }

        const {id} = await params;
        if (!canManageFamily(session, id)) {
            return Response.json({error: {code: "FORBIDDEN", message: "Access denied"}}, {status: 403});
        }

        const children = await withMongoTransaction(async databaseSession => {
            const result = await findMany<ChildAccount>(
                Collection.ChildAccounts,
                {parentId: session.familyId},
                databaseSession,
            );
            const settledChildren: ChildAccount[] = [];
            const asOf = new Date();
            for (const child of result?.documents ?? []) {
                settledChildren.push(await settleChildGrowth(child, asOf, databaseSession));
            }
            return settledChildren;
        });
        return Response.json(children);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load child accounts"}}, {status: 500});
    }
};
