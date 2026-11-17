import Link from "next/link";

const highlights = [
    {icon: "↗", title: "See choices grow", copy: "Kids can compare saving and spending decisions across days or years without changing their account.", tone: "save"},
    {icon: "✓", title: "Practice together", copy: "Parents review purchase requests, adjust practice balances, and explain the story behind every change.", tone: "learn"},
    {icon: "◎", title: "Learn without risk", copy: "No real money, bank links, investments, or financial advice—just a safe family learning simulation.", tone: "spend"},
] as const;

export default function Home() {
    return <main className="w-full space-y-8 text-[var(--garden-text)]">
        <section className="garden-card relative overflow-hidden border-[3px] px-6 py-12 md:px-12 md:py-16">
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--garden-save-soft)]"/>
            <div aria-hidden="true" className="absolute -bottom-24 right-28 h-56 w-56 rounded-full bg-[var(--garden-learn-soft)]"/>
            <div className="relative max-w-3xl">
                <p className="garden-kicker">A family financial-learning simulator</p>
                <h1 className="mt-3 text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">Help money lessons <span className="text-[var(--garden-brand)]">take root.</span></h1>
                <p className="garden-muted mt-6 max-w-2xl text-lg leading-8 md:text-xl">Give children a safe place to practice saving, budgeting, simulated growth, and thoughtful spending—with a parent guiding every real-world decision.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/dashboard?demo=parent" className="rounded-full bg-[var(--garden-action)] px-6 py-3 font-bold text-[var(--garden-action-text)] transition hover:-translate-y-0.5 hover:shadow-lg">Explore as a parent</Link>
                    <Link href="/dashboard?demo=child" className="rounded-full border-2 border-[var(--garden-save)] bg-[var(--garden-save-soft)] px-6 py-3 font-bold text-[var(--garden-save)] transition hover:-translate-y-0.5 hover:shadow-lg">Explore as a child</Link>
                </div>
                <p className="garden-muted mt-4 text-sm">No signup required for the demo. All names and balances are fictional.</p>
            </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-it-works-heading" className="space-y-5">
            <div className="max-w-2xl"><p className="garden-kicker">How it works</p><h2 id="how-it-works-heading" className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Serious concepts, approachable practice.</h2></div>
            <div className="grid gap-4 md:grid-cols-3">
                {highlights.map(highlight => <article key={highlight.title} className={`garden-card border-2 p-6 ${highlight.tone === "save" ? "bg-[var(--garden-save-soft)]" : highlight.tone === "learn" ? "bg-[var(--garden-learn-soft)]" : "bg-[var(--garden-spend-soft)]"}`}>
                    <span aria-hidden="true" className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl font-black ${highlight.tone === "save" ? "bg-[var(--garden-save)] text-white" : highlight.tone === "learn" ? "bg-[var(--garden-learn)] text-[var(--garden-learn-contrast)]" : "bg-[var(--garden-spend)] text-white"}`}>{highlight.icon}</span>
                    <h3 className="mt-5 text-xl font-bold">{highlight.title}</h3>
                    <p className="garden-muted mt-2 leading-7">{highlight.copy}</p>
                </article>)}
            </div>
        </section>

        <section className="garden-card flex flex-col items-start justify-between gap-6 border-[3px] p-7 md:flex-row md:items-center md:p-9">
            <div><p className="garden-kicker">Ready to explore?</p><h2 className="mt-1 text-3xl font-semibold">Step into a fictional family dashboard.</h2><p className="garden-muted mt-2">Try both the parent and child experience, approve requests, and experiment with compound growth.</p></div>
            <Link href="/dashboard" className="shrink-0 rounded-full bg-[var(--garden-action)] px-6 py-3 font-bold text-[var(--garden-action-text)]">Choose a demo role</Link>
        </section>
    </main>;
}
