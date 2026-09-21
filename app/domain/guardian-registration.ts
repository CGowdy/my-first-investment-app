import type {GuardianRegistrationData} from "@models/auth";
import {isValidPrototypePassword} from "./prototype-password-policy";

const MAX_USERNAME_LENGTH = 128;
const MAX_DISPLAY_NAME_LENGTH = 128;

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
        || !isValidPrototypePassword(candidate.password)
    ) return null;

    return {username, displayName, password: candidate.password};
}
