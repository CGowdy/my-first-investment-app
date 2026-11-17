'use client'
import React, {createContext, ReactNode, useContext, useEffect, useRef, useState} from "react";
import {ClientContext} from "./ClientContext";
import type {AuthenticatedAccount, GuardianRegistrationData, LoginData} from "@models/auth";

type RegistrationResult = {ok: true} | {ok: false; error: string};

export const useAuth = () => useContext(AuthContext);
export const AuthContext = createContext<{
    login: (userData: LoginData) => Promise<boolean>;
    register: (registration: GuardianRegistrationData) => Promise<RegistrationResult>;
    logout: () => Promise<void>;
    resetDemo: () => Promise<void>;
    user: AuthenticatedAccount | null;
} | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = React.memo(({children}) => {
    const [user, setUser] = useState<AuthenticatedAccount | null>(null);
    const clientContext = useContext(ClientContext)!;
    const authOperation = useRef(0);

    useEffect(()=>{
        if(!clientContext) return;
        let active = true;
        const operation = ++authOperation.current;
        void clientContext.getSession().then(sessionUser => {
            if (active && authOperation.current === operation) setUser(sessionUser);
        });
        return () => {
            active = false;
        };
    },[clientContext]);

    const login = async (userData: LoginData) => {
        const operation = ++authOperation.current;
        const user = await clientContext.auth(userData);
        if (authOperation.current !== operation) return false;
        if(!user || !user._id) return false;
        setUser(user);
        return true;
    };

    const logout = async () => {
        const operation = ++authOperation.current;
        await clientContext.logout();
        if (authOperation.current === operation) setUser(null);
    };

    const resetDemo = async () => {
        const operation = ++authOperation.current;
        if (!clientContext.resetDemo) return;
        await clientContext.resetDemo();
        if (authOperation.current === operation) setUser(null);
    };

    const register = async (registration: GuardianRegistrationData): Promise<RegistrationResult> => {
        const operation = ++authOperation.current;
        try {
            const registeredUser = await clientContext.registerGuardian(registration);
            if (authOperation.current !== operation) return {ok: false, error: "Account creation was interrupted"};
            setUser(registeredUser);
            return {ok: true};
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : "Unable to create account",
            };
        }
    };
    return (
        <AuthContext.Provider value={{login, register, logout, resetDemo, user}}>
            {children}
        </AuthContext.Provider>
    );
});
AuthProvider.displayName = "AuthProvider";
