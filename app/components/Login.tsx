'use client'
import {useContext, useState} from "react";
import {AuthContext} from "@contexts/AuthContext";
import Input from "@components/Input";
import Button from "@components/button/Button";

export default function Login() {
	const [creatingAccount, setCreatingAccount] = useState(false);
	const [displayName, setDisplayName] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const authContext = useContext(AuthContext);
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

	return (
		<div className={"rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"}>
			<h2 className="mb-1 text-2xl font-semibold">{creatingAccount ? "Create a guardian account" : "Sign in"}</h2>
			<p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
				{creatingAccount ? "Guardian accounts can create and manage child profiles." : "Use your guardian or child username."}
			</p>
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
