import {useContext, useEffect, useMemo, useState} from "react";
import {CreateChildAccountDialog} from "./CreateChildAccountDialog";
import {ClientContext} from "@contexts/ClientContext";
import {ChildAccount} from "@models/child-account";
import {AuthContext} from "@contexts/AuthContext";
import IClient from "@models/client";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {ChildPreview} from "./ChildPreview";
import Button from "@components/button/Button";

export default function ParentDashboard() {
	const [childAccounts, setChildAccounts] = useState<ChildAccount[]>([]);
	const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [loadingDashboard, setLoadingDashboard] = useState(true);
	const [requestInProgress, setRequestInProgress] = useState<string | null>(null);
	const [dashboardLoadError, setDashboardLoadError] = useState("");
	const [requestError, setRequestError] = useState("");
	const client = useContext(ClientContext) as unknown as IClient;
	const {user} = useContext(AuthContext)!;

	useEffect(() => {
		if (!user?._id || !client) return;
		Promise.all([
			client.getChildAccounts(user._id),
			client.getPendingRequestsForParent(user._id),
		]).then(([accounts, requests]) => {
			setChildAccounts(accounts ?? []);
			setPendingRequests(requests);
		}).catch(() => {
			setDashboardLoadError("We couldn’t load the family dashboard. Please refresh and try again.");
		}).finally(() => setLoadingDashboard(false));
	}, [user, client]);

	const requestsByChild = useMemo(() => new Map(childAccounts.map(child => [
		child._id,
		pendingRequests.filter(request => request.childId === child._id),
	])), [childAccounts, pendingRequests]);
	const combinedBalance = childAccounts.reduce((total, child) => total + child.balance, 0);
	const highlightedRequest = pendingRequests[0];
	const highlightedChild = childAccounts.find(child => child._id === highlightedRequest?.childId);

	const handleCreateChildAccount = async (child: ChildAccount) => {
		setChildAccounts(currentAccounts => [...currentAccounts, child]);
		setIsDialogOpen(false);
	};

	const handleBalanceChanged = (childId: string, balance: number) => {
		setChildAccounts(currentAccounts => currentAccounts.map(child =>
			child._id === childId ? {...child, balance} : child,
		));
	};

	const handleApproveRequest = async (request: Transaction) => {
		if (!request._id || requestInProgress) return;
		setRequestInProgress(request._id);
		setRequestError("");
		try {
			const remainingRequests = await client.approveRequest({...request, approved: ApprovalStatus.Approved});
			setPendingRequests(remainingRequests);
			try {
				const refreshedChild = await client.getChildAccount(request.childId);
				handleBalanceChanged(request.childId, refreshedChild.balance);
			} catch {
				setRequestError("The request was approved, but the latest balance couldn’t refresh. Refresh the page to see it.");
			}
		} catch {
			setRequestError("We couldn’t approve that request. Nothing was changed.");
		} finally {
			setRequestInProgress(null);
		}
	};

	const handleDenyRequest = async (request: Transaction) => {
		if (!request._id || requestInProgress) return;
		setRequestInProgress(request._id);
		setRequestError("");
		try {
			setPendingRequests(await client.rejectRequest({...request, approved: ApprovalStatus.Rejected}));
		} catch {
			setRequestError("We couldn’t decline that request. Nothing was changed.");
		} finally {
			setRequestInProgress(null);
		}
	};

	return (
		<div className="w-full space-y-5 text-[var(--garden-text)]">
			<header className="flex flex-wrap items-center justify-between gap-5 py-2">
				<div>
					<p className="garden-kicker">Family dashboard</p>
					<h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Good morning, {user?.displayName}.</h1>
					<p className="garden-muted mt-2 text-lg">Here’s what needs your attention today.</p>
				</div>
				<Button buttonText="+ Add child" onButtonPressed={() => setIsDialogOpen(true)}/>
			</header>

			{loadingDashboard && <div className="garden-card p-6">Loading your family dashboard...</div>}
			{dashboardLoadError && <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200">{dashboardLoadError}</p>}
			{requestError && <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200">{requestError}</p>}
			{!loadingDashboard && !dashboardLoadError && <>
				<section aria-label="Family overview" className="garden-card grid overflow-hidden sm:grid-cols-3">
					<div className="border-b border-[var(--garden-border)] px-6 py-5 sm:border-r sm:border-b-0"><span className="garden-kicker !text-[var(--garden-muted)]">Children</span><strong className="block text-3xl">{childAccounts.length}</strong></div>
					<div className="border-b border-[var(--garden-border)] px-6 py-5 sm:border-r sm:border-b-0"><span className="garden-kicker !text-[var(--garden-muted)]">Combined balance</span><strong className="block text-3xl">${combinedBalance.toFixed(2)}</strong></div>
					<div className="bg-[var(--garden-learn-soft)] px-6 py-5"><span className="garden-kicker !text-[var(--garden-muted)]">Needs attention</span><strong className="block text-3xl text-[var(--garden-learn)]">{pendingRequests.length} request{pendingRequests.length === 1 ? "" : "s"}</strong></div>
				</section>

				<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
					<section className="garden-card space-y-4 p-5 md:p-6">
						<div><p className="garden-kicker">Family overview</p><h2 className="text-2xl font-semibold">Child accounts</h2></div>
						{childAccounts.length === 0
							? <p className="garden-muted">Create a child account to begin practicing together.</p>
							: childAccounts.map(child => <ChildPreview
								key={child._id}
								child={child}
								pendingRequests={requestsByChild.get(child._id) ?? []}
								requestInProgress={requestInProgress}
								onApproveRequest={handleApproveRequest}
								onDenyRequest={handleDenyRequest}
								onBalanceChanged={handleBalanceChanged}
							/>)}
					</section>

					<aside className={`garden-card p-6 ${highlightedRequest ? "border-[3px] !border-[color-mix(in_srgb,var(--garden-learn)_60%,transparent)] bg-[var(--garden-learn-soft)]" : "border-2"}`}>
						{highlightedRequest && highlightedChild ? <>
							<div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--garden-learn)] font-black text-[var(--garden-learn-contrast)]">{pendingRequests.length}</span><div><p className="garden-kicker">Needs your attention</p><h2 className="text-2xl font-semibold">Purchase request</h2></div></div>
							<div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--garden-surface)] font-extrabold">{highlightedChild.displayName.slice(0, 2).toUpperCase()}</span><div><strong className="block">{highlightedChild.displayName}</strong><span className="garden-muted text-sm">Waiting for your review</span></div></div>
							<div className="flex items-baseline justify-between border-t border-[color-mix(in_srgb,var(--garden-learn)_38%,transparent)] py-3"><span>Wants to spend</span><strong className="text-3xl">${highlightedRequest.amount.toFixed(2)}</strong></div>
							<blockquote className="my-2 rounded-r-xl border-l-4 border-[var(--garden-learn)] bg-[var(--garden-surface)] p-4">“{highlightedRequest.reason}”</blockquote>
							<div className="garden-muted flex justify-between gap-3 border-t border-[color-mix(in_srgb,var(--garden-learn)_38%,transparent)] py-3 text-sm"><span>Balance if approved</span><strong>${(highlightedChild.balance - highlightedRequest.amount).toFixed(2)}</strong></div>
							<div className="mt-3 grid grid-cols-[.7fr_1.3fr] gap-2"><Button variant="secondary" disabled={requestInProgress !== null} buttonText="Decline" onButtonPressed={() => handleDenyRequest(highlightedRequest)}/><Button disabled={requestInProgress !== null} buttonText={requestInProgress === highlightedRequest._id ? "Updating…" : "Approve request"} onButtonPressed={() => handleApproveRequest(highlightedRequest)}/></div>
						</> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--garden-brand-soft)] text-2xl text-[var(--garden-brand)]">✓</span><p className="garden-kicker">All caught up</p><h2 className="text-2xl font-semibold">Nothing needs review</h2><p className="garden-muted mt-2">New purchase requests will appear here.</p></div>}
					</aside>
				</div>
			</>}

			<CreateChildAccountDialog isOpen={isDialogOpen} onRequestClose={() => setIsDialogOpen(false)} onCreateChildAccount={handleCreateChildAccount}/>
		</div>
	);
}
