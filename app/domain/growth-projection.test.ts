import {buildGrowthProjection} from "./growth-projection";

describe("buildGrowthProjection", () => {
    it("compares the current balance with a pretend deposit over completed daily periods", () => {
        const projection = buildGrowthProjection({
            currentBalance: 100,
            pretendChange: 50,
            annualInterestPercent: 36.5,
            days: 10,
        });
        expect(projection).not.toBeNull();
        if (!projection) throw new Error("Expected a projection");

        expect(projection.baselineFinalBalance).toBe(101);
        expect(projection.scenarioFinalBalance).toBe(151.51);
        expect(projection.scenarioGrowth).toBe(1.51);
        expect(projection.points[0]).toEqual({day: 0, baselineBalance: 100, scenarioBalance: 150});
        expect(projection.points.at(-1)).toEqual({day: 10, baselineBalance: 101, scenarioBalance: 151.51});
    });

    it("supports a pretend withdrawal without allowing a negative starting balance", () => {
        const withdrawalProjection = buildGrowthProjection({
            currentBalance: 100,
            pretendChange: -25,
            annualInterestPercent: 5,
            days: 365,
        });
        expect(withdrawalProjection?.scenarioStartingBalance).toBe(75);

        expect(buildGrowthProjection({
            currentBalance: 100,
            pretendChange: -101,
            annualInterestPercent: 5,
            days: 365,
        })).toBeNull();
    });

    it("returns a bounded number of chart points for a five-year projection", () => {
        const projection = buildGrowthProjection({
            currentBalance: 100,
            pretendChange: 10,
            annualInterestPercent: 5,
            days: 1825,
        });

        expect(projection?.points.length).toBeLessThanOrEqual(61);
        expect(projection?.points.at(-1)?.day).toBe(1825);
    });
});
