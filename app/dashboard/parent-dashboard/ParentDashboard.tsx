import {useContext, useEffect, useState} from "react";
import {CreateChildAccountDialog} from "./CreateChildAccountDialog";
import {ClientContext} from "@contexts/ClientContext";
import {ChildAccount} from "@models/child-account";
import {AuthContext} from "@contexts/AuthContext";
import IClient from "@models/client";
import {ChildPreview} from "./ChildPreview";
import Button from "@components/button/Button";

export default function ParentDashboard() {
	const [childAccounts, setChildAccounts] = useState<ChildAccount[]>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [loadingChildAccounts, setLoadingChildAccounts] = useState(true);
	const client = useContext(ClientContext) as unknown as IClient;

	const handleCreateChildAccount = async (child: ChildAccount) => {
		setLoadingChildAccounts(true);
		setChildAccounts([...childAccounts, child]);
		setIsDialogOpen(false);
		setLoadingChildAccounts(false);
	};

	const {user} = useContext(AuthContext)!;
	const combinedBalance = childAccounts.reduce((total, child) => total + child.balance, 0);
	useEffect(() => {
		if (user && user._id && client) {
			client.getChildAccounts(user._id)
				.then((childAccounts: ChildAccount[] | null) => {
					if (childAccounts) {
						setChildAccounts(childAccounts);
						setLoadingChildAccounts(false);
					}
				});
		}
	}, [user, client]);


	return (
		<div className="w-full space-y-5 text-[var(--garden-text)]">
			<header className="flex flex-wrap items-center justify-between gap-5">
				<div><p className="garden-kicker">Family dashboard</p><h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Welcome to the parent dashboard</h1><p className="garden-muted mt-2">Review requests and help each child make their next money decision.</p></div>
				<Button buttonText="Create Child Account" onButtonPressed={() => setIsDialogOpen(true)}/>
			</header>
			{loadingChildAccounts && <div className="garden-card p-6">Loading child accounts...</div>}
			{!loadingChildAccounts && <>
				<section aria-label="Family overview" className="garden-card grid overflow-hidden sm:grid-cols-2">
					<div className="border-b border-[var(--garden-border)] px-6 py-5 sm:border-r sm:border-b-0"><span className="garden-kicker">Children</span><strong className="block text-3xl">{childAccounts.length}</strong></div>
					<div className="px-6 py-5"><span className="garden-kicker">Combined balance</span><strong className="block text-3xl">${combinedBalance.toFixed(2)}</strong></div>
				</section>
				<section className="garden-card space-y-4 p-5 md:p-6">
					<div><p className="garden-kicker">Family overview</p><h2 className="text-2xl font-semibold">Child accounts</h2></div>
					{childAccounts.length === 0
						? <p className="garden-muted">Create a child account to begin practicing together.</p>
						: childAccounts.map((child) => <ChildPreview key={child._id} child={child} onChildSelected={() => console.log("child selected")}/>) }
				</section>
			</>}
			<CreateChildAccountDialog isOpen={isDialogOpen} onRequestClose={() => setIsDialogOpen(false)}
									  onCreateChildAccount={handleCreateChildAccount}/>
		</div>
	);
}
