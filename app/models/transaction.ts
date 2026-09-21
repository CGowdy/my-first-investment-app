


export interface Transaction {
    _id?: string;
    amount: number;
    originalBalance?: number;
    finalBalance?: number;
    date: Date;
    childId: string;
    reason: string;
    approved: ApprovalStatus;
}

export enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
    AdminApproved
}
