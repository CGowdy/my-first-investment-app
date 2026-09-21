/** @jest-environment node */

import type {ClientSession} from "mongodb";
import type {ChildAccount} from "@models/child-account";
import {insertOneOrThrow, updateOneByIdOrThrow} from "@server/database/mongodb";
import {settleChildGrowth} from "./settle-child-growth";

jest.mock("@server/database/mongodb", () => ({
    Collection: {Transactions: "transactions", ChildAccounts: "childaccounts"},
    insertOneOrThrow: jest.fn(),
    updateOneByIdOrThrow: jest.fn(),
}));

const mockedInsertOne = jest.mocked(insertOneOrThrow);
const mockedUpdateOneById = jest.mocked(updateOneByIdOrThrow);
const databaseSession = {} as ClientSession;
const child: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    isChildAccount: true,
    parentId: "guardian-1",
    balance: 1000,
    balanceLastUpdated: new Date("2025-01-01T12:00:00.000Z"),
    interest: 5,
};

describe("settleChildGrowth", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedInsertOne.mockResolvedValue({insertedId: "growth-1"});
        mockedUpdateOneById.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
    });

    it("writes the ledger entry and balance in the caller's transaction", async () => {
        const asOf = new Date("2025-01-31T12:00:00.000Z");

        const account = await settleChildGrowth(child, asOf, databaseSession);

        expect(account.balance).toBe(1004.12);
        expect(mockedInsertOne).toHaveBeenCalledWith("transactions", expect.objectContaining({
            amount: 4.12,
            originalBalance: 1000,
            finalBalance: 1004.12,
        }), databaseSession);
        expect(mockedUpdateOneById).toHaveBeenCalledWith("childaccounts", "child-1", {
            balance: 1004.12,
            balanceLastUpdated: asOf,
        }, databaseSession);
    });

    it("does not write when no full day has elapsed", async () => {
        const account = await settleChildGrowth(child, new Date("2025-01-01T23:00:00.000Z"), databaseSession);

        expect(account).toBe(child);
        expect(mockedInsertOne).not.toHaveBeenCalled();
        expect(mockedUpdateOneById).not.toHaveBeenCalled();
    });

    it("checkpoints sub-cent growth before a principal change without a zero-value ledger entry", async () => {
        const asOf = new Date("2025-01-02T12:00:00.000Z");
        const account = await settleChildGrowth({...child, balance: 0.01, interest: 1}, asOf, databaseSession, {
            checkpointIfZero: true,
        });

        expect(account.balanceLastUpdated).toBe(asOf);
        expect(mockedInsertOne).not.toHaveBeenCalled();
        expect(mockedUpdateOneById).toHaveBeenCalledWith("childaccounts", "child-1", {
            balance: 0.01,
            balanceLastUpdated: asOf,
        }, databaseSession);
    });

    it("checkpoints a same-day principal change without creating a growth entry", async () => {
        const asOf = new Date("2025-01-01T23:00:00.000Z");

        const account = await settleChildGrowth(child, asOf, databaseSession, {checkpointIfZero: true});

        expect(account.balanceLastUpdated).toBe(asOf);
        expect(mockedInsertOne).not.toHaveBeenCalled();
        expect(mockedUpdateOneById).toHaveBeenCalledWith("childaccounts", "child-1", {
            balance: 1000,
            balanceLastUpdated: asOf,
        }, databaseSession);
    });
});
