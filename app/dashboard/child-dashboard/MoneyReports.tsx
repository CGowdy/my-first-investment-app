import type {ChildReport, ChildReportSummary} from "@models/child-report";

type MoneyReportsProps = {
    report: ChildReport | null;
    loading: boolean;
    error: string;
};

export function MoneyReports({report, loading, error}: MoneyReportsProps) {
    return (
        <section aria-labelledby="money-reports-heading" className="garden-card p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="garden-kicker">Your money story</p>
                    <h2 id="money-reports-heading" className="text-3xl font-semibold tracking-tight">What has happened so far?</h2>
                </div>
                <span className="garden-muted text-sm">Only completed activity appears here.</span>
            </div>
            {loading && <p className="garden-muted">Growing your reports…</p>}
            {error && <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}
            {report && <div className="grid gap-4 lg:grid-cols-2">
                <ReportCard
                    title="Spending report"
                    description="Purchase requests your parent approved"
                    summary={report.spending}
                    tone="spend"
                    emptyMessage="No approved spending yet."
                />
                <ReportCard
                    title="Interest growth report"
                    description="Simulated growth recorded by the app"
                    summary={report.growth}
                    tone="learn"
                    emptyMessage="No simulated growth has been recorded yet."
                />
            </div>}
        </section>
    );
}

function ReportCard({title, description, summary, tone, emptyMessage}: {
    title: string;
    description: string;
    summary: ChildReportSummary;
    tone: "spend" | "learn";
    emptyMessage: string;
}) {
    const toneClasses = tone === "spend"
        ? "border-[color-mix(in_srgb,var(--garden-spend)_55%,transparent)] bg-[var(--garden-spend-soft)] text-[var(--garden-spend)]"
        : "border-[color-mix(in_srgb,var(--garden-learn)_55%,transparent)] bg-[var(--garden-learn-soft)] text-[var(--garden-learn)]";
    return (
        <article data-testid={`${tone}-report`} className={`rounded-[1.5rem] border-2 p-5 ${toneClasses}`}>
            <div className="flex items-start justify-between gap-4">
                <div><h3 className="text-xl font-bold">{title}</h3><p className="mt-1 text-sm opacity-80">{description}</p></div>
                <div className="text-right"><strong className="block text-3xl">${summary.total.toFixed(2)}</strong><span className="text-xs font-bold">{summary.count} entr{summary.count === 1 ? "y" : "ies"}</span></div>
            </div>
            {summary.items.length === 0
                ? <p className="mt-5 rounded-2xl bg-[var(--garden-surface)] p-4 text-sm text-[var(--garden-muted)]">{emptyMessage}</p>
                : <ul className="mt-5 space-y-2">
                    {summary.items.slice(0, 3).map(item => <li key={item.id} className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--garden-surface)] px-4 py-3 text-[var(--garden-text)]">
                        <div><strong className="block">{item.reason}</strong><time className="garden-muted text-xs" dateTime={item.date}>{formatDate(item.date)}</time></div>
                        <span className="font-bold">${item.amount.toFixed(2)}</span>
                    </li>)}
                </ul>}
        </article>
    );
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat("en-US", {month: "short", day: "numeric", year: "numeric", timeZone: "UTC"}).format(new Date(value));
}
