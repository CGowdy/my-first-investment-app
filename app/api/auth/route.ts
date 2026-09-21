import dotenv from "dotenv";
import {Collection, findById, findOne, withMongoTransaction} from "@mongoDataApiHelper";
import {ChildAccount} from "@models/child-account";
import type {ApiError} from "@models/auth";
import {parseLoginData, toAuthenticatedChildAccount, toAuthenticatedUser} from "./security";
import {verifyPassword} from "../../server/auth/password";
import {createSession, deleteSession, readSession} from "../../server/auth/session";
import type {StoredUser} from "../../server/auth/types";
import {settleChildGrowth} from "../../server/growth/settle-child-growth";

dotenv.config();

function authenticationError(status: number, code: string, message: string): Response {
    const body: ApiError = {error: {code, message}};
    return Response.json(body, {status});
}

export const POST = async (req: Request) => {
    try {
        let requestData: unknown;
        try {
            requestData = await req.json();
        } catch {
            return authenticationError(400, "INVALID_LOGIN_REQUEST", "Invalid login request");
        }

        const loginData = parseLoginData(requestData);
        if (!loginData) {
            return authenticationError(400, "INVALID_LOGIN_REQUEST", "Invalid login request");
        }

        const userFindResult = await findOne<StoredUser>(Collection.Users, {
            username: loginData.username,
        });
        const foundUser = userFindResult?.document;
        if (!foundUser || !await verifyPassword(loginData.password, foundUser.passwordHash)) {
            return authenticationError(401, "INVALID_CREDENTIALS", "Invalid username or password");
        }
        if (!foundUser._id) throw new Error('User does not have an id');
        if (!foundUser.isChildAccount) {
            await createSession({
                userId: foundUser._id,
                familyId: foundUser._id,
                role: "guardian",
            });
            return Response.json(toAuthenticatedUser(foundUser));
        }

        const childAccount = await withMongoTransaction(async databaseSession => {
            const child = (await findOne<ChildAccount>(
                Collection.ChildAccounts,
                {_id: {$oid: foundUser._id}},
                databaseSession,
            ))?.document;
            if (!child) throw new Error("Child profile is missing");
            return settleChildGrowth(child, new Date(), databaseSession);
        });
        await createSession({
            userId: foundUser._id,
            familyId: childAccount.parentId,
            role: "child",
        });
        return Response.json(toAuthenticatedChildAccount(childAccount));

    } catch (error) {
        console.error("Authentication request failed");
        return authenticationError(500, "AUTHENTICATION_FAILED", "Authentication failed");
    }
}

export const GET = async () => {
    try {
        const session = await readSession();
        if (!session) {
            return authenticationError(401, "UNAUTHENTICATED", "Authentication required");
        }

        const userResult = await findById<StoredUser>(Collection.Users, session.userId);
        const user = userResult?.document;
        if (!user) {
            await deleteSession();
            return authenticationError(401, "UNAUTHENTICATED", "Authentication required");
        }

        if (session.role === "child") {
            const child = await withMongoTransaction(async databaseSession => {
                const account = (await findById<ChildAccount>(
                    Collection.ChildAccounts,
                    session.userId,
                    databaseSession,
                ))?.document;
                return account ? settleChildGrowth(account, new Date(), databaseSession) : null;
            });
            if (!child) {
                await deleteSession();
                return authenticationError(401, "UNAUTHENTICATED", "Authentication required");
            }
            return Response.json(toAuthenticatedChildAccount(child));
        }

        return Response.json(toAuthenticatedUser(user));
    } catch {
        return authenticationError(500, "SESSION_LOOKUP_FAILED", "Unable to restore session");
    }
};

export const DELETE = async () => {
    await deleteSession();
    return Response.json({ok: true});
};
