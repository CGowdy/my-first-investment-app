'use client';
import Link from "next/link";
import {useContext} from "react";
import {AuthContext} from "./context/AuthContext";
import ThemeToggle from "./components/theme/ThemeToggle";

export default function Nav() {
	const authContext = useContext(AuthContext)!;
	const {user,logout} = authContext;
	return (
		<div className="border-b border-[var(--garden-border)] bg-[var(--garden-page)] text-[var(--garden-text)]">
			<div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
				<Link href="/dashboard" className="flex items-center gap-3 rounded-full pr-3 font-extrabold tracking-tight hover:bg-[var(--garden-brand-soft)]">
					<span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--garden-action)] text-sm text-[var(--garden-action-text)]">M</span>
					<span className="hidden sm:inline">My First Investment</span>
				</Link>
				<div className={"grow"}/>
				<ThemeToggle/>
				{user ? <Link key={"#"} href={"#"} className="rounded-full px-3 py-2 text-sm font-semibold hover:bg-[var(--garden-brand-soft)]" onClick={() => void logout()}>Logout</Link> : null}
			</div>
		</div>
	);
}
