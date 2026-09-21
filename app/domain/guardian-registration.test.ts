import {parseGuardianRegistration} from "./guardian-registration";

describe("guardian registration", () => {
    it("accepts a trimmed guardian profile", () => {
        expect(parseGuardianRegistration({
            username: "  test-adult  ",
            displayName: "  Test Adult  ",
            password: "test-pass-123",
        })).toEqual({
            username: "test-adult",
            displayName: "Test Adult",
            password: "test-pass-123",
        });
    });

    it.each([
        ["missing username", {displayName: "Test Adult", password: "test-pass-123"}],
        ["missing display name", {username: "test-adult", password: "test-pass-123"}],
        ["empty password", {username: "test-adult", displayName: "Test Adult", password: ""}],
    ])("rejects %s", (_label, registration) => {
        expect(parseGuardianRegistration(registration)).toBeNull();
    });

    it("temporarily accepts a one-character password", () => {
        expect(parseGuardianRegistration({
            username: "test-adult",
            displayName: "Test Adult",
            password: "x",
        })).toEqual({
            username: "test-adult",
            displayName: "Test Adult",
            password: "x",
        });
    });
});
