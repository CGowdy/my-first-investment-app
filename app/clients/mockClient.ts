import IClient from '@models/client';
import type {AuthenticatedAccount, GuardianRegistrationData, LoginData} from "@models/auth";
import {ChildAccount, CreateChildAccountInput} from "@models/child-account";
import type {UpdateChildAccountInput} from "@models/child-account-profile";
import {IUser} from "@models/user";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {Option} from "@models/option";
import {guid} from '../helper-functions';
import {compare, hash} from "bcryptjs";
import {approvePurchaseRequest} from "../domain/purchase-request";
import {createBalanceAdjustment} from "../domain/balance-adjustment";
import {createChildAccountRecords, parseCreateChildAccount} from "../domain/child-account-provisioning";
import {applyChildAccountProfileUpdate, parseUpdateChildAccount} from "../domain/child-account-profile";
import {createGrowthAccrual, type GrowthAccrualDecision} from "../domain/growth-accrual";
import {parseGuardianRegistration} from "../domain/guardian-registration";


type MockUser = IUser & {passwordHash: string};

const mockPasswordHash = "$2b$12$198GTcO3AK1lq.dt7ZNZV.gdHaOlhOB23msT2Ga0MwALWj2WhdDFm";
const manualTestPasswordHash = "$2b$12$5mTxvwSKsTjEB1FtLcp.EOy5F4OKTNqCVDfXaD5p0MT9/EEtMO.Mu";

export const mockChildren: ChildAccount[] = [
    {_id: "2", username: 'child1', displayName: 'Child 1', parentId: "1", balance: 250, balanceLastUpdated: new Date(), interest: 12},
    {_id: "123", username: 'child2', displayName: 'Child 2', parentId: "1", balance: 1150, balanceLastUpdated: new Date(), interest: 12},
    {_id: "manual-child", username: 'test-child', displayName: 'Test Child', parentId: "manual-parent", balance: 100, balanceLastUpdated: new Date(), interest: 5},
];
export const mockUsers: MockUser[] = [
    {_id: "1", username: 'parent1', passwordHash: mockPasswordHash, displayName: 'Parent One'},
    {_id: "2", username: 'child1', passwordHash: mockPasswordHash, displayName: 'Child 1', isChildAccount: true},
    {_id: "123", username: 'child2', passwordHash: mockPasswordHash, displayName: 'Child 2', isChildAccount: true},
    {_id: "manual-parent", username: 'test-adult', passwordHash: manualTestPasswordHash, displayName: 'Test Adult', isChildAccount: false},
    {_id: "manual-child", username: 'test-child', passwordHash: manualTestPasswordHash, displayName: 'Test Child', isChildAccount: true},
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

    async registerGuardian(value: GuardianRegistrationData): Promise<AuthenticatedAccount> {
        const registration = parseGuardianRegistration(value);
        if (!registration) throw new Error("Enter a username, display name, and non-empty password");
        if (mockUsers.some(user => user.username === registration.username)) {
            throw new Error("Username is already in use");
        }

        const guardian: MockUser = {
            _id: guid(),
            username: registration.username,
            displayName: registration.displayName,
            passwordHash: await hash(registration.password, 12),
            isChildAccount: false,
        };
        mockUsers.push(guardian);
        const {passwordHash: _passwordHash, ...safeAccount} = guardian;
        this.session = safeAccount;
        return safeAccount;
    }

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

    async updateChildAccount(childId: string, childData: UpdateChildAccountInput): Promise<ChildAccount> {
        const child = mockChildren.find(candidate => candidate._id === childId);
        if (!child || !this.session?._id || this.session.isChildAccount || child.parentId !== this.session._id) {
            throw new Error("Child account not found");
        }

        const update = parseUpdateChildAccount(childData);
        if (!update) throw new Error("Enter valid child account details");
        if (mockUsers.some(user => user._id !== childId && user.username === update.username)) {
            throw new Error("Username is already in use");
        }

        const user = mockUsers.find(candidate => candidate._id === childId);
        if (!user) throw new Error("Child account not found");

        Object.assign(user, {
            displayName: update.displayName,
            username: update.username,
            ...(update.password ? {passwordHash: await hash(update.password, 12)} : {}),
        });
        const settledChild = settleMockChildGrowth(child, new Date(), true);
        Object.assign(child, applyChildAccountProfileUpdate(settledChild, update));
        return child;
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
			const canSubmit = child && this.session?._id && (
				(this.session.isChildAccount && this.session._id === child._id)
				|| (!this.session.isChildAccount && this.session._id === child.parentId)
			);
			if (child && canSubmit) {
				newRequest._id ??= guid();
				newRequest.actorId = this.session!._id;
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

    async setBalance(childUserId: string, balance: number, options?: Option): Promise<ChildAccount> {
        if (!Number.isFinite(balance) || balance < 0 || balance > 1_000_000_000) {
            throw new Error("Balance must be a non-negative number");
        }
        const child = mockChildren.find(candidate => candidate._id === childUserId);
        if (!child || !this.session?._id || this.session.isChildAccount || child.parentId !== this.session._id) {
            throw new Error(`Child with id ${childUserId} not found`);
        }
        const settledChild = settleMockChildGrowth(child, new Date(), true);
        const adjustment = balance - settledChild.balance;
        if (adjustment === 0) return settledChild;
        return this.adjustBalance(childUserId, adjustment, options);
    }

}

