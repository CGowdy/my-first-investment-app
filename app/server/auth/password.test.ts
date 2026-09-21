import {hashPassword, verifyPassword} from "./password";

describe("password hashing", () => {
    it("stores a one-way hash and verifies the original password", async () => {
        const hash = await hashPassword("correct horse battery staple");

        expect(hash).not.toContain("correct horse battery staple");
        await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
        await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
    });
});
