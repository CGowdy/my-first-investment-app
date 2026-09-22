export type ChildReportItem = {
    id: string;
    amount: number;
    reason: string;
    date: string;
    resultingBalance?: number;
};

export type ChildReportSummary = {
    total: number;
    count: number;
    items: ChildReportItem[];
};

export type ChildReport = {
    spending: ChildReportSummary;
    growth: ChildReportSummary;
};
