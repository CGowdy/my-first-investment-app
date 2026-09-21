import type {ChildAccount} from "@models/child-account";
import type {IUser} from "@models/user";

export interface LoginData {
    username: string;
    password: string;
}

export type AuthenticatedUser = Omit<IUser, "password">;
export type AuthenticatedChildAccount = Omit<ChildAccount, "password">;
export type AuthenticatedAccount = AuthenticatedUser | AuthenticatedChildAccount;

export interface ApiError {
    error: {
        code: string;
        message: string;
    };
}
