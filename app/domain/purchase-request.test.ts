import type {ChildAccount} from "@models/child-account";
import {ApprovalStatus, type Transaction} from "@models/transaction";
import {approvePurchaseRequest} from "./purchase-request";

const child: ChildAccount = {
    _id: "child-1",
    username: "kid",
    displayName: "Kid",
    parentId: "guardian-1",
    balance: 25,
    balanceLastUpdated: new Date("2026-01-01T00:00:00.000Z"),
    interest: 5,
};
const request: Transaction = {
    _id: "request-1",
    amount: 10,
    childId: "child-1",
    reason: "Book",
    approved: ApprovalStatus.Pending,
    date: new Date("2026-01-01T00:00:00.000Z"),
};
const approvedAt = new Date("2026-01-02T00:00:00.000Z");

describe("approvePurchaseRequest", () => {
    it("returns an audited approval and resulting balance", () => {
        expect(approvePurchaseRequest(request, child, "guardian-1", approvedAt)).toEqual({
            ok: true,
            balance: 15,
            transaction: {
                ...request,
                approved: ApprovalStatus.Approved,
                originalBalance: 25,
                finalBalance: 15,
                approvedBy: "guardian-1",
                approvedAt,
            },
        });
    });

    it("rejects terminal requests", () => {
        expect(approvePurchaseRequest(
            {...request, approved: ApprovalStatus.Rejected},
            child,
            "guardian-1",
            approvedAt,
        )).toEqual({ok: false, reason: "INVALID_TRANSITION"});
    });

    it("rejects requests that exceed the balance", () => {
        expect(approvePurchaseRequest({...request, amount: 30}, child, "guardian-1", approvedAt))
            .toEqual({ok: false, reason: "INSUFFICIENT_BALANCE"});
    });

    it("rejects a request attached to a different child", () => {
        expect(approvePurchaseRequest({...request, childId: "child-2"}, child, "guardian-1", approvedAt))
            .toEqual({ok: false, reason: "INVALID_REQUEST"});
    });
});
