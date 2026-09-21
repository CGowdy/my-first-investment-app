/** @jest-environment node */

import type {ClientSession} from "mongodb";
import {
    ensureUserUsernameUniqueIndex,
    findOne,
    insertOneOrThrow,
    isDuplicateKeyError,
    withMongoTransaction,
} from "@server/database/mongodb";
import {readSession} from "../../server/auth/session";
import {hashPassword} from "../../server/auth/password";
import {POST} from "./route";

jest.mock("@server/database/mongodb", () => ({
    Collection: {Users: "users", ChildAccounts: "childaccounts", Transactions: "transactions"},
    ensureUserUsernameUniqueIndex: jest.fn(),
    findOne: jest.fn(),
    insertOneOrThrow: jest.fn(),
    isDuplicateKeyError: jest.fn(error => (error as {code?: number})?.code === 11000),
    withMongoTransaction: jest.fn(),
}));
jest.mock("../../server/auth/session", () => ({readSession: jest.fn()}));
jest.mock("../../server/auth/password", () => ({hashPassword: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedEnsureUserUsernameUniqueIndex = jest.mocked(ensureUserUsernameUniqueIndex);
const mockedFindOne = jest.mocked(findOne);
const mockedInsertOne = jest.mocked(insertOneOrThrow);
const mockedIsDuplicateKeyError = jest.mocked(isDuplicateKeyError);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedHashPassword = jest.mocked(hashPassword);
const databaseSession = {} as ClientSession;
const familyId = "guardian-1";

function request(overrides: Record<string, unknown> = {}): Request {
    return new Request("http://localhost/api/childaccount", {
        method: "POST",
        body: JSON.stringify({
            username: "kid",
            password: "password",
            displayName: "Kid",
            balance: 25,
            interest: 5,
            parentId: "attacker",
            ...overrides,
        }),
    });
}

describe("child account provisioning", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});
        mockedHashPassword.mockResolvedValue("hashed-password");
        mockedEnsureUserUsernameUniqueIndex.mockResolvedValue();
        mockedIsDuplicateKeyError.mockImplementation(error => (error as {code?: number})?.code === 11000);
        mockedFindOne.mockResolvedValue({document: null});
        mockedInsertOne
            .mockResolvedValueOnce({insertedId: "child-1"})
            .mockResolvedValueOnce({insertedId: "opening-1"})
            .mockResolvedValueOnce({insertedId: "child-1"});
        mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
    });

    it("requires a guardian before hashing or writing", async () => {
        mockedReadSession.mockResolvedValue({userId: "child-1", familyId, role: "child"});

        const response = await POST(request());

        expect(response.status).toBe(403);
        expect(mockedHashPassword).not.toHaveBeenCalled();
        expect(mockedWithMongoTransaction).not.toHaveBeenCalled();
    });

    it("rejects a duplicate username without writing", async () => {
        mockedFindOne.mockResolvedValue({document: {
            _id: "existing",
            username: "kid",
            displayName: "Existing",
            passwordHash: "hash",
        }});

        const response = await POST(request());

        expect(response.status).toBe(409);
        expect(mockedInsertOne).not.toHaveBeenCalled();
    });

    it("reports malformed JSON as invalid input", async () => {
        const response = await POST(new Request("http://localhost/api/childaccount", {
            method: "POST",
            body: "{",
        }));

        expect(response.status).toBe(400);
        expect(mockedEnsureUserUsernameUniqueIndex).not.toHaveBeenCalled();
    });

    it("reports a concurrent duplicate-key write as a username conflict", async () => {
        mockedInsertOne.mockReset();
        mockedInsertOne
            .mockResolvedValueOnce({insertedId: "child-1"})
            .mockResolvedValueOnce({insertedId: "opening-1"})
            .mockRejectedValueOnce(Object.assign(new Error("duplicate key"), {code: 11000}));

        const response = await POST(request());

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toMatchObject({error: {code: "USERNAME_TAKEN"}});
        expect(isDuplicateKeyError).toHaveBeenCalled();
    });

    it("creates all child records in the same transaction using server-owned fields", async () => {
        const response = await POST(request());

        expect(response.status).toBe(200);
        expect(mockedInsertOne).toHaveBeenCalledTimes(3);
        for (const call of mockedInsertOne.mock.calls) {
            expect(call[2]).toBe(databaseSession);
        }
        expect(mockedInsertOne.mock.calls[0][1]).toMatchObject({
            username: "kid",
            parentId: familyId,
            balance: 25,
        });
        expect(mockedInsertOne.mock.calls[1][1]).toMatchObject({
            childId: "child-1",
            originalBalance: 0,
            finalBalance: 25,
            actorId: familyId,
        });
        expect(mockedInsertOne.mock.calls[2][1]).toMatchObject({
            _id: "child-1",
            username: "kid",
            passwordHash: "hashed-password",
        });
    });
});
