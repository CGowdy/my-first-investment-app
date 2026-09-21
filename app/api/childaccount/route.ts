import {ChildAccount} from "@models/child-account";
import {
    Collection,
    ensureUserUsernameUniqueIndex,
    findOne,
    insertOneOrThrow,
    isDuplicateKeyError,
    withMongoTransaction,
} from "@server/database/mongodb";
import {Transaction} from "@models/transaction";
import {hashPassword} from "../../server/auth/password";
import type {StoredUser} from "../../server/auth/types";
import {toAuthenticatedChildAccount} from "../auth/security";
import {readSession} from "../../server/auth/session";
import {createChildAccountRecords, parseCreateChildAccount} from "../../domain/child-account-provisioning";

export const POST = async (req: Request) => {
    try {
        const session = await readSession();
        if (!session) {
            return Response.json({error: {code: "UNAUTHENTICATED", message: "Authentication required"}}, {status: 401});
        }
        if (session.role !== "guardian" || session.userId !== session.familyId) {
            return Response.json({error: {code: "FORBIDDEN", message: "Guardian access required"}}, {status: 403});
        }

        const requestBody = await req.json().catch(() => null);
        const requestData = parseCreateChildAccount(requestBody);
        if (!requestData) {
            return Response.json({error: {code: "INVALID_CHILD_ACCOUNT", message: "Invalid child account"}}, {status: 400});
        }
        await ensureUserUsernameUniqueIndex();
        const passwordHash = await hashPassword(requestData.password);

        const result = await withMongoTransaction(async databaseSession => {
            const existingUser = (await findOne<StoredUser>(
                Collection.Users,
                {username: requestData.username},
                databaseSession,
            ))?.document;
            if (existingUser) return {error: "USERNAME_TAKEN" as const};

            const createdAt = new Date();
            const storedChildAccount: Omit<ChildAccount, "_id"> = {
                username: requestData.username,
                displayName: requestData.displayName,
                isChildAccount: true,
                parentId: session.familyId,
                balance: requestData.balance,
                balanceLastUpdated: createdAt,
                interest: requestData.interest,
            };
            const childInsert = await insertOneOrThrow(Collection.ChildAccounts, storedChildAccount, databaseSession);

            const records = createChildAccountRecords({
                childId: childInsert.insertedId,
                familyId: session.familyId,
                username: requestData.username,
                displayName: requestData.displayName,
                passwordHash,
                balance: requestData.balance,
                interest: requestData.interest,
                createdAt,
            });
            await insertOneOrThrow<Transaction>(
                Collection.Transactions,
                records.openingTransaction,
                databaseSession,
            );

            await insertOneOrThrow<StoredUser>(Collection.Users, records.user, databaseSession);

            return {child: records.childAccount};
        });

        if ("error" in result) {
            return Response.json({error: {code: result.error, message: "Username is already in use"}}, {status: 409});
        }
        return Response.json(toAuthenticatedChildAccount(result.child));
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return Response.json({error: {code: "USERNAME_TAKEN", message: "Username is already in use"}}, {status: 409});
        }
        return Response.json({error: {code: "SERVER_ERROR", message: "Unable to create child account"}}, {status: 500});
    }
};
