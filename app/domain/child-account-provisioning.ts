import type {ChildAccount, CreateChildAccountInput} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";
import type {StoredUser} from "../server/auth/types";
import {isValidPrototypePassword} from "./prototype-password-policy";

export interface ChildAccountProvisioningCommand {
    childId: string;
    familyId: string;
    username: string;
    displayName: string;
    passwordHash: string;
    balance: number;
    interest: number;
    createdAt: Date;
}

export function parseCreateChildAccount(value: unknown): CreateChildAccountInput | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const input = value as Record<string, unknown>;
    const username = typeof input.username === "string" ? input.username.trim() : "";
    const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
    if (
        username.length < 1 || username.length > 128
        || !isValidPrototypePassword(input.password)
        || displayName.length < 1 || displayName.length > 128
        || typeof input.balance !== "number" || !Number.isFinite(input.balance) || input.balance < 0 || input.balance > 1_000_000_000
        || typeof input.interest !== "number" || !Number.isFinite(input.interest) || input.interest < 0 || input.interest > 100
    ) return null;

    return {username, password: input.password, displayName, balance: input.balance, interest: input.interest};
}

export function createChildAccountRecords(command: ChildAccountProvisioningCommand): {
    childAccount: ChildAccount;
    user: StoredUser;
    openingTransaction: Transaction;
} {
    const childAccount: ChildAccount = {
        _id: command.childId,
        username: command.username,
        displayName: command.displayName,
        isChildAccount: true,
        parentId: command.familyId,
        balance: command.balance,
        balanceLastUpdated: command.createdAt,
        interest: command.interest,
    };

    return {
        childAccount,
        user: {
            _id: command.childId,
            username: command.username,
            displayName: command.displayName,
            passwordHash: command.passwordHash,
            isChildAccount: true,
        },
        openingTransaction: {
            childId: command.childId,
            originalBalance: 0,
            finalBalance: command.balance,
            date: command.createdAt,
            amount: command.balance,
            reason: "Account Creation - Initial balance",
            approved: ApprovalStatus.AdminApproved,
            actorId: command.familyId,
        },
    };
}
