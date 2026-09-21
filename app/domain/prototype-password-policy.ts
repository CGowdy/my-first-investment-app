const MAX_PASSWORD_LENGTH = 256;

// TODO before public launch: replace this permissive prototype rule with the chosen
// guardian/child authentication policy (for example, stronger passwords or passkeys).
export function isValidPrototypePassword(value: unknown): value is string {
    return typeof value === "string" && value.length >= 1 && value.length <= MAX_PASSWORD_LENGTH;
}
