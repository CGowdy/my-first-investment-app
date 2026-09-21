import IClient from '@models/client';
import type {AuthenticatedAccount, LoginData} from "@models/auth";
import {ChildAccount, CreateChildAccountInput} from "@models/child-account";
import {IUser} from "@models/user";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {Option} from "@models/option";
import {guid} from '../helper-functions';
import {compare, hash} from "bcryptjs";
import {approvePurchaseRequest} from "../domain/purchase-request";
import {createBalanceAdjustment} from "../domain/balance-adjustment";
import {createChildAccountRecords, parseCreateChildAccount} from "../domain/child-account-provisioning";
import {createGrowthAccrual, type GrowthAccrualDecision} from "../domain/growth-accrual";


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

function settleMockChildGrowth(child: ChildAccount, asOf: Date, checkpointIfZero = false): ChildAccount {
    const decision = createGrowthAccrual(child, asOf, {checkpointIfZero});
    return applyMockGrowthDecision(child, decision);
}

function applyMockGrowthDecision(child: ChildAccount, decision: GrowthAccrualDecision): ChildAccount {
    if (decision.account !== child) Object.assign(child, decision.account);
    if (decision.transaction) mockRequests.push({...decision.transaction, _id: guid()});
    return child;
}

export default class MockClient implements IClient {
    private session: AuthenticatedAccount | null = null;

    async auth(userData: LoginData): Promise<AuthenticatedAccount | null> {
        const user = mockUsers.find(user => user.username === userData.username);
        if (!user || !await compare(userData.password, user.passwordHash)) return null;
        const child = mockChildren.find(child => child.username === userData.username);
        if (child) settleMockChildGrowth(child, new Date());
        const authenticated = {...user, ...child};
        const {passwordHash: _passwordHash, ...safeAccount} = authenticated;
        this.session = safeAccount;
        return this.session;
    }

    getSession(): Promise<AuthenticatedAccount | null> {
        if (this.session?.isChildAccount && this.session._id) {
            const child = mockChildren.find(candidate => candidate._id === this.session?._id);
            if (child) this.session = {...this.session, ...settleMockChildGrowth(child, new Date())};
        }
        return Promise.resolve(this.session);
    }

    logout(): Promise<void> {
        this.session = null;
        return Promise.resolve();
    }

    //Child CRUD
    async addChildUser(childData: CreateChildAccountInput): Promise<ChildAccount| null> {
        if (!this.session?._id || this.session.isChildAccount) throw new Error("Guardian access required");
        const requestData = parseCreateChildAccount(childData);
        if (!requestData) throw new Error("Invalid child account");
        if (mockUsers.some(user => user.username === requestData.username)) {
            throw new Error("Username is already in use");
        }

        const records = createChildAccountRecords({
            childId: guid(),
            familyId: this.session._id,
            username: requestData.username,
            displayName: requestData.displayName,
            passwordHash: await hash(requestData.password, 12),
            balance: requestData.balance,
            interest: requestData.interest,
            createdAt: new Date(),
        });
        mockUsers.push(records.user);
        mockChildren.push(records.childAccount);
        mockRequests.push({...records.openingTransaction, _id: guid()});
        return records.childAccount;
    }

    getChildAccounts(parentId: string): Promise<ChildAccount[]|null> {
        return Promise.resolve(mockChildren
            .filter(child => child.parentId === parentId)
            .map(child => settleMockChildGrowth(child, new Date())));
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
            if (child) resolve(mockRequests.filter(request => request.childId === child._id && request.approved === ApprovalStatus.Pending))
        });
    }

    getPendingRequestsForParent(parentUserId: string, options?: Option): Promise<Transaction[]> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            const parent = mockUsers.find(user => user._id === parentUserId);
            if (!parent) reject(new Error(`User with id ${parentUserId} not found`));
            resolve(mockRequests.filter(request => mockChildren.filter(child => child.parentId === parentUserId).map(child => child._id).includes(request.childId)  && request.approved === ApprovalStatus.Pending));
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
            if (transactionIndex === -1) {
                reject(new Error(`Transaction with id ${transaction._id} not found`));
                return;
            }
            const transactionToApprove = mockRequests[transactionIndex];
            const child = mockChildren.find(child => child._id === transactionToApprove.childId);
            if (!child?._id || !this.session?._id || this.session.isChildAccount || child.parentId !== this.session._id) {
                reject(new Error('Request not found'));
                return;
            }
            const approvedAt = new Date();
            const growth = createGrowthAccrual(child, approvedAt, {checkpointIfZero: true});
            const decision = approvePurchaseRequest(transactionToApprove, growth.account, this.session._id, approvedAt);
            if (!decision.ok) {
                reject(new Error(decision.reason));
                return;
            }
            applyMockGrowthDecision(child, growth);
            Object.assign(transactionToApprove, decision.transaction);
            child.balance = decision.balance;
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
            if (child) resolve(settleMockChildGrowth(child, new Date()));
            else reject(new Error(`Child with id ${childUserId} not found`));
        });
    }

    adjustBalance(childUserId: string, adjustment: number, options?: Option): Promise<ChildAccount> {
        return new Promise((resolve, reject) => {
            if (options?.error) reject(new Error(options.error));
            const child = mockChildren.find(child => child._id === childUserId);
            if (!child || !this.session?._id || this.session.isChildAccount || child.parentId !== this.session._id) {
                reject(new Error(`Child with id ${childUserId} not found`));
                return;
            }
            const recordedAt = new Date();
            const growth = createGrowthAccrual(child, recordedAt, {checkpointIfZero: true});
            const decision = createBalanceAdjustment(growth.account, childUserId, adjustment, this.session._id, recordedAt);
            if (!decision.ok) {
                reject(new Error(decision.reason === "INSUFFICIENT_BALANCE"
                    ? "Adjustment cannot make the balance negative"
                    : "Adjustment must be a non-zero finite number"));
                return;
            }
            applyMockGrowthDecision(child, growth);
            mockRequests.push({...decision.transaction, _id: guid()});
            child.balance = decision.balance;
            resolve(child);
        })
    }

}

