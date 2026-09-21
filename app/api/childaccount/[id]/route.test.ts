/** @jest-environment node */

import type {ChildAccount} from "@models/child-account";
import {findById, updateOneById} from "../../mongoDataAPIHelper";
import {readSession} from "../../../server/auth/session";
import {GET, PUT} from "./route";

jest.mock("../../mongoDataAPIHelper", () => ({
    Collection: {ChildAccounts: "childaccounts"},
    findById: jest.fn(),
    updateOneById: jest.fn(),
}));

jest.mock("../../../server/auth/session", () => ({readSession: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedUpdateOneById = jest.mocked(updateOneById);

const childId = "child-1";
const familyId = "guardian-1";
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

const routeParams = {params: Promise.resolve({id: childId})};

describe("child account route authorization", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedFindById.mockResolvedValue({document: child});
    });

    it("rejects unauthenticated reads before loading family data", async () => {
        mockedReadSession.mockResolvedValue(null);

        const response = await GET(new Request("http://localhost/api/childaccount/child-1"), routeParams);

        expect(response.status).toBe(401);
        expect(mockedFindById).not.toHaveBeenCalled();
    });

    it("rejects a guardian from another family", async () => {
        mockedReadSession.mockResolvedValue({userId: "guardian-2", familyId: "guardian-2", role: "guardian"});

        const response = await GET(new Request("http://localhost/api/childaccount/child-1"), routeParams);

        expect(response.status).toBe(404);
    });

    it("does not let a child mutate their balance", async () => {
        mockedReadSession.mockResolvedValue({userId: childId, familyId, role: "child"});
        const request = new Request("http://localhost/api/childaccount/child-1", {
            method: "PUT",
            body: JSON.stringify({balance: 100}),
        });

        const response = await PUT(request, routeParams);

        expect(response.status).toBe(404);
        expect(mockedUpdateOneById).not.toHaveBeenCalled();
    });

    it("only persists the allowed balance field for the owning guardian", async () => {
        mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});
        mockedUpdateOneById.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
        const request = new Request("http://localhost/api/childaccount/child-1", {
            method: "PUT",
            body: JSON.stringify({balance: 100, parentId: "attacker", interest: 999}),
        });

        const response = await PUT(request, routeParams);

        expect(response.status).toBe(200);
        expect(mockedUpdateOneById).toHaveBeenCalledWith("childaccounts", childId, {balance: 100});
    });
});
