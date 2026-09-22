import type {UpdateChildAccountInput} from "@models/child-account";
import {isValidPrototypePassword} from "./prototype-password-policy";

export function parseUpdateChildAccount(value: unknown): UpdateChildAccountInput | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

    const input = value as Record<string, unknown>;
    const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
    const username = typeof input.username === "string" ? input.username.trim() : "";
    const password = input.password === "" || input.password === undefined ? undefined : input.password;

    if (
        displayName.length < 1 || displayName.length > 128
        || username.length < 1 || username.length > 128
        || (password !== undefined && !isValidPrototypePassword(password))
        || typeof input.interest !== "number"
        || !Number.isFinite(input.interest)
        || input.interest < 0
        || input.interest > 100
    ) return null;

    return {
        displayName,
        username,
        ...(typeof password === "string" ? {password} : {}),
        interest: input.interest,
    };
}
