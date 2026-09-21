
export interface IUser {
    _id?: string;
    isChildAccount?:boolean;
    username: string;
    password: string; // In a real app, passwords should be hashed and not stored as plain text
    displayName: string;
}
