import LabelledInput from "@components/LabeledInput";
import type {ChildAccount} from "@models/child-account";
import {useMemo, useState} from "react";
import {buildGrowthProjection} from "../../domain/growth-projection";
import {GrowthProjectionChart} from "./GrowthProjectionChart";

const horizons = [
    {days: 30, label: "30 days"},
    {days: 365, label: "1 year"},
    {days: 1825, label: "5 years"},
];

export function GrowthLab({child}: {child: ChildAccount}) {
    const [pretendChange, setPretendChange] = useState("");
    const [days, setDays] = useState(365);
    const numericChange = pretendChange.trim() === "" ? 0 : Number(pretendChange);
    const projection = useMemo(() => buildGrowthProjection({
        currentBalance: child.balance,
        pretendChange: numericChange,
        annualInterestPercent: child.interest,
        days,
    }), [child.balance, child.interest, days, numericChange]);

    return (
        <section aria-labelledby="growth-lab-heading" className="garden-card overflow-hidden border-[3px]">
            <div className="grid gap-5 bg-[var(--garden-save-soft)] p-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
                <div>
                    <p className="garden-kicker">Long-term Pretend Zone</p>
                    <h2 id="growth-lab-heading" className="text-3xl font-semibold tracking-tight">Watch a choice grow</h2>
                    <p className="garden-muted mt-2">Try adding or spending pretend money, then stretch time forward. This is a learning simulation—not a promise about real investments.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <LabelledInput
                        name="pretend-balance-change"
                        label="Pretend balance change"
                        type="number"
                        inputText={pretendChange}
                        onInputChanged={setPretendChange}
                        headerDisplay="$"
                        placeholder="Try 25 or -10"
                    />
                    <div className="flex flex-wrap gap-2" aria-label="Projection length">
                        {horizons.map(horizon => <button
                            type="button"
                            key={horizon.days}
                            aria-pressed={days === horizon.days}
                            className={`rounded-full border px-4 py-3 text-sm font-bold transition ${days === horizon.days ? "border-[var(--garden-save)] bg-[var(--garden-save)] text-white dark:text-slate-950" : "border-[var(--garden-border)] bg-[var(--garden-surface)]"}`}
                            onClick={() => setDays(horizon.days)}
                        >{horizon.label}</button>)}
                    </div>
                </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(220px,.55fr)] lg:items-center">
                {projection
                    ? <GrowthProjectionChart projection={projection} days={days}/>
                    : <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200">That choice would make the pretend balance negative. Try a smaller amount.</div>}
                {projection && <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                    <ProjectionStat label="Pretend starting balance" value={projection.scenarioStartingBalance}/>
                    <ProjectionStat label={`Balance after ${days === 365 ? "1 year" : days === 1825 ? "5 years" : "30 days"}`} value={projection.scenarioFinalBalance} testId="projection-final-balance"/>
                    <ProjectionStat label="Growth created" value={projection.scenarioGrowth} testId="projection-growth-earned"/>
                    <div className="col-span-2 rounded-2xl bg-[var(--garden-learn-soft)] p-4 text-sm lg:col-span-1">
                        <strong className="block text-[var(--garden-learn)]">What changed?</strong>
                        <span className="garden-muted">The graph responds instantly, but your account stays exactly the same.</span>
                    </div>
                </div>}
            </div>
        </section>
    );
}

function ProjectionStat({label, value, testId}: {label: string; value: number; testId?: string}) {
    return (
        <div className="rounded-2xl border border-[var(--garden-border)] bg-[var(--garden-surface-soft)] p-4">
            <span className="garden-muted block text-xs font-bold">{label}</span>
            <output data-testid={testId} className="mt-1 block text-2xl font-extrabold">${value.toFixed(2)}</output>
        </div>
    );
}
