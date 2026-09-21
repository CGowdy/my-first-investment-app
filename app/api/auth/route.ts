import dotenv from "dotenv";
import {Collection, findById, findOne, insertOne, updateOneById} from "@mongoDataApiHelper";
import {ChildAccount} from "@models/child-account";
import {getAccruedInterest} from "@models/balance";
import {ApprovalStatus, Transaction} from "@models/transaction";
import type {ApiError} from "@models/auth";
import {parseLoginData, toAuthenticatedChildAccount, toAuthenticatedUser} from "./security";
import {verifyPassword} from "../../server/auth/password";
import {createSession, deleteSession, readSession} from "../../server/auth/session";
import type {StoredUser} from "../../server/auth/types";

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
        const childAccountResponse = await findOne<ChildAccount>(Collection.ChildAccounts,{_id: {$oid: foundUser._id}});
        const childAccount = childAccountResponse?.document;

        if(!childAccount){
            //Not child account therefore this is a parent account
            //Return the parent account
            await createSession({
                userId: foundUser._id,
                familyId: foundUser._id,
                role: "guardian",
            });
            return Response.json(toAuthenticatedUser(foundUser));
        }else{
            //Update child balance for the child account
            //Check if the latestBalance.date is today
            const today = new Date();
            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            if(new Date(childAccount.balanceLastUpdated) < startOfToday){
                //Create Interest transaction
                const interest = await getAccruedInterest(childAccount.balance, childAccount.interest/100, childAccount.balanceLastUpdated);

                //TODO: This is something but brain is not working so patooey
                if(!childAccount._id) throw new Error('Child account does not have an id');
                const accrudeInterestTransaction:Transaction = {
                    date: today,
                    amount: interest,
                    childId: childAccount._id,
                    reason: 'Interest',
                    approved: ApprovalStatus.AdminApproved
                };

                //Insert the interest transaction
                const insertResult = await insertOne<Transaction>(Collection.Transactions,accrudeInterestTransaction);
                if(!insertResult || !insertResult.insertedId) throw new Error('Failed to update balance');

                //Update the child account balance
                const updatedAccount : ChildAccount = {...childAccount, balance: childAccount.balance + interest, balanceLastUpdated: today};
                const updateResult = await updateOneById<ChildAccount>(Collection.ChildAccounts,childAccount._id, {
                    balance: updatedAccount.balance,
                    balanceLastUpdated: today
                });
                if(!updateResult) throw new Error('Failed to update account');
                await createSession({
                    userId: foundUser._id,
                    familyId: childAccount.parentId,
                    role: "child",
                });
                //Return the child account
                return Response.json(toAuthenticatedChildAccount(updatedAccount));
            }

            await createSession({
                userId: foundUser._id,
                familyId: childAccount.parentId,
                role: "child",
            });
            return Response.json(toAuthenticatedChildAccount(childAccount));
        }

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
            const childResult = await findById<ChildAccount>(Collection.ChildAccounts, session.userId);
            if (!childResult?.document) {
                await deleteSession();
                return authenticationError(401, "UNAUTHENTICATED", "Authentication required");
            }
            return Response.json(toAuthenticatedChildAccount(childResult.document));
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
