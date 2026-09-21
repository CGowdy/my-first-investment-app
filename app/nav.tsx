'use client';
import Link from "next/link";
import {useContext} from "react";
import {AuthContext} from "./context/AuthContext";
import ThemeToggle from "./components/theme/ThemeToggle";

export type NavLink = {
	href: string,
	text: string
}
export default function Nav() {
	const authContext = useContext(AuthContext)!;
	const navLinks : NavLink[] = [
		{href: "/", text: "Home"},
		{href: "/dashboard", text: "Dashboard"}
	];

	const {user,logout} = authContext;
	return (
		<div className={"border-b border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}>
			<div className={"mx-4 flex items-center gap-2 py-2"}>
				{navLinks.map((link) => (
					<Link key={link.href} href={link.href} className={"rounded-sm px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"}>{link.text}</Link>
				))}
				<div className={"grow"}/>
				<ThemeToggle/>
				{user ? <Link key={"#"} href={"#"} className="rounded-sm px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => void logout()}>Logout</Link> : null}
			</div>
		</div>
	);
}
