/** @jest-environment node */

import {ensureUserUsernameUniqueIndex, findOne, insertOneOrThrow} from "@server/database/mongodb";
import {hashPassword} from "./password";
import {assertSessionConfigured, createSession} from "./session";
import {registerGuardian} from "./register-guardian";

jest.mock("@server/database/mongodb", () => ({
    Collection: {Users: "users"},
    ensureUserUsernameUniqueIndex: jest.fn(),
    findOne: jest.fn(),
    insertOneOrThrow: jest.fn(),
    isDuplicateKeyError: jest.fn(),
}));
jest.mock("./password", () => ({hashPassword: jest.fn()}));
jest.mock("./session", () => ({
    assertSessionConfigured: jest.fn(),
    createSession: jest.fn(),
}));

const mockedAssertSessionConfigured = jest.mocked(assertSessionConfigured);
const mockedEnsureUserUsernameUniqueIndex = jest.mocked(ensureUserUsernameUniqueIndex);
const mockedFindOne = jest.mocked(findOne);
const mockedInsertOneOrThrow = jest.mocked(insertOneOrThrow);
const mockedHashPassword = jest.mocked(hashPassword);
const mockedCreateSession = jest.mocked(createSession);

describe("registerGuardian", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedFindOne.mockResolvedValue({document: null});
        mockedHashPassword.mockResolvedValue("hashed-password");
        mockedInsertOneOrThrow.mockResolvedValue({insertedId: "guardian-1"});
    });

    it("validates session configuration before persisting and authenticating a guardian", async () => {
        await expect(registerGuardian({
            username: "test-adult",
            displayName: "Test Adult",
            password: "test-pass-123",
        })).resolves.toEqual({
            ok: true,
            account: {
                _id: "guardian-1",
                username: "test-adult",
                displayName: "Test Adult",
                isChildAccount: false,
            },
        });

        expect(mockedAssertSessionConfigured).toHaveBeenCalled();
        expect(mockedAssertSessionConfigured.mock.invocationCallOrder[0])
            .toBeLessThan(mockedInsertOneOrThrow.mock.invocationCallOrder[0]);
        expect(mockedEnsureUserUsernameUniqueIndex).toHaveBeenCalled();
        expect(mockedInsertOneOrThrow).toHaveBeenCalledWith("users", {
            username: "test-adult",
            displayName: "Test Adult",
            passwordHash: "hashed-password",
            isChildAccount: false,
        });
        expect(mockedCreateSession).toHaveBeenCalledWith({
            userId: "guardian-1",
            familyId: "guardian-1",
            role: "guardian",
        });
    });

    it("does not mutate an existing username", async () => {
        mockedFindOne.mockResolvedValue({document: {
            _id: "guardian-1",
            username: "test-adult",
            displayName: "Test Adult",
            passwordHash: "hash",
        }});

        await expect(registerGuardian({
            username: "test-adult",
            displayName: "Test Adult",
            password: "test-pass-123",
        })).resolves.toEqual({ok: false, reason: "USERNAME_TAKEN"});
        expect(mockedInsertOneOrThrow).not.toHaveBeenCalled();
        expect(mockedCreateSession).not.toHaveBeenCalled();
    });
});
