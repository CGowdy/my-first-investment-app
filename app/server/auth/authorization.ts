import type {ChildAccount} from "@models/child-account";
import type {SessionIdentity} from "./token";

type ChildOwnership = Pick<ChildAccount, "_id" | "parentId">;

export function canManageFamily(session: SessionIdentity, familyId: string): boolean {
    return session.role === "guardian"
        && session.userId === familyId
        && session.familyId === familyId;
}

export function canAccessChild(session: SessionIdentity, child: ChildOwnership): boolean {
    if (session.role === "child") {
        return session.userId === child._id && session.familyId === child.parentId;
    }

    return canManageChild(session, child);
}

export function canManageChild(session: SessionIdentity, child: ChildOwnership): boolean {
    return session.role === "guardian"
        && session.userId === session.familyId
        && session.familyId === child.parentId;
}

export function canSubmitRequestForChild(session: SessionIdentity, child: ChildOwnership): boolean {
    return session.role === "child"
        && session.userId === child._id
        && session.familyId === child.parentId;
}
