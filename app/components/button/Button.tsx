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
        'primary': 'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700',
        'secondary': 'ring-1 ring-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800',
        'tertiary': 'bg-transparent text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-800',
    };

    const variantClassName = variantClassNames[variant] || 'bg-emerald-700';

    return (
        <button
            className={`${className ?? ''} ${variantClassName} button rounded-md px-2 py-1 text-sm font-semibold shadow-sm`}
            onClick={onButtonPressed}
        >
            {buttonText}
        </button>
    );
}
