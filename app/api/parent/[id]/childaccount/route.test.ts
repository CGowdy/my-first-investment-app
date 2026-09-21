/** @jest-environment node */

import type {ClientSession} from "mongodb";
import type {ChildAccount} from "@models/child-account";
import {findMany, withMongoTransaction} from "@server/database/mongodb";
import {readSession} from "../../../../server/auth/session";
import {settleChildGrowth} from "../../../../server/growth/settle-child-growth";
import {GET} from "./route";

jest.mock("@server/database/mongodb", () => ({
    Collection: {ChildAccounts: "childaccounts"},
    findMany: jest.fn(),
    withMongoTransaction: jest.fn(),
}));
jest.mock("../../../../server/auth/session", () => ({readSession: jest.fn()}));
jest.mock("../../../../server/growth/settle-child-growth", () => ({settleChildGrowth: jest.fn()}));

const mockedFindMany = jest.mocked(findMany);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedReadSession = jest.mocked(readSession);
const mockedSettleChildGrowth = jest.mocked(settleChildGrowth);
const databaseSession = {} as ClientSession;
const child: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    parentId: "guardian-1",
    balance: 100,
    balanceLastUpdated: new Date("2025-01-01T00:00:00.000Z"),
    interest: 5,
};
const routeParams = {params: Promise.resolve({id: "guardian-1"})};

describe("guardian child list growth settlement", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedReadSession.mockResolvedValue({userId: "guardian-1", familyId: "guardian-1", role: "guardian"});
        mockedFindMany.mockResolvedValue({documents: [child]});
        mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
        mockedSettleChildGrowth.mockResolvedValue({...child, balance: 101});
    });

    it("settles each owned child's growth before returning the list", async () => {
        const response = await GET(new Request("http://localhost/api/parent/guardian-1/childaccount"), routeParams);

        expect(response.status).toBe(200);
        expect(mockedFindMany).toHaveBeenCalledWith(
            "childaccounts",
            {parentId: "guardian-1"},
            databaseSession,
        );
        expect(mockedSettleChildGrowth).toHaveBeenCalledWith(child, expect.any(Date), databaseSession);
        await expect(response.json()).resolves.toEqual([expect.objectContaining({balance: 101})]);
    });

    it("rejects another family before opening a database transaction", async () => {
        const response = await GET(
            new Request("http://localhost/api/parent/other/childaccount"),
            {params: Promise.resolve({id: "other"})},
        );

        expect(response.status).toBe(403);
        expect(mockedWithMongoTransaction).not.toHaveBeenCalled();
    });
});
