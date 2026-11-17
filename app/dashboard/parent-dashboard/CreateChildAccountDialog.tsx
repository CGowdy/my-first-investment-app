import React, {useContext, useState} from "react";
import {Dialog} from "@headlessui/react";
import Button from "@components/button/Button";
import LabelledInput from "@components/LabeledInput";
import {ChildAccount, CreateChildAccountInput} from "@models/child-account";
import {ClientContext} from "@contexts/ClientContext";

interface CreateChildAccountDialogProps {
    isOpen: boolean;
    onRequestClose: () => void;
    onCreateChildAccount: (child: ChildAccount) => void;
}

export const CreateChildAccountDialog: React.FC<CreateChildAccountDialogProps> = ({isOpen, onRequestClose, onCreateChildAccount}) => {
    const [error, setError] = useState("");
    const [childAccountForm, setChildAccountForm] = useState<CreateChildAccountInput>({
        displayName: "",
        username: "",
        password: "",
        balance:0,
        interest:0
    });
    const client = useContext(ClientContext)!;

    const handleChange = (field:string, value:string|number) => {
        setChildAccountForm(prevState => ({...prevState, [field]: value}));
    }
    const handleOnCreate = async () => {
        setError("");
        const child: CreateChildAccountInput = {
            displayName: childAccountForm.displayName,
            username: childAccountForm.username,
            password: childAccountForm.password,
            balance: childAccountForm.balance,
            interest: childAccountForm.interest,
        };
        try {
            const newChildAccount = await client.addChildUser(child);
            if (!newChildAccount) throw new Error("Unable to create child account");
            onCreateChildAccount(newChildAccount);
            setChildAccountForm({
                displayName: "",
                username: "",
                password: "",
                balance:0,
                interest:0
            });
        } catch (error) {
            setError(error instanceof Error ? error.message : "Unable to create child account");
        }
    };

    return (
        <Dialog open={isOpen} onClose={onRequestClose} as={'div'} className="relative z-50">
            <div className={'fixed inset-0 bg-slate-950/50'}>
                <div className={'fixed inset-0 flex w-screen items-center justify-center p-4'}>
                    <Dialog.Panel className="mx-auto w-full max-w-sm rounded-lg bg-white p-4 text-slate-900 shadow-xl dark:bg-slate-800 dark:text-slate-100">
                        <Dialog.Title>Create Child Account</Dialog.Title>
                        <div>
                            <div className="isolate -space-y-px rounded-md shadow-xs">
                                <LabelledInput
                                    name={"display-name"}
                                    label={"Display Name"}
                                    inputText={childAccountForm.displayName}
                                    onInputChanged={(value) =>handleChange('displayName',value)}
                                    placeholder={"John Doe"}
                                    className={'rounded-b-none'}/>
                                <LabelledInput
                                    name={'username'}
                                    label={"Username"}
                                    inputText={childAccountForm.username}
                                    onInputChanged={(value)=>handleChange('username',value)}
                                    placeholder={"johndoe"}
                                    className={'rounded-none'}/>
                                <LabelledInput
                                    name={'password'}
                                    label={"Password"}
                                    inputText={childAccountForm.password}
                                    onInputChanged={(value)=>handleChange('password',value)}
                                    placeholder={"********"}
                                    className={'rounded-none'}/>
                                <LabelledInput
                                    name={'starting-balance'}
                                    label={"Starting Balance"}
                                    type={'number'}
                                    inputText={childAccountForm.balance.toString()}
                                    onBlur={(inputValue)=>{handleChange('balance', parseFloat(inputValue))}}
                                    onInputChanged={(value:string)=>handleChange('balance',value)}
                                    placeholder={"100"}
                                    className={'rounded-none'}/>
                                <LabelledInput
                                    name={'interest'}
                                    label={"Interest"}
                                    inputText={childAccountForm.interest.toString()}
                                    onInputChanged={(value) => handleChange('interest', parseInt(value))}
                                    placeholder={"5"}
                                    className={'rounded-t-none'}
                                    footerDisplay={"%"}/>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <Button variant="secondary" buttonText={'Cancel'} onButtonPressed={onRequestClose}/>
                                <Button buttonText={'Create Account'} onButtonPressed={handleOnCreate}/>
                            </div>
                            {error && <p role="alert" className="text-red-400">{error}</p>}
                        </div>
                    </Dialog.Panel>
                </div>
            </div>
        </Dialog>
    );
};
