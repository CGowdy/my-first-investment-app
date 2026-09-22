import {parseUpdateChildAccount} from "./child-account-profile";

describe("parseUpdateChildAccount", () => {
    it("normalizes profile fields and treats a blank password as unchanged", () => {
        expect(parseUpdateChildAccount({
            displayName: "  Kid Updated  ",
            username: "  kid-updated  ",
            password: "",
            interest: 8,
            balance: 999,
        })).toEqual({displayName: "Kid Updated", username: "kid-updated", interest: 8});
    });

    it("accepts an optional replacement password", () => {
        expect(parseUpdateChildAccount({
            displayName: "Kid",
            username: "kid",
            password: "new password",
            interest: 5,
        })).toEqual({displayName: "Kid", username: "kid", password: "new password", interest: 5});
    });

    it.each([
        {displayName: "", username: "kid", interest: 5},
        {displayName: "Kid", username: "", interest: 5},
        {displayName: "Kid", username: "kid", password: 123, interest: 5},
        {displayName: "Kid", username: "kid", interest: -1},
        {displayName: "Kid", username: "kid", interest: 101},
    ])("rejects invalid profile data %#", value => {
        expect(parseUpdateChildAccount(value)).toBeNull();
    });
});
