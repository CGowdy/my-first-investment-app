import Input from "./Input";
import React from "react";

export type LabelledInputProps = {
    label: string;
    inputText: string;
    onInputChanged?: (newInput: string) => void;
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (inputValue:string) => void;
    className?: string;
    placeholder?: string;
    footerDisplay?:string;
    headerDisplay?:string;
    disabled?: boolean;
    name: string;
    type?: string;
}

export default function LabelledInput({label, inputText, onInputChanged, className, placeholder, footerDisplay, headerDisplay, disabled, name, type, onKeyPress, onBlur}: LabelledInputProps) {
    return (
		<div className={`relative rounded-2xl bg-[var(--garden-surface)] px-3 pb-1.5 pt-2.5 text-[var(--garden-text)] ring-1 ring-inset ring-[var(--garden-border)] focus-within:z-10 focus-within:ring-2 focus-within:ring-[var(--garden-brand)] ${className||''}`}>
            <label htmlFor={name} className="block text-xs font-medium">{label}</label>
            <Input className={'px-0'} type={type} inputName={name} inputText={inputText} onInputChanged={onInputChanged} onKeyPress={onKeyPress} onBlur={onBlur} placeholder={placeholder} footerDisplay={footerDisplay} headerDisplay={headerDisplay} disabled={disabled}/>
        </div>
    );
}
