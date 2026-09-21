import type {LoginData} from "@models/auth";

const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 256;

export function parseLoginData(value: unknown): LoginData | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.username !== "string" || typeof candidate.password !== "string") {
        return null;
    }

    if (
        candidate.username.length < 1
        || candidate.username.length > MAX_USERNAME_LENGTH
        || candidate.password.length < 1
        || candidate.password.length > MAX_PASSWORD_LENGTH
    ) {
        return null;
    }

    return {
        username: candidate.username,
        password: candidate.password,
    };
}

export function withoutPassword<T extends {password: string}>(value: T): Omit<T, "password"> {
    const {password: _password, ...safeValue} = value;
    return safeValue;
}
