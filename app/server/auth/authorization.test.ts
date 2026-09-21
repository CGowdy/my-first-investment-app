import type {ChildAccount} from "@models/child-account";
import type {SessionIdentity} from "./token";
import {
    canAccessChild,
    canManageChild,
    canManageFamily,
    canSubmitRequestForChild,
} from "./authorization";

const guardian: SessionIdentity = {userId: "guardian-1", familyId: "guardian-1", role: "guardian"};
const child: SessionIdentity = {userId: "child-1", familyId: "guardian-1", role: "child"};
const account: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    isChildAccount: true,
    parentId: "guardian-1",
    balance: 25,
    balanceLastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    interest: 5,
};

describe("family authorization", () => {
    it("only lets a guardian manage their own family", () => {
        expect(canManageFamily(guardian, "guardian-1")).toBe(true);
        expect(canManageFamily({...guardian, familyId: "another-family"}, "guardian-1")).toBe(false);
        expect(canManageFamily(child, "guardian-1")).toBe(false);
    });

    it("lets a child and their guardian read the child's account", () => {
        expect(canAccessChild(child, account)).toBe(true);
        expect(canAccessChild(guardian, account)).toBe(true);
    });

    it("rejects unrelated children and guardians", () => {
        expect(canAccessChild({...child, userId: "child-2"}, account)).toBe(false);
        expect(canAccessChild({...guardian, familyId: "guardian-2"}, account)).toBe(false);
    });

    it("only lets the owning guardian manage a child account", () => {
        expect(canManageChild(guardian, account)).toBe(true);
        expect(canManageChild(child, account)).toBe(false);
        expect(canManageChild({...guardian, familyId: "guardian-2"}, account)).toBe(false);
    });

    it("only lets a child submit requests for their own account", () => {
        expect(canSubmitRequestForChild(child, account)).toBe(true);
        expect(canSubmitRequestForChild({...child, userId: "child-2"}, account)).toBe(false);
        expect(canSubmitRequestForChild(guardian, account)).toBe(false);
    });
});
