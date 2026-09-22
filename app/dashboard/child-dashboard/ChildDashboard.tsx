import {useContext, useEffect, useState} from "react";
import Button from "@components/button/Button";
import {ClientContext} from "@contexts/ClientContext";
import LabelledInput from "../../components/LabeledInput";
import {ChildAccount} from "@models/child-account";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {Option} from "@models/option";
import {AuthContext} from "@contexts/AuthContext";
import IClient from "@models/client";
import {calculateDailyGrowth} from "../../domain/growth-accrual";
import type {ChildReport} from "@models/child-report";
import {GrowthLab} from "./GrowthLab";
import {MoneyReports} from "./MoneyReports";

type ProjectionResultProps = {
    label: string;
    value: string;
    testId: string;
    tone: 'spend' | 'save';
};

const projectionToneClasses = {
	spend: 'border-[color-mix(in_srgb,var(--garden-spend)_45%,transparent)] bg-[var(--garden-spend-soft)] text-[var(--garden-spend)]',
	save: 'border-[color-mix(in_srgb,var(--garden-save)_45%,transparent)] bg-[var(--garden-save-soft)] text-[var(--garden-save)]',
};

function ProjectionResult({label, value, testId, tone}: ProjectionResultProps) {
    return (
		<div className={`flex items-center justify-between gap-3 border-t px-1 py-3 ${projectionToneClasses[tone]}`}>
			<div className="text-sm opacity-80">{label}</div>
			<output data-testid={testId} className="block text-lg font-bold">${value}</output>
        </div>
    );
}

type ChildDashboardProps = {
	previewAccount?: ChildAccount;
};

export default function ChildDashboard({previewAccount}: ChildDashboardProps = {}) {
    const {user} = useContext(AuthContext)!;
    const [pretendSpent, setPretendSpent] = useState("");
    const [pretendAdded, setPretendAdded] = useState("");
    const [requestAmount, setRequestAmount] = useState("");
    const [requestReason, setRequestReason] = useState("");
    const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
    const [report, setReport] = useState<ChildReport | null>(null);
    const [reportLoading, setReportLoading] = useState(true);
    const [reportError, setReportError] = useState("");
    const [error, setError] = useState<string>("");
    const client = useContext(ClientContext) as unknown as IClient;
    const childAccount = previewAccount ?? (user?.isChildAccount ? user as ChildAccount : null);
    const childId = childAccount?._id;
    const dailyEarnings = childAccount
        ? calculateDailyGrowth(childAccount.balance, childAccount.interest)
        : 0;

    useEffect(() => {
        if (!client || !childId) return;
        let active = true;
        const fetchPendingRequests = async () => {
            try {
                const requests = await client.getPendingRequestsForChild(childId);
                if (active) setPendingRequests(requests);
            } catch (error) {
                console.log(error);
            }
        };
        const fetchReport = async () => {
            setReportLoading(true);
            setReportError("");
            try {
                const nextReport = await client.getChildReport(childId);
                if (active) setReport(nextReport);
            } catch {
                if (active) setReportError("Your reports couldn’t load right now. Your balance and Pretend Zone are still available.");
            } finally {
                if (active) setReportLoading(false);
            }
        };

        fetchPendingRequests();
        fetchReport();
        return () => {
            active = false;
        };
    }, [client, childId]);

    const onRequestSubmit = async () => {
        if (!childAccount || !childId) {
            setError('Child account is unavailable');
            return;
        }

        const newRequest: Transaction = {
            amount: Number(requestAmount),
            originalBalance: childAccount.balance,
            date: new Date(),
            childId,
            reason: requestReason,
            approved: ApprovalStatus.Pending
        }
        // Send request to backend
        try {
            const updatedRequests = await client.sendRequest(newRequest, (newRequest.amount < 0) ? {error: "Cannot have negative"} as Option : undefined);
            setPendingRequests(updatedRequests);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'Unable to send request');
        }

        setRequestAmount("");
        setRequestReason("");
    };

    const getReducedBalance = () => {
        if (!childAccount) return 0.00;
        const pendingRequestTotal = pendingRequests.reduce((total, transaction) => total + transaction.amount, 0);
        return (childAccount.balance - pendingRequestTotal).toFixed(2);
    }

	return (
		<div className="w-full text-[var(--garden-text)]">
			{!childAccount && <div>Loading...</div>}
			{childAccount && <div className="space-y-5">
				<header className="grid items-center gap-5 md:grid-cols-[1fr_auto]">
					<div>
						<p className="garden-kicker">Good morning, {childAccount.displayName}</p>
						<h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Your money is growing.</h1>
						<p className="garden-muted mt-2">Explore a choice, make a plan, and ask when you’re ready.</p>
					</div>
					<section aria-labelledby="account-balance-heading" className="rounded-[1.625rem] border-[3px] border-[color-mix(in_srgb,var(--garden-brand)_55%,transparent)] bg-[var(--garden-brand-soft)] px-6 py-5 md:min-w-64">
						<h2 id="account-balance-heading" className="garden-kicker">Available balance</h2>
						<div className="text-4xl font-extrabold tracking-tight">$<span data-testid="account-balance">{childAccount.balance.toFixed(2)}</span></div>
						<div className="garden-muted mt-1 text-sm">Your current balance is <strong>${childAccount.balance.toFixed(2)}</strong></div>
						<div className="mt-2 text-sm">Today your money made you <strong className="text-[var(--garden-learn)]">${dailyEarnings.toFixed(2)}</strong></div>
					</section>
				</header>

				<div className="garden-card grid items-center gap-4 px-5 py-4 sm:grid-cols-[auto_1fr_auto]">
					<span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--garden-learn-soft)] text-xl text-[var(--garden-learn)]">★</span>
					<div><strong>{pendingRequests.length > 0 ? `${pendingRequests.length} request${pendingRequests.length > 1 ? "s are" : " is"} waiting for your parent` : "You’re all caught up"}</strong><p className="garden-muted text-sm">{pendingRequests.length > 0 ? "Projected balance if approved" : `${childAccount.interest}% simulated annual growth`}</p></div>
					{pendingRequests.length > 0 ? <div className="text-xl font-bold">$<span data-testid="account-balance-diff">{getReducedBalance()}</span> <span className="garden-muted text-sm font-medium">(${childAccount.balance.toFixed(2)})</span></div> : <span className="rounded-full bg-[var(--garden-brand-soft)] px-3 py-2 text-sm font-bold text-[var(--garden-brand)]">Ready to explore</span>}
				</div>

				<section className="garden-card grid gap-6 border-[3px] p-6 lg:grid-cols-[0.7fr_1.3fr]">
					<div className="flex flex-col items-start">
						<span aria-hidden="true" className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-[var(--garden-action)] text-xl font-black text-[var(--garden-action-text)]">?</span>
						<p className="garden-kicker">Learning playground</p>
						<h2 className="text-3xl font-semibold tracking-tight">Pretend Zone</h2>
						<p className="garden-muted mt-2">Try a money choice safely. Nothing here changes your real pretend balance.</p>
						<span className="mt-5 rounded-full bg-[var(--garden-brand-soft)] px-3 py-2 text-xs font-bold text-[var(--garden-brand)] lg:mt-auto">Safe to explore</span>
					</div>
					<div className="grid gap-4">
						<section aria-labelledby="spend-scenario-heading" className="rounded-[1.5rem] border-[3px] border-[color-mix(in_srgb,var(--garden-spend)_55%,transparent)] bg-[var(--garden-spend-soft)] p-5">
							<h3 id="spend-scenario-heading" className="mb-4 text-lg font-bold text-[var(--garden-spend)]">Spend scenario</h3>
							<div className="space-y-1">
								<LabelledInput name="if-i-spend" label="If I spend" inputText={pretendSpent} onInputChanged={setPretendSpent} headerDisplay="$" placeholder="Enter amount here"/>
								<ProjectionResult label="Then my account will have" value={(childAccount.balance - Number(pretendSpent)).toFixed(2)} testId="spend-resulting-balance" tone="spend"/>
								<ProjectionResult label="Daily pretend growth" value={calculateDailyGrowth(childAccount.balance - Number(pretendSpent), childAccount.interest).toFixed(2)} testId="spend-daily-growth" tone="spend"/>
							</div>
						</section>
						<section aria-labelledby="save-scenario-heading" className="rounded-[1.5rem] border-[3px] border-[color-mix(in_srgb,var(--garden-save)_55%,transparent)] bg-[var(--garden-save-soft)] p-5">
							<h3 id="save-scenario-heading" className="mb-4 text-lg font-bold text-[var(--garden-save)]">Save scenario</h3>
							<div className="space-y-1">
								<LabelledInput name="if-i-save" label="If I save" inputText={pretendAdded} onInputChanged={setPretendAdded} headerDisplay="$" placeholder="Enter amount here"/>
								<ProjectionResult label="Then my account will have" value={(childAccount.balance + Number(pretendAdded)).toFixed(2)} testId="save-resulting-balance" tone="save"/>
								<ProjectionResult label="Daily pretend growth" value={calculateDailyGrowth(childAccount.balance + Number(pretendAdded), childAccount.interest).toFixed(2)} testId="save-daily-growth" tone="save"/>
							</div>
						</section>
					</div>
				</section>

				<GrowthLab child={childAccount}/>

				<MoneyReports report={report} loading={reportLoading} error={reportError}/>

				<section className="grid gap-6 rounded-[1.625rem] border-[3px] border-[color-mix(in_srgb,var(--garden-learn)_65%,transparent)] bg-[var(--garden-learn-soft)] p-6 lg:grid-cols-[0.58fr_1.42fr] lg:items-end">
					<div><p className="garden-kicker">Ready to ask?</p><h2 className="text-2xl font-semibold">Make a purchase request</h2><p className="garden-muted mt-2">Tell your parent what you want and why.</p></div>
					<div className="grid w-full gap-3 md:grid-cols-[0.55fr_1.25fr_auto] md:items-end">
						<LabelledInput name="i-want-to-spend" label="I want to spend" inputText={requestAmount} onInputChanged={setRequestAmount} headerDisplay="$" placeholder="Enter amount"/>
						<LabelledInput name="i-want-to-spend-this-money-because" label="I want to spend this money because" inputText={requestReason} onInputChanged={setRequestReason} placeholder="I want a new toy"/>
						<Button className="md:min-h-12 md:whitespace-nowrap" buttonText="Ask my parent" onButtonPressed={onRequestSubmit}/>
						{error && <p role="alert" className="text-rose-600 dark:text-rose-300 md:col-span-3">{error}</p>}
					</div>
				</section>
			</div>}
		</div>
	);
}
