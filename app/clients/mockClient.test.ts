import MockClient, {mockChildren, mockRequests, mockUsers} from "./mockClient";
import type {ChildAccount} from "@models/child-account";

jest.mock("bcryptjs", () => ({
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue("hashed-password"),
}));

describe("MockClient child provisioning", () => {
    it("creates the profile, login, and opening ledger entry together", async () => {
        const client = new MockClient();
        await client.auth({username: "parent1", password: "pass123"});
        const initialUserCount = mockUsers.length;
        const initialChildCount = mockChildren.length;
        const initialTransactionCount = mockRequests.length;

        try {
            const child = await client.addChildUser({
                username: "new-kid",
                password: "password",
                displayName: "New Kid",
                balance: 25,
                interest: 5,
            });

            expect(mockUsers).toHaveLength(initialUserCount + 1);
            expect(mockChildren).toHaveLength(initialChildCount + 1);
            expect(mockRequests).toHaveLength(initialTransactionCount + 1);
            expect(mockRequests.at(-1)).toMatchObject({
                childId: child?._id,
                originalBalance: 0,
                finalBalance: 25,
                actorId: "1",
            });
        } finally {
            mockUsers.splice(initialUserCount);
            mockChildren.splice(initialChildCount);
            mockRequests.splice(initialTransactionCount);
        }
    });

    it("uses the same validation and duplicate feedback as the API", async () => {
        const client = new MockClient();
        await client.auth({username: "parent1", password: "pass123"});

        await expect(client.addChildUser({
            username: "child1",
            password: "password",
            displayName: "Child",
            balance: 0,
            interest: 0,
        })).rejects.toThrow("Username is already in use");
        await expect(client.addChildUser({
            username: "u".repeat(129),
            password: "password",
            displayName: "Child",
            balance: 0,
            interest: 0,
        })).rejects.toThrow("Invalid child account");
    });
});

describe("MockClient growth accrual", () => {
    it("settles elapsed growth when a guardian loads children", async () => {
        const client = new MockClient();
        await client.auth({username: "parent1", password: "pass123"});
        const initialChildCount = mockChildren.length;
        const initialTransactionCount = mockRequests.length;
        mockChildren.push({
            _id: "growth-child",
            username: "growth-child",
            displayName: "Growth Child",
            isChildAccount: true,
            parentId: "1",
            balance: 1000,
            balanceLastUpdated: new Date("2025-01-01T12:00:00.000Z"),
            interest: 5,
        });

        try {
            const children = await client.getChildAccounts("1");

            expect(children?.find(child => child._id === "growth-child")?.balance).toBeGreaterThan(1000);
            expect(mockRequests.at(-1)).toMatchObject({
                childId: "growth-child",
                reason: expect.stringContaining("Simulated growth"),
                actorId: "system:growth-rule",
            });
        } finally {
            mockChildren.splice(initialChildCount);
            mockRequests.splice(initialTransactionCount);
        }
    });

    it("does not checkpoint pending growth when a balance change is rejected", async () => {
        jest.useFakeTimers().setSystemTime(new Date("2025-01-01T23:00:00.000Z"));
        const client = new MockClient();
        await client.auth({username: "parent1", password: "pass123"});
        const initialChildCount = mockChildren.length;
        const initialTransactionCount = mockRequests.length;
        const checkpoint = new Date("2025-01-01T12:00:00.000Z");
        const account: ChildAccount = {
            _id: "rejected-growth-child",
            username: "rejected-growth-child",
            displayName: "Rejected Growth Child",
            isChildAccount: true,
            parentId: "1",
            balance: 10,
            balanceLastUpdated: checkpoint,
            interest: 5,
        };
        mockChildren.push(account);

        try {
            await expect(client.adjustBalance(account._id!, -20)).rejects.toThrow(
                "Adjustment cannot make the balance negative",
            );
            expect(account.balanceLastUpdated).toBe(checkpoint);
            expect(mockRequests).toHaveLength(initialTransactionCount);
        } finally {
            mockChildren.splice(initialChildCount);
            mockRequests.splice(initialTransactionCount);
            jest.useRealTimers();
        }
    });
});
