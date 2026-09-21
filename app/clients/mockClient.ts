import IClient from '@models/client';
import type {AuthenticatedAccount, LoginData} from "@models/auth";
import {ChildAccount, CreateChildAccountInput} from "@models/child-account";
import {IUser} from "@models/user";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {Option} from "@models/option";
import {guid} from '../helper-functions';
import {compare, hash} from "bcryptjs";


type MockUser = IUser & {passwordHash: string};

const mockPasswordHash = "$2b$12$198GTcO3AK1lq.dt7ZNZV.gdHaOlhOB23msT2Ga0MwALWj2WhdDFm";

export const mockChildren: ChildAccount[] = [
    {_id: "2", username: 'child1', displayName: 'Child 1', parentId: "1", balance: 250, balanceLastUpdated: new Date(), interest: 12},
    {_id: "123", username: 'child2', displayName: 'Child 2', parentId: "1", balance: 1150, balanceLastUpdated: new Date(), interest: 12},
];
export const mockUsers: MockUser[] = [
    {_id: "1", username: 'parent1', passwordHash: mockPasswordHash, displayName: 'Parent One'},
    {_id: "2", username: 'child1', passwordHash: mockPasswordHash, displayName: 'Child 1', isChildAccount: true},
    {_id: "123", username: 'child2', passwordHash: mockPasswordHash, displayName: 'Child 2', isChildAccount: true}
];

export const mockRequests: Transaction[] = []

export default class MockClient implements IClient {
    private session: AuthenticatedAccount | null = null;

    async auth(userData: LoginData): Promise<AuthenticatedAccount | null> {
        const user = mockUsers.find(user => user.username === userData.username);
        if (!user || !await compare(userData.password, user.passwordHash)) return null;
        const child = mockChildren.find(child => child.username === userData.username);
        const authenticated = {...user, ...child};
        const {passwordHash: _passwordHash, ...safeAccount} = authenticated;
        this.session = safeAccount;
        return this.session;
    }

    getSession(): Promise<AuthenticatedAccount | null> {
        return Promise.resolve(this.session);
    }

    logout(): Promise<void> {
        this.session = null;
        return Promise.resolve();
    }

    updateChildAccount(user: IUser): Promise<ChildAccount|null>{
        return Promise.resolve(mockChildren.find(child => child._id === user._id)??null);
    }

    //Child CRUD
    async addChildUser(childData: CreateChildAccountInput): Promise<ChildAccount| null> {
        if (!this.session?._id || this.session.isChildAccount) return null;
        const child: ChildAccount = {
            _id: guid(),
            username: childData.username,
            displayName: childData.displayName,
            parentId: this.session._id,
            balance: childData.balance,
            balanceLastUpdated: new Date(),
            interest: childData.interest,
            isChildAccount: true,
        };
        mockUsers.push({
            _id: child._id,
            username: child.username,
            displayName: child.displayName,
            isChildAccount: true,
            passwordHash: await hash(childData.password, 12),
        });
        mockChildren.push(child);
        return Promise.resolve(child);
    }

    getChildAccounts(parentId: string): Promise<ChildAccount[]|null> {
        return Promise.resolve(mockChildren.filter(child => child.parentId === parentId));
    }

    deleteChildAccount(childId: string): Promise<void> {
        const userIndex = mockUsers.findIndex(user => user._id === childId);
        mockUsers.splice(userIndex, 1);
        return Promise.resolve();
    }

    //Transaction CRUD
    getPendingRequestsForChild(userId: string, options?: Option): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            const child = mockChildren.find(child => child._id === userId);
            if (!child) reject(new Error(`User with id ${userId} not found`));
            if (child) resolve(mockRequests.filter(request => request.childId === child._id && request.approved !== ApprovalStatus.Rejected))
        });
    }

    getPendingRequestsForParent(parentUserId: string, options?: Option): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            const parent = mockUsers.find(user => user._id === parentUserId);
            if (!parent) reject(new Error(`User with id ${parentUserId} not found`));
            resolve(mockRequests.filter(request => mockChildren.filter(child => child.parentId === parentUserId).map(child => child._id).includes(request.childId)  && request.approved !== ApprovalStatus.Rejected));
        });
    }

    sendRequest(newRequest: Transaction, options?: Option): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            const child = mockChildren.find(child => child._id === newRequest.childId);
            if (child) {
                newRequest._id ??= guid();
                mockRequests.push(newRequest);
                resolve(mockRequests.filter(request => mockChildren.filter(child => newRequest.childId === child._id).map(child => child._id).includes(request.childId)));
            } else {
                reject(new Error('Child not found'))
            }
        });
    }

    approveRequest(transaction: Transaction, options?: Option): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            //Find the transaction in the mockRequests array
            const transactionIndex = mockRequests.findIndex(request => request._id === transaction._id);
            //If it's not found, reject
            if (transactionIndex === -1) reject(new Error(`Transaction with id ${transaction._id} not found`));
            const transactionToApprove = mockRequests[transactionIndex];
            transactionToApprove.approved = ApprovalStatus.Approved;
            //Return the updated mockRequests array
            const parentId = mockChildren.find(child => child._id === transaction.childId)?.parentId;
            resolve(mockRequests.filter(request => mockChildren.filter(child => child.parentId === parentId).map(child => child._id).includes(request.childId) && request.approved === ApprovalStatus.Pending));
        });
    }

    rejectRequest(transaction: Transaction, options?: Option): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            //Find the transaction in the mockRequests array
            const transactionIndex = mockRequests.findIndex(request => request._id === transaction._id);
            //If it's not found, reject
            if (transactionIndex === -1) reject(new Error(`Transaction with id ${transaction._id} not found`));
            //Otherwise remove it from the mockRequests array
            const transactionToReject = mockRequests[transactionIndex];
            transactionToReject.approved = ApprovalStatus.Rejected;
            //Return the updated mockRequests array
            const parentId = mockChildren.find(child => child._id === transaction.childId)?.parentId;
            resolve(mockRequests.filter(request => mockChildren.filter(child => child.parentId === parentId).map(child => child._id).includes(request.childId) && request.approved === ApprovalStatus.Pending));
        });
    }

    getChildAccount(childUserId: string): Promise<ChildAccount> {
        return new Promise((resolve, reject) => {
            const child = mockChildren.find(child => child._id === childUserId);
            if (child) resolve(child);
            else reject(new Error(`Child with id ${childUserId} not found`));
        });
    }

    adjustBalance(childUserId: string, adjustment: number, options?: Option): Promise<ChildAccount> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            const child = mockChildren.find(child => child._id === childUserId);
            if (child) {
                child.balance += adjustment;
                resolve(child);
            } else {
                reject(new Error(`Child with id ${childUserId} not found`));
            }
        })
    }

}

