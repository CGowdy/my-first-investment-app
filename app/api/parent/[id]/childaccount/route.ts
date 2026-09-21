import {ChildAccount} from "@models/child-account";
import {Collection, findMany} from "@mongoDataApiHelper";
import {canManageFamily} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";

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

        const result = await findMany<ChildAccount>(Collection.ChildAccounts, {parentId: session.familyId});
        return Response.json(result?.documents ?? []);
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load child accounts"}}, {status: 500});
    }
};
