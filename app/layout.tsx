import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import Nav from "./nav";
import React from "react";
import {AuthProvider} from "./context/AuthContext";
import {ClientProvider} from "./context/ClientContext";
import {SpeedInsights} from "@vercel/speed-insights/next";
import {Analytics} from "@vercel/analytics/react";

/* eslint-disable @next/next/no-page-custom-font -- Material Symbols is a stylesheet, not a text font. */

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
	title: "My First Investment App",
	description: "Kids 'invest', parents save, everyone wins!",
};

export default function RootLayout({children}: { children: React.ReactNode }) {
	return (
		<>
			<html lang="en">
			<head>
				<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=optional" rel="stylesheet" />
			</head>
			<body className={`${inter.className}`}>
			<SpeedInsights/>
			<ClientProvider>
				<AuthProvider>
					<Nav/>
					<div id={"main"} className={"mx-auto mt-8 flex h-max w-full justify-center px-4 pb-10 lg:max-w-3xl"}>
						{children}
					</div>
					<Analytics/>
				</AuthProvider>
			</ClientProvider>
			</body>
			</html>
		</>
	);
}
