'use client';

import {useEffect} from 'react';

type ColorTheme = 'light' | 'dark';

const storageKey = 'color-theme';

const applyTheme = (theme: ColorTheme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
};

export default function ThemeToggle() {
    useEffect(() => {
        const savedTheme = localStorage.getItem(storageKey);
        const preferredTheme: ColorTheme = savedTheme === 'light' || savedTheme === 'dark'
            ? savedTheme
            : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

        applyTheme(preferredTheme);
        document.documentElement.dataset.themeReady = 'true';
    }, []);

    const toggleTheme = () => {
        const nextTheme: ColorTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem(storageKey, nextTheme);
        applyTheme(nextTheme);
    };

    return (
        <button
            type="button"
            aria-label="Toggle color theme"
            onClick={toggleTheme}
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
            <span aria-hidden="true" className="text-lg leading-none dark:hidden">☾</span>
            <span aria-hidden="true" className="hidden text-lg leading-none dark:inline">☀</span>
        </button>
    );
}
