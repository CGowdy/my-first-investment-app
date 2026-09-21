import type {LoginData} from "@models/auth";
import type {ChildAccount} from "@models/child-account";
import type {IUser} from "@models/user";
import type {StoredUser} from "../../server/auth/types";

const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 256;

export function parseLoginData(value: unknown): LoginData | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.username !== "string" || typeof candidate.password !== "string") {
        return null;
    }

    if (
        candidate.username.length < 1
        || candidate.username.length > MAX_USERNAME_LENGTH
        || candidate.password.length < 1
        || candidate.password.length > MAX_PASSWORD_LENGTH
    ) {
        return null;
    }

    return {
        username: candidate.username,
        password: candidate.password,
    };
}

export function toAuthenticatedUser(user: StoredUser): IUser {
    return {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        isChildAccount: user.isChildAccount,
    };
}

export function toAuthenticatedChildAccount(account: ChildAccount): ChildAccount {
    return {
        _id: account._id,
        username: account.username,
        displayName: account.displayName,
        isChildAccount: true,
        parentId: account.parentId,
        balance: account.balance,
        balanceLastUpdated: account.balanceLastUpdated,
        interest: account.interest,
    };
}
