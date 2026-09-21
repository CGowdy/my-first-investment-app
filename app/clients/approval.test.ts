import {ApprovalStatus, type Transaction} from "@models/transaction";
import MockClient, {mockChildren, mockRequests} from "./mockClient";
import MongoDbClient from "./mongoDbClient";

const pendingRequest = (overrides: Partial<Transaction> = {}): Transaction => ({
    _id: "request-test",
    amount: 10,
    childId: "2",
    reason: "Book",
    approved: ApprovalStatus.Pending,
    date: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
});

describe("approval client behavior", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        jest.restoreAllMocks();
        if (originalFetch) global.fetch = originalFetch;
        else Reflect.deleteProperty(global, "fetch");
        const requestIndex = mockRequests.findIndex(request => request._id === "request-test");
        if (requestIndex >= 0) mockRequests.splice(requestIndex, 1);
        const child = mockChildren.find(child => child._id === "2");
        if (child) child.balance = 250;
    });

    it("throws when the Mongo API rejects approval", async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: async () => ({error: {message: "Request exceeds the available balance"}}),
        } as Response);

        await expect(new MongoDbClient().approveRequest(pendingRequest()))
            .rejects.toThrow("Request exceeds the available balance");
    });

    it("uses the stored mock request rather than caller-supplied financial fields", async () => {
        const client = new MockClient();
        await client.auth({username: "parent1", password: "pass123"});
        mockRequests.push(pendingRequest());

        await client.approveRequest(pendingRequest({amount: 200, childId: "123"}));

        expect(mockChildren.find(child => child._id === "2")?.balance).toBe(240);
        expect(mockRequests.find(request => request._id === "request-test")).toMatchObject({
            amount: 10,
            childId: "2",
            approved: ApprovalStatus.Approved,
            originalBalance: 250,
            finalBalance: 240,
        });
    });

    it("leaves mock state unchanged when funds are insufficient", async () => {
        const client = new MockClient();
        await client.auth({username: "parent1", password: "pass123"});
        const child = mockChildren.find(child => child._id === "2")!;
        child.balance = 5;
        mockRequests.push(pendingRequest());

        await expect(client.approveRequest(pendingRequest())).rejects.toThrow("INSUFFICIENT_BALANCE");

        expect(child.balance).toBe(5);
        expect(mockRequests.find(request => request._id === "request-test")?.approved).toBe(ApprovalStatus.Pending);
    });
});
