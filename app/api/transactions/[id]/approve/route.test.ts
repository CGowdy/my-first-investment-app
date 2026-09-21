/** @jest-environment node */

import {ApprovalStatus, type Transaction} from "@models/transaction";
import type {ChildAccount} from "@models/child-account";
import type {ClientSession} from "mongodb";
import {findById, findMany, updateOne, updateOneById, withMongoTransaction} from "@server/database/mongodb";
import {readSession} from "../../../../server/auth/session";
import {POST} from "./route";
import {createGrowthAccrual} from "../../../../domain/growth-accrual";
import {persistChildGrowth} from "../../../../server/growth/settle-child-growth";

jest.mock("@server/database/mongodb", () => ({
    Collection: {Transactions: "transactions", ChildAccounts: "childaccounts"},
    findById: jest.fn(),
    findMany: jest.fn(),
    updateOne: jest.fn(),
    updateOneById: jest.fn(),
    withMongoTransaction: jest.fn(),
}));

jest.mock("../../../../server/auth/session", () => ({readSession: jest.fn()}));
jest.mock("../../../../domain/growth-accrual", () => ({createGrowthAccrual: jest.fn()}));
jest.mock("../../../../server/growth/settle-child-growth", () => ({persistChildGrowth: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedFindMany = jest.mocked(findMany);
const mockedUpdateOne = jest.mocked(updateOne);
const mockedUpdateOneById = jest.mocked(updateOneById);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedCreateGrowthAccrual = jest.mocked(createGrowthAccrual);
const mockedPersistChildGrowth = jest.mocked(persistChildGrowth);
const databaseSession = {} as ClientSession;

const transactionId = "507f1f77bcf86cd799439012";
const childId = "507f1f77bcf86cd799439011";
const familyId = "guardian-1";
const transaction: Transaction = {
    _id: transactionId,
    amount: 10,
    childId,
    reason: "Book",
    approved: ApprovalStatus.Pending,
    date: new Date("2026-01-01T00:00:00.000Z"),
};
const child: ChildAccount = {
    _id: childId,
    username: "kid",
    displayName: "Kid",
    isChildAccount: true,
    parentId: familyId,
    balance: 25,
    balanceLastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    interest: 5,
};
const routeParams = {params: Promise.resolve({id: transactionId})};

describe("request approval authorization and transitions", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});
        mockedFindMany.mockResolvedValue({documents: []});
        mockedUpdateOne.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
        mockedUpdateOneById.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
        mockedCreateGrowthAccrual.mockImplementation(account => ({accrued: false, elapsedDays: 0, account}));
        mockedPersistChildGrowth.mockImplementation(async account => account);
        mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
    });

    it("conceals requests owned by another family", async () => {
        mockedFindById
            .mockResolvedValueOnce({document: transaction})
            .mockResolvedValueOnce({document: {...child, parentId: "guardian-2"}});

        const response = await POST(new Request("http://localhost/api/transactions/id/approve", {method: "POST"}), routeParams);

        expect(response.status).toBe(404);
        expect(mockedUpdateOne).not.toHaveBeenCalled();
    });

    it("rejects replaying a terminal request", async () => {
        mockedFindById
            .mockResolvedValueOnce({document: {...transaction, approved: ApprovalStatus.Approved}})
            .mockResolvedValueOnce({document: child});

        const response = await POST(new Request("http://localhost/api/transactions/id/approve", {method: "POST"}), routeParams);

        expect(response.status).toBe(409);
        expect(mockedUpdateOne).not.toHaveBeenCalled();
        expect(mockedPersistChildGrowth).not.toHaveBeenCalled();
    });

    it("conditionally transitions an owned pending request", async () => {
        mockedFindById
            .mockResolvedValueOnce({document: transaction})
            .mockResolvedValueOnce({document: child});

        const response = await POST(new Request("http://localhost/api/transactions/id/approve", {method: "POST"}), routeParams);

        expect(response.status).toBe(200);
        expect(mockedUpdateOne).toHaveBeenCalledWith("transactions", {
            _id: {$oid: transactionId},
            approved: ApprovalStatus.Pending,
        }, {
            approved: ApprovalStatus.Approved,
            originalBalance: 25,
            finalBalance: 15,
            actorId: familyId,
            approvedAt: expect.any(Date),
        }, databaseSession);
        expect(mockedUpdateOneById).toHaveBeenCalledWith(
            "childaccounts",
            childId,
            {balance: 15},
            databaseSession,
        );
    });

    it("rejects a request that exceeds the stored balance without writing", async () => {
        mockedFindById
            .mockResolvedValueOnce({document: transaction})
            .mockResolvedValueOnce({document: {...child, balance: 5}});

        const response = await POST(new Request("http://localhost/api/transactions/id/approve", {method: "POST"}), routeParams);

        expect(response.status).toBe(409);
        expect(mockedUpdateOne).not.toHaveBeenCalled();
        expect(mockedUpdateOneById).not.toHaveBeenCalled();
        expect(mockedPersistChildGrowth).not.toHaveBeenCalled();
    });

    it("does not update the balance when a concurrent request wins the transition", async () => {
        mockedFindById
            .mockResolvedValueOnce({document: transaction})
            .mockResolvedValueOnce({document: child});
        mockedUpdateOne.mockResolvedValue({matchedCount: 0, modifiedCount: 0});

        const response = await POST(new Request("http://localhost/api/transactions/id/approve", {method: "POST"}), routeParams);

        expect(response.status).toBe(409);
        expect(mockedUpdateOneById).not.toHaveBeenCalled();
        expect(mockedPersistChildGrowth).not.toHaveBeenCalled();
    });
});
