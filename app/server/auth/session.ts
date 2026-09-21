import "server-only";

import {cookies} from "next/headers";
import {signSessionToken, type SessionIdentity, verifySessionToken} from "./token";

const SESSION_COOKIE = "mfi_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sessionSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("AUTH_SECRET must be configured with at least 32 characters");
    }
    return secret;
}

export function assertSessionConfigured(): void {
    void sessionSecret();
}

export async function createSession(identity: SessionIdentity): Promise<void> {
    const token = await signSessionToken(identity, sessionSecret());
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
    });
}

export async function readSession(): Promise<SessionIdentity | null> {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifySessionToken(token, sessionSecret());
}

export async function deleteSession(): Promise<void> {
    (await cookies()).delete(SESSION_COOKIE);
}
