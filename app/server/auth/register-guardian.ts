import type {GuardianRegistrationData} from "@models/auth";
import type {IUser} from "@models/user";
import {
    Collection,
    ensureUserUsernameUniqueIndex,
    findOne,
    insertOneOrThrow,
    isDuplicateKeyError,
} from "@server/database/mongodb";
import {hashPassword} from "./password";
import {assertSessionConfigured, createSession} from "./session";
import type {StoredUser} from "./types";

export type GuardianRegistrationResult =
    | {ok: true; account: IUser}
    | {ok: false; reason: "USERNAME_TAKEN"};

export async function registerGuardian(
    registration: GuardianRegistrationData,
): Promise<GuardianRegistrationResult> {
    assertSessionConfigured();
    await ensureUserUsernameUniqueIndex();

    const existingUser = (await findOne<StoredUser>(Collection.Users, {
        username: registration.username,
    }))?.document;
    if (existingUser) return {ok: false, reason: "USERNAME_TAKEN"};

    const user: Omit<StoredUser, "_id"> = {
        username: registration.username,
        displayName: registration.displayName,
        passwordHash: await hashPassword(registration.password),
        isChildAccount: false,
    };

    try {
        const result = await insertOneOrThrow(Collection.Users, user);
        const account: IUser = {
            _id: result.insertedId,
            username: user.username,
            displayName: user.displayName,
            isChildAccount: false,
        };

        await createSession({
            userId: result.insertedId,
            familyId: result.insertedId,
            role: "guardian",
        });
        return {ok: true, account};
    } catch (error) {
        if (isDuplicateKeyError(error)) return {ok: false, reason: "USERNAME_TAKEN"};
        throw error;
    }
}
