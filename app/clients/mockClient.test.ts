import MockClient, {mockChildren, mockRequests, mockUsers} from "./mockClient";

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
