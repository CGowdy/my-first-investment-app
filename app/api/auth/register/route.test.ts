/** @jest-environment node */

import {registerGuardian} from "../../../server/auth/register-guardian";
import {POST} from "./route";

jest.mock("../../../server/auth/register-guardian", () => ({registerGuardian: jest.fn()}));

const mockedRegisterGuardian = jest.mocked(registerGuardian);

function registration(body: unknown): Request {
    return new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

describe("guardian registration", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        mockedRegisterGuardian.mockResolvedValue({
            ok: true,
            account: {
                _id: "guardian-1",
                username: "test-adult",
                displayName: "Test Adult",
                isChildAccount: false,
            },
        });
    });

    it("creates a guardian and starts a guardian session", async () => {
        const response = await POST(registration({
            username: "test-adult",
            displayName: "Test Adult",
            password: "test-pass-123",
        }));

        expect(response.status).toBe(201);
        expect(mockedRegisterGuardian).toHaveBeenCalledWith({
            username: "test-adult",
            displayName: "Test Adult",
            password: "test-pass-123",
        });
        await expect(response.json()).resolves.toEqual({
            _id: "guardian-1",
            username: "test-adult",
            displayName: "Test Adult",
            isChildAccount: false,
        });
    });

    it("rejects an invalid registration before accessing MongoDB", async () => {
        const response = await POST(registration({
            username: "test-adult",
            displayName: "Test Adult",
            password: "",
        }));

        expect(response.status).toBe(400);
        expect(mockedRegisterGuardian).not.toHaveBeenCalled();
    });

    it("rejects a username that is already registered", async () => {
        mockedRegisterGuardian.mockResolvedValue({ok: false, reason: "USERNAME_TAKEN"});

        const response = await POST(registration({
            username: "test-adult",
            displayName: "Test Adult",
            password: "test-pass-123",
        }));

        expect(response.status).toBe(409);
        expect(mockedRegisterGuardian).toHaveBeenCalled();
    });
});
