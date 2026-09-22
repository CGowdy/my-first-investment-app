import {canManageFamily} from "../../../../server/auth/authorization";
import {readSession} from "../../../../server/auth/session";
import {findPendingFamilyRequests} from "../../../../server/requests/find-pending-family-requests";

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

        return Response.json(await findPendingFamilyRequests(session.familyId));
    } catch {
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to load requests"}}, {status: 500});
    }
}
