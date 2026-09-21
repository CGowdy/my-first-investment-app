import {useContext, useEffect, useState} from "react";
import Button from "@components/button/Button";
import {ClientContext} from "@contexts/ClientContext";
import LabelledInput from "../../components/LabeledInput";
import {ChildAccount} from "@models/child-account";
import {ApprovalStatus, Transaction} from "@models/transaction";
import {Option} from "@models/option";
import {AuthContext} from "@contexts/AuthContext";
import IClient from "@models/client";

const calculateDailyEarnings = (balance: number, yearlyInterestRate: number): number => {
    const dailyInterestRate = yearlyInterestRate / 365;
    return balance * dailyInterestRate;
};

type ProjectionResultProps = {
    label: string;
    value: string;
    testId: string;
    tone: 'spend' | 'save';
};

const projectionToneClasses = {
    spend: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
    save: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200',
};

function ProjectionResult({label, value, testId, tone}: ProjectionResultProps) {
    return (
        <div className={`rounded-lg border px-3 py-2 ${projectionToneClasses[tone]}`}>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</div>
            <output data-testid={testId} className="block text-lg font-semibold">${value}</output>
        </div>
    );
}

export default function ChildDashboard() {
    const {user} = useContext(AuthContext)!;
    const [pretendSpent, setPretendSpent] = useState("");
    const [pretendAdded, setPretendAdded] = useState("");
    const [requestAmount, setRequestAmount] = useState("");
    const [requestReason, setRequestReason] = useState("");
    const [pendingRequests, setPendingRequests] = useState<Transaction[]>([]);
    const [error, setError] = useState<string>("");
    const client = useContext(ClientContext) as unknown as IClient;
    const childAccount = user?.isChildAccount ? user as ChildAccount : null;
    const childId = childAccount?._id;
    const dailyEarnings = childAccount
        ? calculateDailyEarnings(childAccount.balance, childAccount.interest / 100)
        : 0;

    useEffect(() => {
        if (!client || !childId) return;
        const fetchPendingRequests = async () => {
            try {
                const requests = await client.getPendingRequestsForChild(childId);
                setPendingRequests(requests);
            } catch (error) {
                console.log(error);
            }
        };

        fetchPendingRequests();
    }, [client, childId]);

    const onRequestSubmit = async () => {
        if (!childAccount || !childId) {
            setError('Child account is unavailable');
            return;
        }

        const newRequest: Transaction = {
            amount: Number(requestAmount),
            originalBalance: childAccount.balance,
            date: new Date(),
            childId,
            reason: requestReason,
            approved: ApprovalStatus.Pending
        }
        // Send request to backend
        try {
            const updatedRequests = await client.sendRequest(newRequest, (newRequest.amount < 0) ? {error: "Cannot have negative"} as Option : undefined);
            setPendingRequests(updatedRequests);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : 'Unable to send request');
        }

        setRequestAmount("");
        setRequestReason("");
    };

    const getReducedBalance = () => {
        if (!childAccount) return 0.00;
        const pendingRequestTotal = pendingRequests.reduce((total, transaction) => total + transaction.amount, 0);
        return (childAccount.balance - pendingRequestTotal).toFixed(2);
    }

    return (
        <div className={'w-full flex-col'}>
            {!childAccount && <div>Loading...</div>}
            {childAccount && childAccount.balance &&
                <div>
                <h1>Hello {childAccount.displayName}</h1>
                <br/>
                <div className="prose mb-2 max-w-none rounded-2xl bg-white px-4 py-5 text-lg font-bold text-slate-900 dark:prose-invert dark:bg-slate-800 dark:text-slate-100 sm:px-6">
                    <h2 className={'border-b border-gray-200 pb-2 font-semibold leading-6 text-gray-900 dark:border-slate-600 dark:text-slate-100'}>Account Balance</h2>
                    {pendingRequests?.length > 0
                        ? <div>
                            <div>Your current balance is</div>
                            <div>$<span data-testid={'account-balance-diff'}>{getReducedBalance()}</span> ($<span data-testid='account-balance'>{childAccount.balance.toFixed(2)}</span>)</div>
                        </div>
                        : <div>
                            <div>Your current balance is</div>
                            <div>$<span data-testid={'account-balance'}>{childAccount.balance.toFixed(2)}</span></div>
                        </div>}

                    <div className={'mt-4'}>Today your money made you</div>
                    <div>${dailyEarnings.toFixed(2)} </div>
                </div>
                <div className={'prose mb-2 flex max-w-none flex-col rounded-2xl bg-white px-4 py-5 text-slate-900 dark:prose-invert dark:bg-slate-800 dark:text-slate-100 sm:px-6'}>
                    <h2 className={'border-b border-gray-200 pb-2 font-semibold leading-6 text-gray-900 dark:border-slate-600 dark:text-slate-100'}>Pretend Zone</h2>
                    <p className={'text-sm'}>This area can be used to pretend you spent some of your money or put more money in.</p>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <section aria-labelledby="spend-scenario-heading" className="rounded-xl border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-400/30 dark:bg-amber-400/5">
                            <h3 id="spend-scenario-heading" className="mb-3 text-base font-semibold text-amber-800 dark:text-amber-200">Spend scenario</h3>
                            <div className="space-y-3">
                                <LabelledInput name="if-i-spend" label="If I spend" inputText={pretendSpent} onInputChanged={setPretendSpent}
                                               headerDisplay="$" placeholder="Enter amount here"/>
                                <ProjectionResult label="Then my account will have" value={(childAccount.balance - Number(pretendSpent)).toString()}
                                                  testId="spend-resulting-balance" tone="spend"/>
                                <ProjectionResult label="Every day my money would create"
                                                  value={calculateDailyEarnings(childAccount.balance - Number(pretendSpent), childAccount.interest / 100).toFixed(2)}
                                                  testId="spend-daily-growth" tone="spend"/>
                            </div>
                        </section>
                        <section aria-labelledby="save-scenario-heading" className="rounded-xl border border-sky-300 bg-sky-50/50 p-3 dark:border-sky-400/30 dark:bg-sky-400/5">
                            <h3 id="save-scenario-heading" className="mb-3 text-base font-semibold text-sky-800 dark:text-sky-200">Save scenario</h3>
                            <div className="space-y-3">
                                <LabelledInput name="if-i-save" label="If I save" inputText={pretendAdded} onInputChanged={setPretendAdded}
                                               headerDisplay="$" placeholder="Enter amount here"/>
                                <ProjectionResult label="Then my account will have" value={(childAccount.balance + Number(pretendAdded)).toString()}
                                                  testId="save-resulting-balance" tone="save"/>
                                <ProjectionResult label="Every day my money would create"
                                                  value={calculateDailyEarnings(childAccount.balance + Number(pretendAdded), childAccount.interest / 100).toFixed(2)}
                                                  testId="save-daily-growth" tone="save"/>
                            </div>
                        </section>
                    </div>
                </div>
                <div className={'prose flex max-w-none flex-col rounded-2xl bg-white px-4 py-5 text-slate-900 dark:prose-invert dark:bg-slate-800 dark:text-slate-100 sm:px-6'}>
                    <h2 className={'border-b border-gray-200 pb-2 font-semibold leading-6 text-gray-900 dark:border-slate-600 dark:text-slate-100'}>Spend Money Request</h2>
                    <div className={'flex w-full flex-col'}>
                        <LabelledInput name='i-want-to-spend' className={"mx-1 w-auto"} label={"I want to spend"} inputText={requestAmount.toString()} onInputChanged={setRequestAmount}
                                       headerDisplay={"$"} placeholder={"Enter amount"}/>
                        <LabelledInput name='i-want-to-spend-this-money-because' className={"mx-1 mb-2"} label={"I want to spend this money because"} inputText={requestReason}
                                       onInputChanged={setRequestReason}
                                       placeholder={"I want a new toy"}/>
                        <Button buttonText={'Request'} onButtonPressed={onRequestSubmit} className={'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-sm'}/>
                        {error && <p className={'text-rose-600'}>{error}</p>}
                    </div>

                </div>
            </div>
            }
        </div>
    )
}
