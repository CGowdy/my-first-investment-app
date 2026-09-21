import IClient from "@models/client";
import type {AuthenticatedAccount, LoginData} from "@models/auth";
import {Option} from "@models/option";
import {ChildAccount, CreateChildAccountInput} from "@models/child-account";
import {Transaction} from "@models/transaction";
import type {DeleteResponse} from "@mongoDataApiHelper";

export default class MongoDbClient implements IClient {

    async auth(userData: LoginData, options?: Option | undefined): Promise<AuthenticatedAccount | null> {
        try {
            const response = await fetch(`/api/auth`, {
                method: "POST",
                body: JSON.stringify(userData),
            });
            if (!response.ok) return null;
            return await response.json() as AuthenticatedAccount;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    async getSession(): Promise<AuthenticatedAccount | null> {
        try {
            const response = await fetch(`/api/auth`);
            if (!response.ok) return null;
            return await response.json() as AuthenticatedAccount;
        } catch {
            return null;
        }
    }

    async logout(): Promise<void> {
        await fetch(`/api/auth`, {method: "DELETE"});
    }

    async addChildUser(childData: CreateChildAccountInput, options?: Option | undefined): Promise<ChildAccount | null> {
        try{
            return await this.post<ChildAccount>(`/api/childaccount`, childData);
        } catch(e){
            console.log(e);
            return null;
        }
    }

    async getChildAccounts(parentId: string, options?: Option | undefined): Promise<ChildAccount[]|null> {
        try{
            const url = `/api/parent/${parentId}/childaccount`;
            return await this.get<ChildAccount[]>(url);
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    async getChildAccount(childUserId: string): Promise<ChildAccount> {
        try{
            const response = await this.get<ChildAccount>(`/api/childaccount/${childUserId}`);
            return response as ChildAccount;
        } catch (e) {
            console.log(e);
            throw e;
        }
    }

    async deleteChildAccount(childId: string, options?: Option | undefined): Promise<void> {
        try{
            const response = await this.delete<DeleteResponse>(`/api/childaccount/${childId}`);
            if(response?.deletedCount === 0) console.log('no user deleted');
            return Promise.resolve();
        } catch (e) {
            console.log(e);
            return Promise.resolve();
        }
    }

    sendRequest(newRequest: Transaction, options?: Option | undefined): Promise<Transaction[]> {
            const response = this.post<Transaction[]>(`/api/childaccount/${newRequest.childId}/transactions`, newRequest);
            return response as Promise<Transaction[]>;
    }

    getPendingRequestsForChild(userId: string, options?: Option | undefined): Promise<Transaction[]> {
        const response = this.get<Transaction[]>(`/api/childaccount/${userId}/transactions`);
        return response as Promise<Transaction[]>;
    }

    getPendingRequestsForParent(parentUserId: string, options?: Option): Promise<Transaction[]> {
        const response = this.get<Transaction[]>(`/api/parent/${parentUserId}/transactions`);
        return response as Promise<Transaction[]>;
    }

    async approveRequest(transaction: Transaction, options?: Option | undefined): Promise<Transaction[]> {
        const response = await fetch(`/api/transactions/${transaction._id}/approve`, {
            method: "POST",
            body: JSON.stringify(transaction),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => null) as {error?: {message?: string}} | null;
            throw new Error(error?.error?.message ?? "Unable to approve request");
        }
        return await response.json() as Transaction[];
    }

    rejectRequest(transaction: Transaction, options?: Option | undefined): Promise<Transaction[]> {
        const response = this.post<Transaction[]>(`/api/transactions/${transaction._id}/deny`, transaction);
        return response as Promise<Transaction[]>;
    }

    async adjustBalance(childUserId: string, adjustment: number, options?: Option | undefined): Promise<ChildAccount> {
        const response = await fetch(`/api/childaccount/${childUserId}/adjustment`, {
            method: "POST",
            body: JSON.stringify({amount: adjustment}),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => null) as {error?: {message?: string}} | null;
            throw new Error(error?.error?.message ?? "Unable to adjust balance");
        }
        return await response.json() as ChildAccount;
    }

    private async get<T>(url: string, body?: any, headers?: any):Promise<T | null> {
        try {
            const response = await fetch(url, {
                method: 'GET',
                body: JSON.stringify(body),
                headers: headers
            });
            return await response.json();
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    private async post<T>(url: string, body?: any, headers?: any):Promise<T | null> {
        try{
            const response = await fetch(url,{
                method: 'POST',
                body: JSON.stringify(body),
                headers: headers
            });
            return await response.json();
        }catch (e){
            console.log(e);
            return null;
        }
    }

    private async put<T>(url:string, body?:any, headers?:any): Promise<T | null>{
        try{
            const response = await fetch(url,{
                method: 'PUT',
                body: JSON.stringify(body),
                headers: headers
            });
            return await response.json();
        }catch (e){
            console.log(e);
            return null;
        }
    }

    private async delete<T>(url:string, body?:any, headers?:any):Promise<T | null>{
        try{
            const response = await fetch(url,{
                method: 'DELETE',
                body: JSON.stringify(body),
                headers: headers
            });
            return await response.json();
        }catch (e){
            console.log(e);
            return null;
        }
    }


}
