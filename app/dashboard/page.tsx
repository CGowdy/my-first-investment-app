'use client'
import {useContext, useEffect, useRef, useState} from "react";
import Login from "../components/Login";
import ChildDashboard from "./child-dashboard/ChildDashboard";
import ParentDashboard from "./parent-dashboard/ParentDashboard";
import {AuthContext} from "@contexts/AuthContext";
import {ChildAccount} from "@models/child-account";
import Button from "@components/button/Button";
import {ClientContext, ClientModeContext} from "@contexts/ClientContext";
import {ClientType} from "../enums/clientType";
import type IClient from "@models/client";
import {useRouter} from "next/navigation";

type ResettableDemoClient = IClient & {resetDemo: () => Promise<void>};

function canResetDemo(client: IClient | null): client is ResettableDemoClient {
	return Boolean(client && typeof (client as Partial<ResettableDemoClient>).resetDemo === "function");
}

export default function Dashboard() {
	const {user, login, logout} = useContext(AuthContext)!;
	const client = useContext(ClientContext);
	const demoEnabled = useContext(ClientModeContext) === ClientType.Mock;
	const automaticDemoStarted = useRef(false);
	const router = useRouter();
	const [preview, setPreview] = useState<{guardianId: string; child: ChildAccount} | null>(null);
	const previewChild = preview && preview.guardianId === user?._id ? preview.child : null;
	const resetDemo = async () => {
		if (canResetDemo(client)) await client.resetDemo();
		await logout();
		router.replace("/dashboard");
	};

	useEffect(() => {
		if (!demoEnabled || automaticDemoStarted.current) return;
		const demoRole = new URLSearchParams(window.location.search).get("demo");
		if (demoRole !== "parent" && demoRole !== "child") return;
		const requestedChildRole = demoRole === "child";
		if (user?.isChildAccount === requestedChildRole) {
			window.history.replaceState(null, "", "/dashboard");
			return;
		}
		automaticDemoStarted.current = true;
		void (async () => {
			if (user) await logout();
			const loginSucceeded = await login({
				username: demoRole === "parent" ? "demo-parent" : "demo-maya",
				password: "pass123",
			});
			if (loginSucceeded) window.history.replaceState(null, "", "/dashboard");
			else automaticDemoStarted.current = false;
		})();
	}, [demoEnabled, login, logout, user]);

	const renderUserStatus = user
	?	<div className={"mx-2 lg:mx-0 lg:w-full"}>
			{user.isChildAccount ? <ChildDashboard/> : previewChild ? <>
				<section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border-2 border-[color-mix(in_srgb,var(--garden-learn)_60%,transparent)] bg-[var(--garden-learn-soft)] px-5 py-4 text-[var(--garden-text)]" aria-label="Guardian acting as child">
					<div><p className="garden-kicker">Guardian mode</p><strong className="block text-lg">You’re acting as {previewChild.displayName}</strong><p className="garden-muted text-sm">You are still signed in as the guardian. Actions are recorded as performed on this child’s behalf.</p></div>
					<Button variant="secondary" buttonText="Back to parent dashboard" onButtonPressed={() => setPreview(null)}/>
				</section>
				<ChildDashboard previewAccount={previewChild}/>
			</> : (
				<ParentDashboard onViewAsChild={child => user._id && setPreview({guardianId: user._id, child})}/>
			)}
		</div>

	:	<div className={"sm:w-full"}>
			<Login/>
		</div>;

	return (
		<div className={"w-full"}>
			{demoEnabled && user ? <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[var(--garden-brand)] bg-[var(--garden-brand-soft)] px-4 py-3 text-[var(--garden-text)]" aria-label="Demo workspace controls">
				<div><strong className="block">Demo workspace</strong><span className="garden-muted text-sm">Fictional data · changes stay in this browser tab</span></div>
				<Button variant="secondary" buttonText="Reset demo" onButtonPressed={() => void resetDemo()}/>
			</section> : null}
			{user ? null : <h1 className={"mb-4"}>Welcome to the Dashboard</h1>}
			{renderUserStatus}
		</div>
	);
}
