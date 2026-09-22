/** @jest-environment node */

import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";
import type {ClientSession} from "mongodb";
import {findById, findMany, withMongoTransaction} from "@server/database/mongodb";
import {readSession} from "../../../../server/auth/session";
import {settleChildGrowth} from "../../../../server/growth/settle-child-growth";
import {GET} from "./route";

jest.mock("@server/database/mongodb", () => ({
    Collection: {ChildAccounts: "childaccounts", Transactions: "transactions"},
    findById: jest.fn(),
    findMany: jest.fn(),
    withMongoTransaction: jest.fn(),
}));
jest.mock("../../../../server/auth/session", () => ({readSession: jest.fn()}));
jest.mock("../../../../server/growth/settle-child-growth", () => ({settleChildGrowth: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedFindMany = jest.mocked(findMany);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedSettleChildGrowth = jest.mocked(settleChildGrowth);
const databaseSession = {} as ClientSession;
const child: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    parentId: "guardian-1",
    balance: 100,
    balanceLastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    interest: 5,
};
const spending: Transaction = {
    _id: "spending-1",
    childId: "child-1",
    amount: 12,
    reason: "Book",
    approved: ApprovalStatus.Approved,
    date: new Date("2026-01-02T00:00:00.000Z"),
};

describe("child report route", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedReadSession.mockResolvedValue({userId: "guardian-1", familyId: "guardian-1", role: "guardian"});
        mockedFindById.mockResolvedValue({document: child});
        mockedFindMany.mockResolvedValue({documents: [spending]});
        mockedSettleChildGrowth.mockResolvedValue(child);
        mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
    });

    it("settles growth and returns an authorized child's report", async () => {
        const response = await GET(new Request("http://localhost/api/childaccount/child-1/report"), {
            params: Promise.resolve({id: "child-1"}),
        });

        expect(response.status).toBe(200);
        expect(mockedSettleChildGrowth).toHaveBeenCalledWith(child, expect.any(Date), databaseSession);
        expect(mockedFindMany).toHaveBeenCalledWith("transactions", {childId: "child-1"}, databaseSession);
        await expect(response.json()).resolves.toMatchObject({
            spending: {total: 12, count: 1},
            growth: {total: 0, count: 0},
        });
    });

    it("conceals a child from another family", async () => {
        mockedReadSession.mockResolvedValue({userId: "guardian-2", familyId: "guardian-2", role: "guardian"});

        const response = await GET(new Request("http://localhost/api/childaccount/child-1/report"), {
            params: Promise.resolve({id: "child-1"}),
        });

        expect(response.status).toBe(404);
        expect(mockedFindMany).not.toHaveBeenCalled();
    });
});
