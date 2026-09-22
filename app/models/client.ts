import type {AuthenticatedAccount, GuardianRegistrationData, LoginData} from "@models/auth";
import {Option} from "@models/option";
import {ChildAccount, CreateChildAccountInput, UpdateChildAccountInput} from "@models/child-account";
import {Transaction} from "@models/transaction";

export default interface IClient {
    auth(userData: LoginData, options?:Option): Promise<AuthenticatedAccount | null>;
    registerGuardian(registration: GuardianRegistrationData): Promise<AuthenticatedAccount>;
    getSession(): Promise<AuthenticatedAccount | null>;
    logout(): Promise<void>;

    //Child CRUD
    addChildUser(childData: CreateChildAccountInput, options?:Option): Promise<ChildAccount | null>;
    updateChildAccount(childId: string, childData: UpdateChildAccountInput, options?:Option): Promise<ChildAccount>;
    deleteChildAccount(childId: string, options?:Option): Promise<void>;
    getChildAccount(childUserId: string): Promise<ChildAccount>;
    getChildAccounts(parentId: string, options?:Option): Promise<ChildAccount[]|null>;

    //Transaction CRUD
    sendRequest(newRequest: Transaction, options?:Option): Promise<Transaction[]>;
    getPendingRequestsForChild(childUserId: string, options?:Option): Promise<Transaction[]>;
    getPendingRequestsForParent(parentUserId: string, options?:Option): Promise<Transaction[]>;
    approveRequest(transaction: Transaction, options?:Option): Promise<Transaction[]>;
    rejectRequest(transaction: Transaction, options?:Option): Promise<Transaction[]>;
    adjustBalance(childUserId: string, adjustment: number, options?:Option): Promise<ChildAccount>;

}
