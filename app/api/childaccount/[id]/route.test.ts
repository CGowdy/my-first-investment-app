/** @jest-environment node */

import type {ChildAccount} from "@models/child-account";
import type {ClientSession} from "mongodb";
import {findById, withMongoTransaction} from "../../mongoDataAPIHelper";
import {readSession} from "../../../server/auth/session";
import {settleChildGrowth} from "../../../server/growth/settle-child-growth";
import {GET} from "./route";

jest.mock("../../mongoDataAPIHelper", () => ({
    Collection: {ChildAccounts: "childaccounts"},
    findById: jest.fn(),
    withMongoTransaction: jest.fn(),
}));

jest.mock("../../../server/auth/session", () => ({readSession: jest.fn()}));
jest.mock("../../../server/growth/settle-child-growth", () => ({settleChildGrowth: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedSettleChildGrowth = jest.mocked(settleChildGrowth);
const databaseSession = {} as ClientSession;

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
        mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
        mockedSettleChildGrowth.mockResolvedValue(child);
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
        expect(mockedSettleChildGrowth).not.toHaveBeenCalled();
    });

    it("settles growth before returning an owned account", async () => {
        mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});
        mockedSettleChildGrowth.mockResolvedValue({...child, balance: 26});

        const response = await GET(new Request("http://localhost/api/childaccount/child-1"), routeParams);

        expect(response.status).toBe(200);
        expect(mockedFindById).toHaveBeenCalledWith("childaccounts", childId, databaseSession);
        expect(mockedSettleChildGrowth).toHaveBeenCalledWith(child, expect.any(Date), databaseSession);
        await expect(response.json()).resolves.toMatchObject({balance: 26});
    });

});
