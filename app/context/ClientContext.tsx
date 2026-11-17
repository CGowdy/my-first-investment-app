'use client'
import React, {createContext, useState, useEffect, ReactNode} from 'react';
import {ClientType} from "../enums/clientType";
import IClient from "@models/client";
import {GetClient} from "../clients/clientFactory";

// Create the context
export const ClientContext = createContext<IClient|null>(null);
export const ClientModeContext = createContext<ClientType|null>(null);
interface ClientProviderProps {
    children: ReactNode;
}
// Create the provider
export const ClientProvider: React.FC<ClientProviderProps> = React.memo(({ children }) => {
  const [client, setClient] = useState<IClient | null>(null);
  const [clientMode, setClientMode] = useState<ClientType | null>(null);
  useEffect(() => {
    // Create the client based on the environment
    fetch('api/client')
        .then(response => response.text())
        .then(data => {
            const mode = data as ClientType;
            const newClient = GetClient(mode);
            setClientMode(mode);
            setClient(newClient);
        })
        .catch(error => {
            console.log(error);
        });
  }, []);


  return (
    <ClientModeContext.Provider value={clientMode}>
      <ClientContext.Provider value={client}>
        {children}
      </ClientContext.Provider>
    </ClientModeContext.Provider>
  );
});
ClientProvider.displayName = "ClientProvider";
