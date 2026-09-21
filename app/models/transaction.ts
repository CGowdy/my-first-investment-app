


export interface Transaction {
    _id?: string;
    amount: number;
    originalBalance?: number;
    finalBalance?: number;
    date: Date;
    childId: string;
    reason: string;
    approved: ApprovalStatus;
    approvedAt?: Date;
    actorId?: string;
}

export enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    AdminApproved
}
