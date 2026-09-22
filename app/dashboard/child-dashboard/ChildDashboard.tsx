import {useContext, useEffect, useState} from "react";
import Button from "@components/button/Button";
import {ClientContext} from "@contexts/ClientContext";
import LabelledInput from "../../components/LabeledInput";
import {ChildAccount} from "@models/child-account";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {Option} from "@models/option";
import {AuthContext} from "@contexts/AuthContext";
import IClient from "@models/client";

const calculateDailyEarnings = (balance: number, yearlyInterestRate: number): number => {
    const dailyInterestRate = yearlyInterestRate / 365;
    return balance * dailyInterestRate;
};

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

export default function ChildDashboard() {
    const {user} = useContext(AuthContext)!;
    const [pretendSpent, setPretendSpent] = useState("");
    const [pretendAdded, setPretendAdded] = useState("");
    const [requestAmount, setRequestAmount] = useState("");
    const [requestReason, setRequestReason] = useState("");
    const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
    const [error, setError] = useState<string>("");
    const client = useContext(ClientContext) as unknown as IClient;
    const childAccount = user?.isChildAccount ? user as ChildAccount : null;
    const childId = childAccount?._id;
    const dailyEarnings = childAccount
        ? calculateDailyEarnings(childAccount.balance, childAccount.interest / 100)
        : 0;

    useEffect(() => {
        if (!client || !childId) return;
        const fetchPendingRequests = async () => {
            try {
                const requests = await client.getPendingRequestsForChild(childId);
                setPendingRequests(requests);
            } catch (error) {
                console.log(error);
            }
        };

        fetchPendingRequests();
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
						<p className="garden-kicker">My money</p>
						<h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Hello {childAccount.displayName}</h1>
						<p className="garden-muted mt-2">Explore a choice, make a plan, and ask when you’re ready.</p>
					</div>
					<section aria-labelledby="account-balance-heading" className="rounded-[1.625rem] border-[3px] border-[color-mix(in_srgb,var(--garden-brand)_55%,transparent)] bg-[var(--garden-brand-soft)] px-6 py-5 md:min-w-64">
						<h2 id="account-balance-heading" className="garden-kicker">Account Balance</h2>
						<div className="text-4xl font-extrabold tracking-tight">$<span data-testid="account-balance">{childAccount.balance.toFixed(2)}</span></div>
						<div className="garden-muted mt-1 text-sm">Your current balance is <strong>${childAccount.balance.toFixed(2)}</strong></div>
						<div className="mt-2 text-sm">Today your money made you <strong className="text-[var(--garden-learn)]">${dailyEarnings.toFixed(2)}</strong></div>
					</section>
				</header>

				{pendingRequests.length > 0 && <div className="garden-card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
					<div><strong>{pendingRequests.length} request{pendingRequests.length > 1 ? "s are" : " is"} waiting for your parent</strong><p className="garden-muted text-sm">Available after requests</p></div>
					<div className="text-xl font-bold">$<span data-testid="account-balance-diff">{getReducedBalance()}</span> <span className="garden-muted text-sm font-medium">(${childAccount.balance.toFixed(2)})</span></div>
				</div>}

				<section className="garden-card grid gap-6 border-[3px] p-6 lg:grid-cols-[0.7fr_1.3fr]">
					<div className="flex flex-col items-start">
						<span aria-hidden="true" className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-[var(--garden-action)] text-xl font-black text-[var(--garden-action-text)]">?</span>
						<p className="garden-kicker">Learning playground</p>
						<h2 className="text-3xl font-semibold tracking-tight">Pretend Zone</h2>
						<p className="garden-muted mt-2">Try a money choice safely. Nothing here changes your real pretend balance.</p>
						<span className="mt-5 rounded-full bg-[var(--garden-brand-soft)] px-3 py-2 text-xs font-bold text-[var(--garden-brand)] lg:mt-auto">Safe to explore</span>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<section aria-labelledby="spend-scenario-heading" className="rounded-[1.5rem] border-[3px] border-[color-mix(in_srgb,var(--garden-spend)_55%,transparent)] bg-[var(--garden-spend-soft)] p-5">
							<h3 id="spend-scenario-heading" className="mb-4 text-lg font-bold text-[var(--garden-spend)]">Spend scenario</h3>
							<div className="space-y-1">
								<LabelledInput name="if-i-spend" label="If I spend" inputText={pretendSpent} onInputChanged={setPretendSpent} headerDisplay="$" placeholder="Enter amount here"/>
								<ProjectionResult label="Then my account will have" value={(childAccount.balance - Number(pretendSpent)).toFixed(2)} testId="spend-resulting-balance" tone="spend"/>
								<ProjectionResult label="Daily pretend growth" value={calculateDailyEarnings(childAccount.balance - Number(pretendSpent), childAccount.interest / 100).toFixed(2)} testId="spend-daily-growth" tone="spend"/>
							</div>
						</section>
						<section aria-labelledby="save-scenario-heading" className="rounded-[1.5rem] border-[3px] border-[color-mix(in_srgb,var(--garden-save)_55%,transparent)] bg-[var(--garden-save-soft)] p-5">
							<h3 id="save-scenario-heading" className="mb-4 text-lg font-bold text-[var(--garden-save)]">Save scenario</h3>
							<div className="space-y-1">
								<LabelledInput name="if-i-save" label="If I save" inputText={pretendAdded} onInputChanged={setPretendAdded} headerDisplay="$" placeholder="Enter amount here"/>
								<ProjectionResult label="Then my account will have" value={(childAccount.balance + Number(pretendAdded)).toFixed(2)} testId="save-resulting-balance" tone="save"/>
								<ProjectionResult label="Daily pretend growth" value={calculateDailyEarnings(childAccount.balance + Number(pretendAdded), childAccount.interest / 100).toFixed(2)} testId="save-daily-growth" tone="save"/>
							</div>
						</section>
					</div>
				</section>

				<section className="grid gap-6 rounded-[1.625rem] border-[3px] border-[color-mix(in_srgb,var(--garden-learn)_65%,transparent)] bg-[var(--garden-learn-soft)] p-6 lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
					<div><p className="garden-kicker">Ready to ask?</p><h2 className="text-2xl font-semibold">Spend Money Request</h2><p className="garden-muted mt-2">Tell your parent what you want and why.</p></div>
					<div className="flex w-full flex-col gap-3">
						<LabelledInput name="i-want-to-spend" label="I want to spend" inputText={requestAmount} onInputChanged={setRequestAmount} headerDisplay="$" placeholder="Enter amount"/>
						<LabelledInput name="i-want-to-spend-this-money-because" label="I want to spend this money because" inputText={requestReason} onInputChanged={setRequestReason} placeholder="I want a new toy"/>
						<Button buttonText="Request" onButtonPressed={onRequestSubmit}/>
						{error && <p role="alert" className="text-rose-600 dark:text-rose-300">{error}</p>}
					</div>
				</section>
			</div>}
		</div>
	);
}
