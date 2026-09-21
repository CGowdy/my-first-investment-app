import {getAccruedInterest} from "@models/balance";

describe('Balance', () => {
    describe('getAccruedInterest', () => {
        const asOf = new Date('2025-01-31T12:00:00.000Z');

        it.each([
            {balance: 100, annualRate: 0.05, lastUpdated: '2025-01-31T00:00:00.000Z', expected: 0},
            {balance: 100, annualRate: 0.05, lastUpdated: '2025-01-30T23:59:00.000Z', expected: 0.01},
            {balance: 1000, annualRate: 0.05, lastUpdated: '2025-01-01T12:00:00.000Z', expected: 4.12},
            {balance: 250, annualRate: 0.12, lastUpdated: '2024-02-01T12:00:00.000Z', expected: 31.87},
        ])('returns $expected for $balance after the elapsed whole UTC days', async ({
            balance,
            annualRate,
            lastUpdated,
            expected
        }) => {
            await expect(getAccruedInterest(balance, annualRate, new Date(lastUpdated), asOf))
                .resolves.toBe(expected);
        });

        it('does not accrue interest when the last update is in the future', async () => {
            await expect(getAccruedInterest(100, 0.05, new Date('2025-02-01T00:00:00.000Z'), asOf))
                .resolves.toBe(0);
        });
    });
});
