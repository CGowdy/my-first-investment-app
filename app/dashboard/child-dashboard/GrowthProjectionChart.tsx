import type {GrowthProjection} from "../../domain/growth-projection";

type GrowthProjectionChartProps = {
    projection: GrowthProjection;
    days: number;
};

const WIDTH = 640;
const HEIGHT = 240;
const PADDING = 28;
const LEFT_PADDING = 64;

export function GrowthProjectionChart({projection, days}: GrowthProjectionChartProps) {
    const baselineMaximum = Math.max(...projection.points.map(point => point.baselineBalance));
    // The scale depends only on the current path, never the pretend input. That
    // makes a larger choice always move upward instead of rescaling the chart.
    const maximum = Math.max(1, baselineMaximum * 2);
    const scenarioExceedsScale = projection.points.some(point => point.scenarioBalance > maximum);
    const xFor = (day: number) => LEFT_PADDING + (day / days) * (WIDTH - LEFT_PADDING - PADDING);
    const yFor = (balance: number) => Math.max(PADDING, HEIGHT - PADDING - (balance / maximum) * (HEIGHT - PADDING * 2));
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
                <text x="4" y={PADDING + 5} fill="var(--garden-muted)" fontSize="13">${formatAxisValue(maximum)}</text>
                <text x="26" y={HEIGHT - PADDING + 5} fill="var(--garden-muted)" fontSize="13">$0</text>
                {scenarioExceedsScale && <text x={WIDTH - PADDING} y={PADDING + 16} textAnchor="end" fill="var(--garden-save)" fontSize="13" fontWeight="700">Choice is above chart ↑</text>}
                {[0.25, 0.5, 0.75].map(position => <line
                    key={position}
                    x1={LEFT_PADDING}
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

function formatAxisValue(value: number): string {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : Math.ceil(value).toString();
}
