import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";
import {Collection, findMany} from "@server/database/mongodb";
import type {ClientSession} from "mongodb";

export async function findPendingFamilyRequests(
    familyId: string,
    databaseSession?: ClientSession,
): Promise<Transaction[]> {
    const children = (await findMany<ChildAccount>(
        Collection.ChildAccounts,
        {parentId: familyId},
        databaseSession,
    ))?.documents ?? [];
    const childIds = children.flatMap(child => child._id ? [child._id] : []);
    if (childIds.length === 0) return [];

    return (await findMany<Transaction>(
        Collection.Transactions,
        {childId: {$in: childIds}, approved: ApprovalStatus.Pending},
        databaseSession,
    ))?.documents ?? [];
}
