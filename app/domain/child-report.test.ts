import {ApprovalStatus, type Transaction} from "@models/transaction";
import {buildChildReport} from "./child-report";

const baseTransaction: Transaction = {
    _id: "transaction-1",
    childId: "child-1",
    amount: 10,
    reason: "Books",
    approved: ApprovalStatus.Pending,
    date: new Date("2026-01-01T00:00:00.000Z"),
};

describe("buildChildReport", () => {
    it("summarizes approved purchase spending and simulated growth separately", () => {
        const report = buildChildReport([
            {...baseTransaction, _id: "purchase-1", approved: ApprovalStatus.Approved, amount: 12, finalBalance: 88},
            {...baseTransaction, _id: "purchase-2", approved: ApprovalStatus.Approved, amount: 8, finalBalance: 80, date: new Date("2026-01-02T00:00:00.000Z")},
            {
                ...baseTransaction,
                _id: "growth-1",
                approved: ApprovalStatus.AdminApproved,
                actorId: "system:growth-rule",
                reason: "Simulated growth: 2 days at 5% annual",
                amount: 0.15,
                finalBalance: 80.15,
            },
            {...baseTransaction, _id: "pending", approved: ApprovalStatus.Pending, amount: 99},
            {...baseTransaction, _id: "deposit", approved: ApprovalStatus.AdminApproved, amount: 25},
        ]);

        expect(report.spending).toMatchObject({total: 20, count: 2});
        expect(report.spending.items.map(item => item.id)).toEqual(["purchase-2", "purchase-1"]);
        expect(report.growth).toMatchObject({total: 0.15, count: 1});
        expect(report.growth.items[0]).toMatchObject({id: "growth-1", resultingBalance: 80.15});
    });

    it("returns empty summaries when no reportable activity exists", () => {
        expect(buildChildReport([])).toEqual({
            spending: {total: 0, count: 0, items: []},
            growth: {total: 0, count: 0, items: []},
        });
    });
});
