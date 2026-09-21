import {parseLoginData, toAuthenticatedUser} from "./security";

describe("authentication boundary", () => {
    describe("parseLoginData", () => {
        it("accepts a bounded username and password", () => {
            expect(parseLoginData({username: "parent1", password: "pass123"})).toEqual({
                username: "parent1",
                password: "pass123",
            });
        });

        it.each([
            null,
            [],
            {},
            {username: {$ne: null}, password: {$ne: null}},
            {username: "parent1", password: {$gt: ""}},
            {username: "", password: "pass123"},
            {username: "parent1", password: ""},
            {username: "a".repeat(129), password: "pass123"},
            {username: "parent1", password: "a".repeat(257)},
        ])("rejects unsafe credentials: %p", (value) => {
            expect(parseLoginData(value)).toBeNull();
        });
    });

    it("returns an allowlisted account DTO without the password hash", () => {
        expect(toAuthenticatedUser({
            _id: "parent-id",
            username: "parent1",
            passwordHash: "secret-hash",
            displayName: "Parent One",
        })).toEqual({
            _id: "parent-id",
            username: "parent1",
            displayName: "Parent One",
        });
    });
});
