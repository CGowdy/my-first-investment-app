import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus} from "@models/transaction";
import {createBalanceAdjustment} from "./balance-adjustment";

const child: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    parentId: "guardian-1",
    balance: 25,
    balanceLastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    interest: 5,
};
const recordedAt = new Date("2026-01-02T00:00:00.000Z");

describe("createBalanceAdjustment", () => {
    it("creates an audited positive adjustment", () => {
        expect(createBalanceAdjustment(child, "child-1", 10, "guardian-1", recordedAt)).toEqual({
            ok: true,
            balance: 35,
            transaction: {
                amount: 10,
                childId: "child-1",
                originalBalance: 25,
                finalBalance: 35,
                approved: ApprovalStatus.AdminApproved,
                reason: "Parent Balance Adjustment",
                date: recordedAt,
                actorId: "guardian-1",
            },
        });
    });

    it("creates an audited withdrawal", () => {
        expect(createBalanceAdjustment(child, "child-1", -10, "guardian-1", recordedAt)).toMatchObject({
            ok: true,
            balance: 15,
            transaction: {originalBalance: 25, finalBalance: 15},
        });
    });

    it.each([0, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid amount %s", amount => {
        expect(createBalanceAdjustment(child, "child-1", amount, "guardian-1", recordedAt))
            .toEqual({ok: false, reason: "INVALID_ADJUSTMENT"});
    });

    it("rejects a withdrawal that would make the balance negative", () => {
        expect(createBalanceAdjustment(child, "child-1", -30, "guardian-1", recordedAt))
            .toEqual({ok: false, reason: "INSUFFICIENT_BALANCE"});
    });
});
