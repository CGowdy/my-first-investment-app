import {ChildAccount} from "@models/child-account";
import {
    Collection,
    ensureUserUsernameUniqueIndex,
    findById,
    isDuplicateKeyError,
    updateOneByIdOrThrow,
    withMongoTransaction,
} from "@server/database/mongodb";
import {parseUpdateChildAccount} from "../../../domain/child-account-profile";
import {canAccessChild, canManageChild} from "../../../server/auth/authorization";
import {hashPassword} from "../../../server/auth/password";
import {readSession} from "../../../server/auth/session";
import {settleChildGrowth} from "../../../server/growth/settle-child-growth";
import {toAuthenticatedChildAccount} from "../../auth/security";

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

export const PATCH = async (req: Request, {params}: {params: Promise<{id: string}>}) => {
    try {
        const session = await readSession();
        if (!session) return authenticationRequired();

        const update = parseUpdateChildAccount(await req.json());
        if (!update) {
            return Response.json({error: {code: "INVALID_ACCOUNT", message: "Enter valid child account details"}}, {status: 400});
        }

        await ensureUserUsernameUniqueIndex();
        const {id} = await params;
        const updatedChild = await withMongoTransaction(async databaseSession => {
            const child = (await findById<ChildAccount>(Collection.ChildAccounts, id, databaseSession))?.document;
            if (!child || !canManageChild(session, child)) return null;

            const passwordHash = update.password ? await hashPassword(update.password) : undefined;
            await updateOneByIdOrThrow(Collection.Users, id, {
                displayName: update.displayName,
                username: update.username,
                ...(passwordHash ? {passwordHash} : {}),
            }, databaseSession);
            await updateOneByIdOrThrow(Collection.ChildAccounts, id, {
                displayName: update.displayName,
                username: update.username,
                interest: update.interest,
            }, databaseSession);

            return toAuthenticatedChildAccount({
                ...child,
                displayName: update.displayName,
                username: update.username,
                interest: update.interest,
            });
        });

        if (!updatedChild) return childNotFound();
        return Response.json(updatedChild);
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return Response.json({error: {code: "USERNAME_TAKEN", message: "Username is already in use"}}, {status: 409});
        }
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to update child account"}}, {status: 500});
    }
};
