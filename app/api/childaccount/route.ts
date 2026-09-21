import {ChildAccount} from "@models/child-account";
import {IUser} from "@models/user";
import {Collection, findOne, insertOne} from "@mongoDataApiHelper";
import {ApprovalStatus, Transaction} from "@models/transaction";

export const POST = async (req: Request) =>{
    try {
        const requestData = await req.json() as ChildAccount;

        //Create Child Account
        const newChildAccountId = await insertOne<ChildAccount>(Collection.ChildAccounts,requestData as ChildAccount);
        if(!newChildAccountId){ throw new Error('Error creating child account');}
        const updateChildAccountData = {
            ...requestData,
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
        const childUserResponse = await findOne<IUser>(Collection.Users,{_id: {$oid: newChildAccountId.insertedId}});
        const childUser = childUserResponse?.document;
        if(!childUser){
            const newChildUser:IUser = {
                _id:newChildAccountId.insertedId,
                username: requestData.username,
                password: requestData.password,
                displayName: requestData.displayName,
                isChildAccount: true
            };
            await insertOne<IUser>(Collection.Users,newChildUser);
        }

        return Response.json(updateChildAccountData);
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
