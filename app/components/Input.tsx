import React from 'react';

export type InputProps = {
    inputText: string,
    onInputChanged?: (newInput: string) => void,
    onBlur?: (inputValue: string) => void,
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void,
    disabled?: boolean,
    className?: string,
    placeholder?: string,
    footerDisplay?: string,
    headerDisplay?: string,
    type?: string,
    inputName?: string
};
export default function Input({ inputText, onInputChanged, disabled, className, placeholder, footerDisplay, headerDisplay, type, inputName, onKeyPress, onBlur }: InputProps) {
    return (
		<div className="relative flex text-[var(--garden-text)]">
            {headerDisplay?
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pr-2 pl-1">
                    {headerDisplay}
                </div> : null}
            <input
                id={inputName}
                disabled={disabled}
                type={type?type:"text"}
                step={type === "number" ? "0.01" : undefined}
				className={`block w-full rounded-2xl border-0 bg-[var(--garden-surface)] px-3 py-2 text-[var(--garden-text)] caret-[var(--garden-brand)] placeholder:text-[var(--garden-muted)] ring-1 ring-inset ring-[var(--garden-border)] hover:bg-[var(--garden-brand-soft)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--garden-brand)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm sm:leading-6 ${className || ''} ${headerDisplay?'pl-5':''}`}
                value={inputText}
                onChange={e => onInputChanged && onInputChanged(e.target.value)}
                onBlur={e => onBlur && onBlur((e.target as HTMLInputElement).value)}
                placeholder={placeholder}
                onKeyDown={onKeyPress} />
            {footerDisplay?<div className={'pl-2'}>{footerDisplay}</div>:null}
        </div>

    );
}
