import type {GuardianRegistrationData} from "@models/auth";

const MAX_USERNAME_LENGTH = 128;
const MAX_DISPLAY_NAME_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;

export function parseGuardianRegistration(value: unknown): GuardianRegistrationData | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

    const candidate = value as Record<string, unknown>;
    const username = typeof candidate.username === "string" ? candidate.username.trim() : "";
    const displayName = typeof candidate.displayName === "string" ? candidate.displayName.trim() : "";

    if (
        username.length < 1
        || username.length > MAX_USERNAME_LENGTH
        || displayName.length < 1
        || displayName.length > MAX_DISPLAY_NAME_LENGTH
        || typeof candidate.password !== "string"
        || candidate.password.length < MIN_PASSWORD_LENGTH
        || candidate.password.length > MAX_PASSWORD_LENGTH
    ) return null;

    return {username, displayName, password: candidate.password};
}
