import Button from "@components/button/Button";
import LabelledInput from "@components/LabeledInput";
import {ClientContext} from "@contexts/ClientContext";
import type IClient from "@models/client";
import type {ChildAccount} from "@models/child-account";
import {Dialog} from "@headlessui/react";
import {useContext, useState} from "react";

type EditChildAccountDialogProps = {
    child: ChildAccount;
    isOpen: boolean;
    onRequestClose: () => void;
    onChildUpdated: (child: ChildAccount) => void;
};

export function EditChildAccountDialog({child, isOpen, onRequestClose, onChildUpdated}: EditChildAccountDialogProps) {
    const client = useContext(ClientContext) as unknown as IClient;
    const [displayName, setDisplayName] = useState(child.displayName);
    const [username, setUsername] = useState(child.username);
    const [password, setPassword] = useState("");
    const [interest, setInterest] = useState(child.interest.toString());
    const [balance, setBalance] = useState(child.balance.toString());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const saveAccount = async () => {
        const parsedInterest = Number(interest);
        const desiredBalance = Number(balance);
        if (
            !displayName.trim()
            || !username.trim()
            || !Number.isFinite(parsedInterest)
            || parsedInterest < 0
            || parsedInterest > 100
            || !Number.isFinite(desiredBalance)
            || desiredBalance < 0
            || desiredBalance > 1_000_000_000
        ) {
            setError("Enter a name, username, interest from 0 to 100%, and a non-negative balance.");
            return;
        }

        setSaving(true);
        setError("");
        let updatedProfile: ChildAccount | null = null;
        try {
            updatedProfile = await client.updateChildAccount(child._id!, {
                displayName,
                username,
                ...(password ? {password} : {}),
                interest: parsedInterest,
            });
            onChildUpdated(updatedProfile);

            const balanceAdjustment = desiredBalance - updatedProfile.balance;
            if (balanceAdjustment !== 0) {
                const balancedAccount = await client.adjustBalance(child._id!, balanceAdjustment);
                onChildUpdated(balancedAccount);
            }
            onRequestClose();
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Unable to update child account";
            setError(updatedProfile
                ? `Account details were saved, but the balance could not be updated: ${message}`
                : message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={saving ? () => undefined : onRequestClose} as="div" className="relative z-50">
            <div className="fixed inset-0 bg-slate-950/55" aria-hidden="true"/>
            <div className="fixed inset-0 flex w-screen items-center justify-center overflow-y-auto p-4">
                <Dialog.Panel className="garden-card my-8 w-full max-w-lg overflow-hidden border-2 p-0 shadow-2xl">
                    <div className="border-b border-[var(--garden-border)] bg-[var(--garden-brand-soft)] px-6 py-5">
                        <p className="garden-kicker">Child account</p>
                        <Dialog.Title className="text-2xl font-bold">Edit {child.displayName}</Dialog.Title>
                        <Dialog.Description className="garden-muted mt-1">
                            Update login details, simulated growth, or the practice balance.
                        </Dialog.Description>
                    </div>

                    <div className="space-y-4 p-6">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <LabelledInput name="edit-display-name" label="Name" inputText={displayName} onInputChanged={setDisplayName}/>
                            <LabelledInput name="edit-username" label="Username" inputText={username} onInputChanged={setUsername}/>
                        </div>
                        <LabelledInput
                            name="edit-password"
                            label="New password (optional)"
                            type="password"
                            inputText={password}
                            onInputChanged={setPassword}
                            placeholder="Leave blank to keep the current password"
                        />
                        <p className="garden-muted -mt-2 text-xs">For safety, the current password can’t be viewed. Entering a new one replaces it.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <LabelledInput name="edit-interest" label="Interest amount" type="number" footerDisplay="%" inputText={interest} onInputChanged={setInterest}/>
                            <LabelledInput name="edit-balance" label="Balance" type="number" headerDisplay="$" inputText={balance} onInputChanged={setBalance}/>
                        </div>
                        <p className="garden-muted text-xs">Balance edits are recorded as a parent adjustment in the account history.</p>
                        {error && <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" disabled={saving} buttonText="Cancel" onButtonPressed={onRequestClose}/>
                            <Button disabled={saving} buttonText={saving ? "Saving…" : "Save changes"} onButtonPressed={saveAccount}/>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
