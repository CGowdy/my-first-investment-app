import {signSessionToken, verifySessionToken} from "./token";

const testSecret = "test-only-session-secret-that-is-long-enough";

describe("session token", () => {
    it("round-trips the authenticated identity boundary", async () => {
        const token = await signSessionToken({
            userId: "parent-id",
            familyId: "parent-id",
            role: "guardian",
        }, testSecret);

        await expect(verifySessionToken(token, testSecret)).resolves.toMatchObject({
            userId: "parent-id",
            familyId: "parent-id",
            role: "guardian",
        });
    });

    it("rejects a token signed with another secret", async () => {
        const token = await signSessionToken({
            userId: "child-id",
            familyId: "parent-id",
            role: "child",
        }, testSecret);

        await expect(verifySessionToken(token, "different-test-secret-that-is-long-enough"))
            .resolves.toBeNull();
    });
});
