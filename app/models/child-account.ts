import {IUser} from "@models/user";

export interface ChildAccount extends IUser {
    parentId: string;
    balance: number;
    balanceLastUpdated: Date;
    interest: number;
}

export interface CreateChildAccountInput {
    displayName: string;
    username: string;
    password: string;
    balance: number;
    interest: number;
}
