/** @jest-environment node */

import type {ChildAccount} from "@models/child-account";
import {findById} from "../../mongoDataAPIHelper";
import {readSession} from "../../../server/auth/session";
import {GET} from "./route";

jest.mock("../../mongoDataAPIHelper", () => ({
    Collection: {ChildAccounts: "childaccounts"},
    findById: jest.fn(),
}));

jest.mock("../../../server/auth/session", () => ({readSession: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);

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

});
