import {ChildAccount, CreateChildAccountInput} from "@models/child-account";
import {Collection, findOne, insertOne} from "@mongoDataApiHelper";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {hashPassword} from "../../server/auth/password";
import type {StoredUser} from "../../server/auth/types";
import {toAuthenticatedChildAccount} from "../auth/security";
import {readSession} from "../../server/auth/session";

function parseCreateChildAccount(value: unknown): CreateChildAccountInput | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    if (
        typeof input.username !== "string" || input.username.length < 1 || input.username.length > 128
        || typeof input.password !== "string" || input.password.length < 8 || input.password.length > 256
        || typeof input.displayName !== "string" || input.displayName.length < 1 || input.displayName.length > 128
        || typeof input.balance !== "number" || !Number.isFinite(input.balance)
        || typeof input.interest !== "number" || !Number.isFinite(input.interest)
    ) return null;

    return {
        username: input.username,
        password: input.password,
        displayName: input.displayName,
        balance: input.balance,
        interest: input.interest,
    };
}

export const POST = async (req: Request) =>{
    try {
        const session = await readSession();
        if (!session || session.role !== "guardian") {
            return Response.json({error: {code: "FORBIDDEN", message: "Guardian access required"}}, {status: 403});
        }
        const requestData = parseCreateChildAccount(await req.json());
        if (!requestData) {
            return Response.json({error: {code: "INVALID_CHILD_ACCOUNT", message: "Invalid child account"}}, {status: 400});
        }
        const passwordHash = await hashPassword(requestData.password);
        const storedChildAccount: Omit<ChildAccount, "_id"> = {
            username: requestData.username,
            displayName: requestData.displayName,
            isChildAccount: true,
            parentId: session.familyId,
            balance: requestData.balance,
            balanceLastUpdated: new Date(),
            interest: requestData.interest,
        };

        //Create Child Account
        const newChildAccountId = await insertOne(Collection.ChildAccounts, storedChildAccount);
        if(!newChildAccountId){ throw new Error('Error creating child account');}
        const updateChildAccountData: ChildAccount = {
            ...storedChildAccount,
            _id: newChildAccountId.insertedId
        }

        //Create first balance
        const newAccountTransaction:Transaction = {
            childId: newChildAccountId.insertedId,
            originalBalance: requestData.balance,
            finalBalance: requestData.balance,
            date: new Date(),
            amount: requestData.balance,
            reason: 'Account Creation - Initial balance',
            approved: ApprovalStatus.AdminApproved
        }
        const newBalanceId = await insertOne<Transaction>(Collection.Transactions,newAccountTransaction);
        if(!newBalanceId){throw new Error('Error creating balance')}

        //Create Child User Account
        const childUserResponse = await findOne<StoredUser>(Collection.Users,{_id: {$oid: newChildAccountId.insertedId}});
        const childUser = childUserResponse?.document;
        if(!childUser){
            const newChildUser:StoredUser = {
                _id:newChildAccountId.insertedId,
                username: requestData.username,
                passwordHash,
                displayName: requestData.displayName,
                isChildAccount: true
            };
            await insertOne<StoredUser>(Collection.Users,newChildUser);
        }

        return Response.json(toAuthenticatedChildAccount(updateChildAccountData));
    } catch (error) {
        return new Response(null, {
            status: 500,
            statusText: `Server error: ${error}`
        });
    }
}

export const GET = async(req: Request) =>{
    try{
        const data = await req.json() as {parentId: string};
        const result = await findOne<ChildAccount>(Collection.ChildAccounts,{parentId: data.parentId});
        if(!result?.document) throw new Error('Child account not found');
        return Response.json(result?.document);
    }catch (error){
        return new Response(null,{
            status:500,
            statusText:`Server error: ${error}`
        });
    }
}
