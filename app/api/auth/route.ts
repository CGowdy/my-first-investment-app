import dotenv from "dotenv";
import {aggregate, Collection, findOne, insertOne, updateOneById} from "@mongoDataApiHelper";
import {ChildAccount} from "@models/child-account";
import {IUser} from "@models/user";
import {getAccruedInterest} from "@models/balance";
import {ApprovalStatus, Transaction} from "@models/transaction";
import type {ApiError} from "@models/auth";
import {parseLoginData, withoutPassword} from "./security";

dotenv.config();

function authenticationError(status: number, code: string, message: string): Response {
    const body: ApiError = {error: {code, message}};
    return Response.json(body, {status});
}

export const POST = async (req: Request) => {
    try {
        const loginData = parseLoginData(await req.json());
        if (!loginData) {
            return authenticationError(400, "INVALID_LOGIN_REQUEST", "Invalid login request");
        }

        const userFindResult = await findOne<IUser>(Collection.Users, {
                username: loginData.username,
                password: loginData.password
            });
        if (!userFindResult?.document) {
            return authenticationError(401, "INVALID_CREDENTIALS", "Invalid username or password");
        }
        const foundUser = userFindResult.document;
        if (!foundUser._id) throw new Error('User does not have an id');
        const childAccountResponse = await findOne<ChildAccount>(Collection.ChildAccounts,{_id: {$oid: foundUser._id}});
        const childAccount = childAccountResponse?.document;

        if(!childAccount){
            //Not child account therefore this is a parent account
            //Return the parent account
            return Response.json(withoutPassword(userFindResult.document))
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
                //Return the child account
                return Response.json(withoutPassword(updatedAccount));
            }

            return Response.json(withoutPassword(childAccount));
        }

    } catch (error) {
        console.error("Authentication request failed");
        return authenticationError(500, "AUTHENTICATION_FAILED", "Authentication failed");
    }
}
