'use client'
import {useContext, useState} from "react";
import {AuthContext} from "@contexts/AuthContext";
import {ClientModeContext} from "@contexts/ClientContext";
import {ClientType} from "../enums/clientType";
import Input from "@components/Input";
import Button from "@components/button/Button";

export default function Login() {
	const [creatingAccount, setCreatingAccount] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const authContext = useContext(AuthContext);
	const clientMode = useContext(ClientModeContext);
	const demoEnabled = clientMode === ClientType.Mock;
	const [demoLoading, setDemoLoading] = useState<"parent" | "child" | null>(null);
	const [error, setError] = useState<string | null>(null);
	const login = async () => {
		const loginSuccess = await authContext?.login({username: username, password: password});
		setError(loginSuccess ? null : "Invalid username or password");
	}
	const register = async () => {
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		const result = await authContext?.register({username, displayName, password});
		setError(result?.ok ? null : result?.error ?? "Unable to create account");
	};
	const switchMode = () => {
		setCreatingAccount(current => !current);
		setError(null);
		setPassword("");
		setConfirmPassword("");
	};
	const loginAsDemo = async (role: "parent" | "child") => {
		setDemoLoading(role);
		setError(null);
		const loginSuccess = await authContext?.login({
			username: role === "parent" ? "demo-parent" : "demo-maya",
			password: "pass123",
		});
		if (!loginSuccess) setError("The demo could not start. Please try again.");
		setDemoLoading(null);
	};

	return (
		<div className={"rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}>
			<h2 className="mb-1 text-2xl font-semibold">{creatingAccount ? "Create a guardian account" : "Sign in"}</h2>
			<p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
				{creatingAccount ? "Guardian accounts can create and manage child profiles." : "Use your guardian or child username."}
			</p>
			{demoEnabled && !creatingAccount ? <section aria-labelledby="demo-entry-heading" className="mb-4 rounded-[1.25rem] border-2 border-[var(--garden-border)] bg-[var(--garden-brand-soft)] p-4">
				<p className="garden-kicker">Portfolio demo</p>
				<h3 id="demo-entry-heading" className="mt-1 text-lg font-bold">Explore without an account</h3>
				<p className="garden-muted mt-1 text-sm">Choose a view. Everything is fictional, private to this browser tab, and safe to change.</p>
				<div className="mt-4 grid gap-3 sm:grid-cols-2">
					<button type="button" disabled={demoLoading !== null} onClick={() => void loginAsDemo("parent")} className="rounded-2xl bg-[var(--garden-action)] p-4 text-left text-[var(--garden-action-text)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
						<strong className="block">{demoLoading === "parent" ? "Opening…" : "Try parent demo"}</strong>
						<span className="mt-1 block text-xs opacity-85">Review requests and manage two child accounts</span>
					</button>
					<button type="button" disabled={demoLoading !== null} onClick={() => void loginAsDemo("child")} className="rounded-2xl border-2 border-[var(--garden-save)] bg-[var(--garden-save-soft)] p-4 text-left text-[var(--garden-save)] transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60">
						<strong className="block">{demoLoading === "child" ? "Opening…" : "Try child demo"}</strong>
						<span className="mt-1 block text-xs opacity-85">Explore saving, spending, and growth</span>
					</button>
				</div>
			</section> : null}
			{demoEnabled && !creatingAccount ? <div className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-[var(--garden-muted)]"><span className="h-px flex-1 bg-[var(--garden-border)]"/><span>Or sign in normally</span><span className="h-px flex-1 bg-[var(--garden-border)]"/></div> : null}
			{creatingAccount ? <div className={"mb-3 flex-col"}>
				<label htmlFor={"display-name"}>Display name</label>
				<Input
					type={"text"}
					inputText={displayName}
					inputName={"display-name"}
					onInputChanged={setDisplayName}
				/>
			</div> : null}
			<div className={"flex-col mb-3"}>
				<label htmlFor={"username"}>Username</label>
				<Input
					type={"text"}
					inputText={username}
					inputName={"username"}
					onInputChanged={(e) => setUsername(e)}
					onKeyPress={(event) => {
						if (event.key === 'Enter') void login();
					}}
				/>
			</div>
			<div className={"flex-col mb-3"}>
				<label htmlFor={"password"}>Password</label>
				<Input
					type={"password"}
					inputName={"password"}
					inputText={password}
					onInputChanged={(e) => setPassword(e)}
					onKeyPress={(event) => {
						if (event.key === 'Enter' && !creatingAccount) void login();
					}}
				/>
			</div>
			{creatingAccount ? <div className={"mb-3 flex-col"}>
				<label htmlFor={"confirm-password"}>Confirm password</label>
				<Input
					type={"password"}
					inputName={"confirm-password"}
					inputText={confirmPassword}
					onInputChanged={setConfirmPassword}
					onKeyPress={(event) => {
						if (event.key === 'Enter') void register();
					}}
				/>
				<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Any non-empty password works during prototype testing.</p>
			</div> : null}
			{error ? <div role="alert" className={"text-sm font-medium text-red-700"}>{error}</div>:null}
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<Button buttonText={creatingAccount ? "Create account" : "Login"} onButtonPressed={creatingAccount ? register : login}/>
				<Button
					variant="tertiary"
					buttonText={creatingAccount ? "Back to sign in" : "Create an account"}
					onButtonPressed={switchMode}
				/>
			</div>
		</div>
	);
}
