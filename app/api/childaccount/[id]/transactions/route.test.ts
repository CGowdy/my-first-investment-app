/** @jest-environment node */

import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus} from "@models/transaction";
import {findById, findMany, insertOne} from "@server/database/mongodb";
import {readSession} from "../../../../server/auth/session";
import {POST} from "./route";

jest.mock("@server/database/mongodb", () => ({
    Collection: {Transactions: "transactions", ChildAccounts: "childaccounts"},
    findById: jest.fn(),
    findMany: jest.fn(),
    insertOne: jest.fn(),
}));
jest.mock("../../../../server/auth/session", () => ({readSession: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedFindMany = jest.mocked(findMany);
const mockedInsertOne = jest.mocked(insertOne);
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

function request(): Request {
    return new Request("http://localhost/api/childaccount/id/transactions", {
        method: "POST",
        body: JSON.stringify({amount: 10, reason: "Art supplies", actorId: "attacker"}),
    });
}

describe("purchase request route", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedFindById.mockResolvedValue({document: child});
        mockedInsertOne.mockResolvedValue({insertedId: "request-1"});
        mockedFindMany.mockResolvedValue({documents: []});
    });

    it("lets the owning guardian submit on the child's behalf and records the guardian actor", async () => {
        mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});

        const response = await POST(request(), routeParams);

        expect(response.status).toBe(200);
        expect(mockedInsertOne).toHaveBeenCalledWith("transactions", {
            amount: 10,
            originalBalance: 25,
            childId,
            reason: "Art supplies",
            approved: ApprovalStatus.Pending,
            date: expect.any(Date),
            actorId: familyId,
        });
    });

    it("still lets the child submit their own request", async () => {
        mockedReadSession.mockResolvedValue({userId: childId, familyId, role: "child"});

        const response = await POST(request(), routeParams);

        expect(response.status).toBe(200);
        expect(mockedInsertOne).toHaveBeenCalledWith("transactions", expect.objectContaining({actorId: childId}));
    });

    it("conceals a child owned by another guardian", async () => {
        mockedReadSession.mockResolvedValue({userId: "guardian-2", familyId: "guardian-2", role: "guardian"});

        const response = await POST(request(), routeParams);

        expect(response.status).toBe(404);
        expect(mockedInsertOne).not.toHaveBeenCalled();
    });
});
