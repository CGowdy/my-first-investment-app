import {createHmac, timingSafeEqual} from "node:crypto";

export type SessionRole = "guardian" | "child";

export interface SessionIdentity {
    userId: string;
    familyId: string;
    role: SessionRole;
}

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_VERSION = "v1";

type SessionPayload = SessionIdentity & {
    issuedAt: number;
    expiresAt: number;
};

function signatureFor(payload: string, secret: string): Buffer {
    return createHmac("sha256", secret).update(payload).digest();
}

export async function signSessionToken(identity: SessionIdentity, secret: string): Promise<string> {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: SessionPayload = {
        ...identity,
        issuedAt,
        expiresAt: issuedAt + SESSION_DURATION_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signedValue = `${TOKEN_VERSION}.${encodedPayload}`;
    const signature = signatureFor(signedValue, secret).toString("base64url");
    return `${signedValue}.${signature}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionIdentity | null> {
    try {
        const [version, encodedPayload, encodedSignature, ...extraParts] = token.split(".");
        if (version !== TOKEN_VERSION || !encodedPayload || !encodedSignature || extraParts.length > 0) {
            return null;
        }

        const signedValue = `${version}.${encodedPayload}`;
        const actualSignature = Buffer.from(encodedSignature, "base64url");
        const expectedSignature = signatureFor(signedValue, secret);
        if (
            actualSignature.length !== expectedSignature.length
            || !timingSafeEqual(actualSignature, expectedSignature)
        ) {
            return null;
        }

        const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SessionPayload>;
        if (
            typeof payload.userId !== "string"
            || typeof payload.familyId !== "string"
            || (payload.role !== "guardian" && payload.role !== "child")
            || typeof payload.expiresAt !== "number"
            || payload.expiresAt <= Math.floor(Date.now() / 1000)
        ) {
            return null;
        }

        return {
            userId: payload.userId,
            familyId: payload.familyId,
            role: payload.role,
        };
    } catch {
        return null;
    }
}
