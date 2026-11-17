import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import Nav from "./nav";
import React from "react";
import {AuthProvider} from "./context/AuthContext";
import {ClientProvider} from "./context/ClientContext";
import {SpeedInsights} from "@vercel/speed-insights/next";
import {Analytics} from "@vercel/analytics/react";

const themeBootstrapScript = `
(() => {
  let theme = 'light';
  try {
    const savedTheme = localStorage.getItem('color-theme');
    theme = savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {}
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
})();`;

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
	title: "My First Investment | Family Money Learning",
	description: "A safe family simulator for practicing saving, budgeting, compound growth, and thoughtful spending—without real money.",
};

export default function RootLayout({children}: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{__html: themeBootstrapScript}}/>
			</head>
			<body className={`${inter.className}`}>
			<SpeedInsights/>
			<ClientProvider>
				<AuthProvider>
					<Nav/>
					<div id={"main"} className={"mx-auto mt-8 flex h-max w-full justify-center px-4 pb-10 lg:max-w-6xl"}>
						{children}
					</div>
					<Analytics/>
				</AuthProvider>
			</ClientProvider>
			</body>
		</html>
	);
}
