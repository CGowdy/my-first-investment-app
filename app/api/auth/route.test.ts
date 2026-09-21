/** @jest-environment node */

import type {ClientSession} from "mongodb";
import type {ChildAccount} from "@models/child-account";
import type {StoredUser} from "../../server/auth/types";
import {findById, findOne, withMongoTransaction} from "../mongoDataAPIHelper";
import {verifyPassword} from "../../server/auth/password";
import {createSession, readSession} from "../../server/auth/session";
import {settleChildGrowth} from "../../server/growth/settle-child-growth";
import {GET, POST} from "./route";

jest.mock("../mongoDataAPIHelper", () => ({
    Collection: {Users: "users", ChildAccounts: "childaccounts"},
    findById: jest.fn(),
    findOne: jest.fn(),
    withMongoTransaction: jest.fn(),
}));
jest.mock("../../server/auth/password", () => ({verifyPassword: jest.fn()}));
jest.mock("../../server/auth/session", () => ({
    createSession: jest.fn(),
    deleteSession: jest.fn(),
    readSession: jest.fn(),
}));
jest.mock("../../server/growth/settle-child-growth", () => ({settleChildGrowth: jest.fn()}));

const mockedFindById = jest.mocked(findById);
const mockedFindOne = jest.mocked(findOne);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedVerifyPassword = jest.mocked(verifyPassword);
const mockedCreateSession = jest.mocked(createSession);
const mockedReadSession = jest.mocked(readSession);
const mockedSettleChildGrowth = jest.mocked(settleChildGrowth);
const databaseSession = {} as ClientSession;
const guardian: StoredUser = {
    _id: "guardian-1",
    username: "guardian",
    displayName: "Guardian",
    passwordHash: "hash",
};
const childUser: StoredUser = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    passwordHash: "hash",
    isChildAccount: true,
};
const child: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    isChildAccount: true,
    parentId: "guardian-1",
    balance: 100,
    balanceLastUpdated: new Date("2025-01-01T00:00:00.000Z"),
    interest: 5,
};

function login(username: string): Request {
    return new Request("http://localhost/api/auth", {
        method: "POST",
        body: JSON.stringify({username, password: "password"}),
    });
}

describe("authentication growth settlement", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedVerifyPassword.mockResolvedValue(true);
        mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
        mockedSettleChildGrowth.mockImplementation(async account => ({...account, balance: 101}));
    });

    it("does not open a growth transaction for a guardian login", async () => {
        mockedFindOne.mockResolvedValue({document: guardian});

        const response = await POST(login("guardian"));

        expect(response.status).toBe(200);
        expect(mockedWithMongoTransaction).not.toHaveBeenCalled();
        expect(mockedCreateSession).toHaveBeenCalledWith({
            userId: "guardian-1",
            familyId: "guardian-1",
            role: "guardian",
        });
    });

    it("settles a child account before creating its session response", async () => {
        mockedFindOne
            .mockResolvedValueOnce({document: childUser})
            .mockResolvedValueOnce({document: child});

        const response = await POST(login("kid"));

        expect(response.status).toBe(200);
        expect(mockedSettleChildGrowth).toHaveBeenCalledWith(child, expect.any(Date), databaseSession);
        expect(mockedCreateSession).toHaveBeenCalledWith({
            userId: "child-1",
            familyId: "guardian-1",
            role: "child",
        });
        await expect(response.json()).resolves.toMatchObject({balance: 101});
    });

    it("never promotes a child login when its profile cannot be loaded", async () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
        mockedFindOne
            .mockResolvedValueOnce({document: childUser})
            .mockResolvedValueOnce({document: null});

        const response = await POST(login("kid"));

        expect(response.status).toBe(500);
        expect(mockedCreateSession).not.toHaveBeenCalled();
        consoleError.mockRestore();
    });

    it("settles growth when restoring a child session", async () => {
        mockedReadSession.mockResolvedValue({userId: "child-1", familyId: "guardian-1", role: "child"});
        mockedFindById
            .mockResolvedValueOnce({document: childUser})
            .mockResolvedValueOnce({document: child});

        const response = await GET();

        expect(response.status).toBe(200);
        expect(mockedSettleChildGrowth).toHaveBeenCalledWith(child, expect.any(Date), databaseSession);
        await expect(response.json()).resolves.toMatchObject({balance: 101});
    });
});
