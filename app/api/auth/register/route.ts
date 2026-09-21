import {parseGuardianRegistration} from "../../../domain/guardian-registration";
import {registerGuardian} from "../../../server/auth/register-guardian";

function registrationError(status: number, code: string, message: string): Response {
    return Response.json({error: {code, message}}, {status});
}

export const POST = async (req: Request) => {
    try {
        const body = await req.json().catch(() => null);
        const registration = parseGuardianRegistration(body);
        if (!registration) {
            return registrationError(
                400,
                "INVALID_REGISTRATION",
                "Enter a username, display name, and password of at least 8 characters",
            );
        }

        const result = await registerGuardian(registration);
        if (!result.ok) {
            return registrationError(409, "USERNAME_TAKEN", "Username is already in use");
        }
        return Response.json(result.account, {status: 201});
    } catch {
        console.error("Guardian registration failed");
        return registrationError(500, "REGISTRATION_FAILED", "Unable to create account");
    }
};
