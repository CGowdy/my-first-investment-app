/** @jest-environment node */

import type {ChildAccount} from "@models/child-account";
import type {ClientSession} from "mongodb";
import {findById, updateOneByIdOrThrow, withMongoTransaction} from "@server/database/mongodb";
import {hashPassword} from "../../../server/auth/password";
import {readSession} from "../../../server/auth/session";
import {settleChildGrowth} from "../../../server/growth/settle-child-growth";
import {GET, PATCH} from "./route";

jest.mock("@server/database/mongodb", () => ({
	Collection: {ChildAccounts: "childaccounts", Users: "users"},
	findById: jest.fn(),
	updateOneByIdOrThrow: jest.fn(),
	withMongoTransaction: jest.fn(),
	ensureUserUsernameUniqueIndex: jest.fn(),
	isDuplicateKeyError: jest.fn(() => false),
}));

jest.mock("../../../server/auth/session", () => ({readSession: jest.fn()}));
jest.mock("../../../server/auth/password", () => ({hashPassword: jest.fn()}));
jest.mock("../../../server/growth/settle-child-growth", () => ({settleChildGrowth: jest.fn()}));

const mockedReadSession = jest.mocked(readSession);
const mockedFindById = jest.mocked(findById);
const mockedUpdateOneById = jest.mocked(updateOneByIdOrThrow);
const mockedWithMongoTransaction = jest.mocked(withMongoTransaction);
const mockedHashPassword = jest.mocked(hashPassword);
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
		mockedHashPassword.mockResolvedValue("new-password-hash");
		mockedUpdateOneById.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
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

describe("child account profile updates", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockedReadSession.mockResolvedValue({userId: familyId, familyId, role: "guardian"});
		mockedFindById.mockResolvedValue({document: child});
		mockedWithMongoTransaction.mockImplementation(operation => operation(databaseSession));
		mockedSettleChildGrowth.mockResolvedValue(child);
		mockedHashPassword.mockResolvedValue("new-password-hash");
		mockedUpdateOneById.mockResolvedValue({matchedCount: 1, modifiedCount: 1});
	});

	it("updates an owned child's profile and optional password in one transaction", async () => {
		const response = await PATCH(new Request("http://localhost/api/childaccount/child-1", {
			method: "PATCH",
			body: JSON.stringify({
				displayName: "Kid Updated",
				username: "kid-updated",
				password: "new password",
				interest: 8,
				balance: 999,
			}),
		}), routeParams);

		expect(response.status).toBe(200);
		expect(mockedUpdateOneById).toHaveBeenCalledWith("users", childId, {
			displayName: "Kid Updated",
			username: "kid-updated",
			passwordHash: "new-password-hash",
		}, databaseSession);
		expect(mockedUpdateOneById).toHaveBeenCalledWith("childaccounts", childId, {
			displayName: "Kid Updated",
			username: "kid-updated",
			interest: 8,
		}, databaseSession);
		expect(mockedSettleChildGrowth).toHaveBeenCalledWith(
			child,
			expect.any(Date),
			databaseSession,
			{checkpointIfZero: true},
		);
		await expect(response.json()).resolves.toMatchObject({
			displayName: "Kid Updated",
			username: "kid-updated",
			interest: 8,
			balance: 25,
		});
	});

	it("conceals a child owned by another guardian", async () => {
		mockedReadSession.mockResolvedValue({userId: "guardian-2", familyId: "guardian-2", role: "guardian"});

		const response = await PATCH(new Request("http://localhost/api/childaccount/child-1", {
			method: "PATCH",
			body: JSON.stringify({displayName: "Kid", username: "kid", interest: 5}),
		}), routeParams);

		expect(response.status).toBe(404);
		expect(mockedUpdateOneById).not.toHaveBeenCalled();
	});

	it("leaves the password hash unchanged when the password is blank", async () => {
		const response = await PATCH(new Request("http://localhost/api/childaccount/child-1", {
			method: "PATCH",
			body: JSON.stringify({displayName: "Kid", username: "kid", password: "", interest: 5}),
		}), routeParams);

		expect(response.status).toBe(200);
		expect(mockedHashPassword).not.toHaveBeenCalled();
		expect(mockedUpdateOneById).toHaveBeenCalledWith("users", childId, {
			displayName: "Kid",
			username: "kid",
		}, databaseSession);
	});
});
