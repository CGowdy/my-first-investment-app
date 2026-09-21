import {cookies} from "next/headers";
import {assertSessionConfigured, createSession, deleteSession, readSession} from "./session";

jest.mock("next/headers", () => ({
    cookies: jest.fn(),
}));

const cookieStore = {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
};

const mockedCookies = cookies as jest.MockedFunction<typeof cookies>;

describe("server session cookie", () => {
    beforeEach(() => {
        process.env.AUTH_SECRET = "test-only-session-secret-that-is-long-enough";
        jest.clearAllMocks();
        mockedCookies.mockResolvedValue(cookieStore as never);
    });

    it("sets an expiring HttpOnly SameSite cookie", async () => {
        await createSession({userId: "parent-id", familyId: "parent-id", role: "guardian"});

        expect(cookieStore.set).toHaveBeenCalledWith(
            "mfi_session",
            expect.any(String),
            expect.objectContaining({
                httpOnly: true,
                sameSite: "lax",
                maxAge: 604800,
                path: "/",
            }),
        );
    });

    it("restores the signed identity from the cookie", async () => {
        await createSession({userId: "child-id", familyId: "parent-id", role: "child"});
        const token = cookieStore.set.mock.calls[0][1];
        cookieStore.get.mockReturnValue({name: "mfi_session", value: token});

        await expect(readSession()).resolves.toEqual({
            userId: "child-id",
            familyId: "parent-id",
            role: "child",
        });
    });

    it("deletes the session cookie on logout", async () => {
        await deleteSession();
        expect(cookieStore.delete).toHaveBeenCalledWith("mfi_session");
    });

    it("rejects missing or short session secrets before account persistence", () => {
        process.env.AUTH_SECRET = "too-short";
        expect(() => assertSessionConfigured()).toThrow("AUTH_SECRET must be configured");
    });
});
