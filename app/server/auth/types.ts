import type {IUser} from "@models/user";

export interface StoredUser extends IUser {
    passwordHash: string;
}
