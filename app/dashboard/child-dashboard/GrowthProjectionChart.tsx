import type {GrowthProjection} from "../../domain/growth-projection";

type GrowthProjectionChartProps = {
    projection: GrowthProjection;
    days: number;
};

const WIDTH = 640;
const HEIGHT = 240;
const PADDING = 28;

export function GrowthProjectionChart({projection, days}: GrowthProjectionChartProps) {
    const values = projection.points.flatMap(point => [point.baselineBalance, point.scenarioBalance]);
    const rawMinimum = Math.min(...values);
    const rawMaximum = Math.max(...values);
    const valuePadding = Math.max(1, (rawMaximum - rawMinimum) * 0.12);
    const minimum = Math.max(0, rawMinimum - valuePadding);
    const maximum = rawMaximum + valuePadding;
    const range = Math.max(1, maximum - minimum);
    const xFor = (day: number) => PADDING + (day / days) * (WIDTH - PADDING * 2);
    const yFor = (balance: number) => HEIGHT - PADDING - ((balance - minimum) / range) * (HEIGHT - PADDING * 2);
    const pathFor = (key: "baselineBalance" | "scenarioBalance") => projection.points
        .map((point, index) => `${index === 0 ? "M" : "L"}${xFor(point.day).toFixed(1)},${yFor(point[key]).toFixed(1)}`)
        .join(" ");

    return (
        <figure className="rounded-[1.35rem] border-2 border-[var(--garden-border)] bg-[var(--garden-surface)] p-3">
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="h-auto w-full"
                role="img"
                aria-labelledby="growth-chart-title growth-chart-description"
            >
                <title id="growth-chart-title">Pretend balance growth comparison</title>
                <desc id="growth-chart-description">
                    Your current balance reaches ${projection.baselineFinalBalance.toFixed(2)} and the pretend choice reaches ${projection.scenarioFinalBalance.toFixed(2)} after {days} days.
                </desc>
                {[0.25, 0.5, 0.75].map(position => <line
                    key={position}
                    x1={PADDING}
                    x2={WIDTH - PADDING}
                    y1={PADDING + position * (HEIGHT - PADDING * 2)}
                    y2={PADDING + position * (HEIGHT - PADDING * 2)}
                    stroke="var(--garden-border)"
                    strokeDasharray="5 7"
                />)}
                <path data-testid="current-growth-line" d={pathFor("baselineBalance")} fill="none" stroke="var(--garden-muted)" strokeWidth="3" strokeDasharray="7 7" vectorEffect="non-scaling-stroke"/>
                <path data-testid="pretend-growth-line" d={pathFor("scenarioBalance")} fill="none" stroke="var(--garden-save)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
                <circle cx={xFor(days)} cy={yFor(projection.scenarioFinalBalance)} r="7" fill="var(--garden-save)"/>
            </svg>
            <figcaption className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 text-xs">
                <span className="garden-muted">Today</span>
                <span className="flex items-center gap-2"><i className="h-1 w-6 border-t-2 border-dashed border-[var(--garden-muted)]"/>Current path</span>
                <span className="flex items-center gap-2 font-semibold text-[var(--garden-save)]"><i className="h-1 w-6 rounded-full bg-[var(--garden-save)]"/>Pretend choice</span>
                <span className="garden-muted">Day {days}</span>
            </figcaption>
        </figure>
    );
}
