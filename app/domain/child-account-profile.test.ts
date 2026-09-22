import type {ChildAccount} from "@models/child-account";
import {applyChildAccountProfileUpdate, parseUpdateChildAccount} from "./child-account-profile";

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

describe("applyChildAccountProfileUpdate", () => {
    it("changes profile fields without changing the settled balance checkpoint", () => {
        const settledChild: ChildAccount = {
            _id: "child-1",
            parentId: "guardian-1",
            displayName: "Kid",
            username: "kid",
            interest: 5,
            balance: 26,
            balanceLastUpdated: new Date("2026-09-22T12:00:00.000Z"),
        };

        expect(applyChildAccountProfileUpdate(settledChild, {
            displayName: "Kid Updated",
            username: "kid-updated",
            interest: 8,
        })).toEqual({
            ...settledChild,
            displayName: "Kid Updated",
            username: "kid-updated",
            interest: 8,
        });
    });
});
