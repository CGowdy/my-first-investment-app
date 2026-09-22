/** @jest-environment node */

import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";
import {findById, findMany, updateOne} from "@server/database/mongodb";
import {readSession} from "../../../../server/auth/session";
import {POST} from "./route";

jest.mock("@server/database/mongodb", () => ({
    Collection: {Transactions: "transactions", ChildAccounts: "childaccounts"},
    findById: jest.fn(),
    findMany: jest.fn(),
    updateOne: jest.fn(),
}));
jest.mock("../../../../server/auth/session", () => ({readSession: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedFindMany = jest.mocked(findMany);
const mockedUpdateOne = jest.mocked(updateOne);

const familyId = "guardian-1";
const childOne: ChildAccount = {
    _id: "child-1",
    username: "child-one",
    displayName: "Child One",
    parentId: familyId,
    balance: 100,
    balanceLastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    interest: 5,
};
const childTwo: ChildAccount = {...childOne, _id: "child-2", username: "child-two", displayName: "Child Two"};
const deniedRequest: Transaction = {
    _id: "request-to-deny",
    childId: "child-1",
    amount: 10,
    reason: "Decline this one",
    approved: ApprovalStatus.Pending,
    date: new Date("2026-01-02T00:00:00.000Z"),
};
const remainingForChildOne: Transaction = {...deniedRequest, _id: "child-one-remaining", reason: "Child one remaining"};
const remainingForChildTwo: Transaction = {...deniedRequest, _id: "child-two-remaining", childId: "child-2", reason: "Child two remaining"};

describe("request denial response", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});
        mockedFindById
            .mockResolvedValueOnce({document: deniedRequest})
            .mockResolvedValueOnce({document: childOne});
        mockedUpdateOne.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
    });

    it("returns all remaining family requests when siblings also have pending requests", async () => {
        mockedFindMany
            .mockResolvedValueOnce({documents: [childOne, childTwo]})
            .mockResolvedValueOnce({documents: [remainingForChildOne, remainingForChildTwo]});

        const response = await POST(
            new Request("http://localhost/api/transactions/request-to-deny/deny", {method: "POST"}),
            {params: Promise.resolve({id: "request-to-deny"})},
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([
            expect.objectContaining({_id: "child-one-remaining", childId: "child-1"}),
            expect.objectContaining({_id: "child-two-remaining", childId: "child-2"}),
        ]);
    });
});
