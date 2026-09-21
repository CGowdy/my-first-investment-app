/** @jest-environment node */

import type {ClientSession} from "mongodb";
import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus} from "@models/transaction";
import {findById, insertOne, updateOneById, withMongoTransaction} from "@server/database/mongodb";
import {readSession} from "../../../../server/auth/session";
import {createGrowthAccrual} from "../../../../domain/growth-accrual";
import {persistChildGrowth} from "../../../../server/growth/settle-child-growth";
import {POST} from "./route";

jest.mock("@server/database/mongodb", () => ({
    Collection: {Transactions: "transactions", ChildAccounts: "childaccounts"},
    findById: jest.fn(),
    insertOne: jest.fn(),
    updateOneById: jest.fn(),
    withMongoTransaction: jest.fn(),
}));
jest.mock("../../../../server/auth/session", () => ({readSession: jest.fn()}));
jest.mock("../../../../domain/growth-accrual", () => ({createGrowthAccrual: jest.fn()}));
jest.mock("../../../../server/growth/settle-child-growth", () => ({persistChildGrowth: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedInsertOne = jest.mocked(insertOne);
const mockedUpdateOneById = jest.mocked(updateOneById);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedCreateGrowthAccrual = jest.mocked(createGrowthAccrual);
const mockedPersistChildGrowth = jest.mocked(persistChildGrowth);
const databaseSession = {} as ClientSession;
const childId = "507f1f77bcf86cd799439011";
const familyId = "guardian-1";
const child: ChildAccount = {
    _id: childId,
    username: "kid",
    displayName: "Kid",
    parentId: familyId,
    balance: 25,
    balanceLastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    interest: 5,
};
const routeParams = {params: Promise.resolve({id: childId})};

function request(amount: number): Request {
    return new Request("http://localhost/api/childaccount/id/adjustment", {
        method: "POST",
        body: JSON.stringify({amount, childId: "attacker", approved: ApprovalStatus.Rejected}),
    });
}

describe("balance adjustment route", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});
        mockedFindById.mockResolvedValue({document: child});
        mockedInsertOne.mockResolvedValue({insertedId: "transaction-1"});
        mockedUpdateOneById.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
        mockedCreateGrowthAccrual.mockReturnValue({accrued: false, elapsedDays: 0, account: child});
        mockedPersistChildGrowth.mockResolvedValue(child);
        mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
    });

    it("records and applies an owned adjustment in one database transaction", async () => {
        const response = await POST(request(10), routeParams);

        expect(response.status).toBe(200);
        expect(mockedInsertOne).toHaveBeenCalledWith("transactions", {
            amount: 10,
            childId,
            originalBalance: 25,
            finalBalance: 35,
            approved: ApprovalStatus.AdminApproved,
            reason: "Parent Balance Adjustment",
            date: expect.any(Date),
            actorId: familyId,
        }, databaseSession);
        expect(mockedCreateGrowthAccrual).toHaveBeenCalledWith(child, expect.any(Date), {checkpointIfZero: true});
        expect(mockedPersistChildGrowth).toHaveBeenCalledWith(
            child,
            {accrued: false, elapsedDays: 0, account: child},
            databaseSession,
        );
        expect(mockedUpdateOneById).toHaveBeenCalledWith(
            "childaccounts",
            childId,
            {balance: 35},
            databaseSession,
        );
    });

    it("conceals a child owned by another family", async () => {
        mockedFindById.mockResolvedValue({document: {...child, parentId: "guardian-2"}});

        const response = await POST(request(10), routeParams);

        expect(response.status).toBe(404);
        expect(mockedInsertOne).not.toHaveBeenCalled();
        expect(mockedUpdateOneById).not.toHaveBeenCalled();
    });

    it("does not write an overdraft", async () => {
        const response = await POST(request(-30), routeParams);

        expect(response.status).toBe(400);
        expect(mockedInsertOne).not.toHaveBeenCalled();
        expect(mockedUpdateOneById).not.toHaveBeenCalled();
        expect(mockedPersistChildGrowth).not.toHaveBeenCalled();
    });
});
