import {ChildAccount} from "@models/child-account";
import {Transaction} from "@models/transaction";
import {useContext, useState} from "react";
import {ClientContext} from "@contexts/ClientContext";
import IClient from "@models/client";
import Button from "@components/button/Button";
import Input from "@components/Input";
import {EditChildAccountDialog} from "./EditChildAccountDialog";

export type ChildPreviewProps = {
	child: ChildAccount;
	pendingRequests: Transaction[];
	requestInProgress: string | null;
	onApproveRequest: (request: Transaction) => Promise<void>;
	onDenyRequest: (request: Transaction) => Promise<void>;
	onBalanceChanged: (childId: string, balance: number) => void;
	onChildUpdated: (child: ChildAccount) => void;
	onViewAsChild: (child: ChildAccount) => void;
}

export function ChildPreview({child, pendingRequests, requestInProgress, onApproveRequest, onDenyRequest, onBalanceChanged, onChildUpdated, onViewAsChild}: ChildPreviewProps) {
	const [loadingAdjustment, setLoadingAdjustment] = useState(false);
	const [showRequests, setShowRequests] = useState(false);
	const [showAdjustment, setShowAdjustment] = useState(false);
	const [adjustment, setAdjustment] = useState(0);
	const [adjustmentError, setAdjustmentError] = useState("");
	const [showEditAccount, setShowEditAccount] = useState(false);
	const client = useContext(ClientContext) as unknown as IClient;

	const openAdjustment = () => {
		setAdjustmentError("");
		setShowAdjustment(true);
	};

	const cancelAdjustment = () => {
		setAdjustment(0);
		setAdjustmentError("");
		setShowAdjustment(false);
	};

	const adjustBalance = async () => {
		try {
			if (!child._id) return;
			setLoadingAdjustment(true);
			setAdjustmentError("");
			const newBalance = await client.adjustBalance(child._id, adjustment);
			onBalanceChanged(child._id, newBalance.balance);
			setAdjustment(0);
			setShowAdjustment(false);
		} catch (error) {
			setAdjustmentError(error instanceof Error ? error.message : "Unable to adjust balance");
		} finally {
			setLoadingAdjustment(false);
		}
	};

	return (
		<article data-testid={`child-preview-${child._id}`} className={`relative overflow-hidden rounded-[1.25rem] border-2 bg-[var(--garden-surface)] p-5 ${pendingRequests.length > 0 ? "border-[color-mix(in_srgb,var(--garden-learn)_70%,transparent)]" : "border-[var(--garden-border)]"}`}>
			{loadingAdjustment && <div className="absolute inset-0 z-10 grid place-items-center bg-[color-mix(in_srgb,var(--garden-surface)_80%,transparent)]"><span className="rounded-full bg-[var(--garden-surface)] px-4 py-2 font-semibold">Loading…</span></div>}

			<div className="grid gap-4 md:grid-cols-[minmax(190px,1.2fr)_minmax(120px,.6fr)_auto] md:items-center">
				<div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--garden-brand-soft)] font-extrabold text-[var(--garden-brand)]">{child.displayName.slice(0, 2).toUpperCase()}</span><div><h3 className="text-lg font-bold">{child.displayName}</h3><p className="garden-muted text-sm">{child.interest}% simulated growth</p></div></div>
				<div><span className="garden-muted text-xs font-bold">Balance</span><div className="text-2xl font-bold">$<span data-testid={`child-balance-${child._id}`}>{child.balance}</span></div></div>
				<div className="flex flex-wrap items-center gap-2 md:justify-end">
					{pendingRequests.length > 0 && <button type="button" aria-expanded={showRequests} aria-label={`${pendingRequests.length} pending request${pendingRequests.length > 1 ? "s" : ""}`} className="rounded-full bg-[var(--garden-learn-soft)] px-3 py-2 text-sm font-bold text-[var(--garden-learn)]" onClick={() => setShowRequests(!showRequests)}><span>{pendingRequests.length} request{pendingRequests.length > 1 ? "s" : ""}</span> <span aria-hidden="true">{showRequests ? "▲" : "▼"}</span></button>}
					{pendingRequests.length === 0 && <span className="rounded-full bg-[var(--garden-brand-soft)] px-3 py-2 text-sm font-bold text-[var(--garden-brand)]">All caught up</span>}
					<Button variant="secondary" buttonText="Act as child" onButtonPressed={() => onViewAsChild(child)}/>
					<Button variant="secondary" buttonText="Edit account" onButtonPressed={() => setShowEditAccount(true)}/>
					<Button variant="secondary" buttonText="Adjust balance" onButtonPressed={openAdjustment}/>
				</div>
			</div>

			{showAdjustment && <div className="mt-4 grid gap-3 rounded-2xl border-2 border-[color-mix(in_srgb,var(--garden-learn)_55%,transparent)] bg-[var(--garden-learn-soft)] p-4 sm:grid-cols-[auto_auto_1fr_auto_auto] sm:items-center"><Button buttonText="+" onButtonPressed={() => setAdjustment(adjustment + 1)}/><Button variant="secondary" buttonText="-" onButtonPressed={() => setAdjustment(adjustment - 1)}/><Input inputText={adjustment.toString()} onInputChanged={(newInput) => setAdjustment(Number(newInput))}/><Button variant="secondary" buttonText="Cancel" onButtonPressed={cancelAdjustment}/><Button buttonText="Submit" onButtonPressed={adjustBalance}/></div>}
			{adjustmentError && <p role="alert" className="mt-3 text-rose-700 dark:text-rose-300">{adjustmentError}</p>}

			{showRequests && <div className="mt-4 space-y-3 border-t border-[var(--garden-border)] pt-4">
				{pendingRequests.map(request => <div id={request._id} key={request._id} className="rounded-2xl border-2 border-[color-mix(in_srgb,var(--garden-learn)_55%,transparent)] bg-[var(--garden-learn-soft)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div data-testid={request._id} className="text-lg font-bold">Request ${request.amount}</div><div className="garden-muted">Reason: {request.reason}</div></div><div className="flex gap-2"><Button disabled={requestInProgress !== null} buttonText={requestInProgress === request._id ? "Updating…" : "Approve"} onButtonPressed={() => onApproveRequest(request)}/><Button disabled={requestInProgress !== null} variant="secondary" buttonText="Deny" onButtonPressed={() => onDenyRequest(request)}/></div></div>{requestInProgress === request._id && <p className="garden-muted mt-2 text-sm">Updating request…</p>}</div>)}
			</div>}

			{showEditAccount && <EditChildAccountDialog
				child={child}
				isOpen={showEditAccount}
				onRequestClose={() => setShowEditAccount(false)}
				onChildUpdated={onChildUpdated}
			/>}
		</article>
	);
}
