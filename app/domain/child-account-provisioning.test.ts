import {ApprovalStatus} from "@models/transaction";
import {createChildAccountRecords, parseCreateChildAccount} from "./child-account-provisioning";

describe("createChildAccountRecords", () => {
    it("builds a profile, login identity, and audited opening balance", () => {
        const createdAt = new Date("2026-01-01T00:00:00.000Z");

        expect(createChildAccountRecords({
            childId: "child-1",
            familyId: "guardian-1",
            username: "kid",
            displayName: "Kid",
            passwordHash: "hashed-password",
            balance: 25,
            interest: 5,
            createdAt,
        })).toEqual({
            childAccount: {
                _id: "child-1",
                username: "kid",
                displayName: "Kid",
                isChildAccount: true,
                parentId: "guardian-1",
                balance: 25,
                balanceLastUpdated: createdAt,
                interest: 5,
            },
            user: {
                _id: "child-1",
                username: "kid",
                displayName: "Kid",
                passwordHash: "hashed-password",
                isChildAccount: true,
            },
            openingTransaction: {
                childId: "child-1",
                originalBalance: 0,
                finalBalance: 25,
                date: createdAt,
                amount: 25,
                reason: "Account Creation - Initial balance",
                approved: ApprovalStatus.AdminApproved,
                actorId: "guardian-1",
            },
        });
    });
});

describe("parseCreateChildAccount", () => {
    const valid = {username: " kid ", password: "password", displayName: " Kid ", balance: 25, interest: 5};

    it("normalizes valid names", () => {
        expect(parseCreateChildAccount(valid)).toEqual({...valid, username: "kid", displayName: "Kid"});
    });

    it("temporarily accepts a one-character password", () => {
        expect(parseCreateChildAccount({...valid, password: "x"}))
            .toEqual({...valid, username: "kid", displayName: "Kid", password: "x"});
    });

    it("still rejects an empty password", () => {
        expect(parseCreateChildAccount({...valid, password: ""})).toBeNull();
    });

    it.each([
        ["username", {...valid, username: "u".repeat(129)}],
        ["display name", {...valid, displayName: "d".repeat(129)}],
        ["password", {...valid, password: "p".repeat(257)}],
    ])("rejects an overlong %s", (_label, input) => {
        expect(parseCreateChildAccount(input)).toBeNull();
    });
});
