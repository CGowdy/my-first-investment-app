import {ApprovalStatus} from "@models/transaction";
import type {ChildAccount} from "@models/child-account";
import {calculateDailyGrowth, createGrowthAccrual} from "./growth-accrual";

const child: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    isChildAccount: true,
    parentId: "guardian-1",
    balance: 1000,
    balanceLastUpdated: new Date("2025-01-01T12:00:00.000Z"),
    interest: 5,
};

describe("createGrowthAccrual", () => {
    it("compounds all elapsed UTC days into one auditable entry", () => {
        const asOf = new Date("2025-01-31T18:00:00.000Z");
        const checkpoint = new Date("2025-01-31T12:00:00.000Z");

        expect(createGrowthAccrual(child, asOf)).toEqual({
            accrued: true,
            elapsedDays: 30,
            account: {...child, balance: 1004.12, balanceLastUpdated: checkpoint},
            transaction: {
                amount: 4.12,
                childId: "child-1",
                originalBalance: 1000,
                finalBalance: 1004.12,
                date: asOf,
                reason: "Simulated growth: 30 days at 5% annual",
                approved: ApprovalStatus.AdminApproved,
                actorId: "system:growth-rule",
            },
        });
    });

    it.each([
        ["less than 24 hours later", new Date("2025-01-02T11:59:00.000Z")],
        ["a time before the checkpoint", new Date("2024-12-31T23:59:00.000Z")],
    ])("does not accrue on %s", (_label, asOf) => {
        expect(createGrowthAccrual(child, asOf)).toEqual({accrued: false, elapsedDays: 0, account: child});
    });

    it("keeps sub-cent growth pending until it can be represented", () => {
        const tinyBalance = {...child, balance: 0.01, interest: 1};

        expect(createGrowthAccrual(tinyBalance, new Date("2025-01-02T12:00:00.000Z")))
            .toEqual({accrued: false, elapsedDays: 1, account: tinyBalance});
    });

    it("can checkpoint sub-cent growth before a principal change", () => {
        const tinyBalance = {...child, balance: 0.01, interest: 1};
        const asOf = new Date("2025-01-02T12:00:00.000Z");

        expect(createGrowthAccrual(tinyBalance, asOf, {checkpointIfZero: true}))
            .toEqual({
                accrued: false,
                elapsedDays: 1,
                account: {...tinyBalance, balanceLastUpdated: asOf},
            });
    });

    it("checkpoints a same-day principal change so new money cannot earn retroactive growth", () => {
        const asOf = new Date("2025-01-01T23:00:00.000Z");

        expect(createGrowthAccrual(child, asOf, {checkpointIfZero: true}))
            .toEqual({
                accrued: false,
                elapsedDays: 0,
                account: {...child, balanceLastUpdated: asOf},
            });
    });

    it("does not create invalid ledger values from a corrupt timestamp", () => {
        const account = {...child, balanceLastUpdated: new Date("invalid")};

        expect(createGrowthAccrual(account, new Date("2025-01-31T12:00:00.000Z")))
            .toEqual({accrued: false, elapsedDays: Number.NaN, account});
    });
});

describe("calculateDailyGrowth", () => {
    it("projects one day of simple growth from an annual percentage", () => {
        expect(calculateDailyGrowth(100, 5)).toBeCloseTo(0.01369863);
    });
});
