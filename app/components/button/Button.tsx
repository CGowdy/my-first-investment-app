type Variant = 'primary' | 'secondary' | 'tertiary';
export type ButtonProps = {
    buttonText: string,
    onButtonPressed: () => void,
    className?: string,
    actionType?: string,
    variant?: Variant
}
export default function Button({buttonText, onButtonPressed, className, variant = 'primary'}: ButtonProps) {
    const variantClassNames: Record<Variant, string> = {
        'primary': 'bg-[var(--garden-action)] text-[var(--garden-action-text)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--garden-brand)]',
        'secondary': 'border border-[var(--garden-border)] bg-[var(--garden-surface)] text-[var(--garden-text)] hover:bg-[var(--garden-brand-soft)]',
        'tertiary': 'bg-transparent text-[var(--garden-brand)] hover:bg-[var(--garden-brand-soft)]',
    };

    const variantClassName = variantClassNames[variant] || 'bg-emerald-700';

    return (
        <button
			className={`${className ?? ''} ${variantClassName} button rounded-full px-4 py-2 text-sm font-semibold transition-colors`}
            onClick={onButtonPressed}
        >
            {buttonText}
        </button>
    );
}
