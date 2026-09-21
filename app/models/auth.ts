import type {ChildAccount} from "@models/child-account";
import type {IUser} from "@models/user";

export interface LoginData {
    username: string;
    password: string;
}

export type AuthenticatedUser = IUser;
export type AuthenticatedChildAccount = ChildAccount;
export type AuthenticatedAccount = AuthenticatedUser | AuthenticatedChildAccount;

export interface ApiError {
    error: {
        code: string;
        message: string;
    };
}
