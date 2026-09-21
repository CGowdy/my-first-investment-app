import type {ClientSession} from "mongodb";
import type {ChildAccount} from "@models/child-account";
import type {Transaction} from "@models/transaction";
import {Collection, insertOneOrThrow, updateOneByIdOrThrow} from "../../api/mongoDataAPIHelper";
import {createGrowthAccrual, type GrowthAccrualDecision} from "../../domain/growth-accrual";

export async function settleChildGrowth(
    child: ChildAccount,
    asOf: Date,
    databaseSession: ClientSession,
    options: {checkpointIfZero?: boolean} = {},
): Promise<ChildAccount> {
    const decision = createGrowthAccrual(child, asOf, options);
    return persistChildGrowth(child, decision, databaseSession);
}

export async function persistChildGrowth(
    originalChild: ChildAccount,
    decision: GrowthAccrualDecision,
    databaseSession: ClientSession,
): Promise<ChildAccount> {
    const child = decision.account;
    if (!child._id) throw new Error("Child account does not have an id");
    if (decision.account === originalChild) return child;

    if (decision.transaction) {
        await insertOneOrThrow<Transaction>(Collection.Transactions, decision.transaction, databaseSession);
    }
    const update = await updateOneByIdOrThrow<ChildAccount>(Collection.ChildAccounts, child._id, {
        balance: decision.account.balance,
        balanceLastUpdated: decision.account.balanceLastUpdated,
    }, databaseSession);
    if (!update?.matchedCount) throw new Error("Failed to settle simulated growth");

    return decision.account;
}
