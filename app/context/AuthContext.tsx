'use client'
import React, {createContext, ReactNode, useContext, useEffect, useRef, useState} from "react";
import {ClientContext} from "./ClientContext";
import type {AuthenticatedAccount, LoginData} from "@models/auth";

export const useAuth = () => useContext(AuthContext);
export const AuthContext = createContext<{
    login: (userData: LoginData) => Promise<boolean>;
    logout: () => Promise<void>;
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
    return (
        <AuthContext.Provider value={{login, logout, user}}>
            {children}
        </AuthContext.Provider>
    );
});
AuthProvider.displayName = "AuthProvider";
