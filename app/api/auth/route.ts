import dotenv from "dotenv";
import {LoginData} from "@contexts/AuthContext";
import {aggregate, Collection, findOne, insertOne, updateOneById} from "@mongoDataApiHelper";
import {ChildAccount} from "@models/child-account";
import {IUser} from "@models/user";
import {getAccruedInterest} from "@models/balance";
import {ApprovalStatus, Transaction} from "@models/transaction";

dotenv.config();

export const POST = async (req: Request) => {
    const loginData = await req.json() as LoginData;
    try {
        const userFindResult = await findOne<IUser>(Collection.Users, {
                username: loginData.username,
                password: loginData.password
            });
        if (!userFindResult?.document) {
            return new Response(null,{
                status:404,
                statusText:'User not found'
            });
        }
        const foundUser = userFindResult.document;
        if (!foundUser._id) throw new Error('User does not have an id');
        const childAccountResponse = await findOne<ChildAccount>(Collection.ChildAccounts,{_id: {$oid: foundUser._id}});
        const childAccount = childAccountResponse?.document;

        if(!childAccount){
            //Not child account therefore this is a parent account
            //Return the parent account
            return Response.json(userFindResult.document)
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
                return Response.json(updatedAccount);
            }

            return Response.json(childAccount);
        }

    } catch (error) {
        console.log(`auth route error: ${JSON.stringify(error)}`)
        return new Response(null,{
            status:500,
            statusText:`Server error: ${JSON.stringify(error)}`
        });
    }
}
