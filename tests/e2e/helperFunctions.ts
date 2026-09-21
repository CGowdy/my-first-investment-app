import {APIRequestContext, expect, Page, Route} from '@playwright/test';
import {ClientType} from '../../app/enums/clientType';
import dotenv from "dotenv";
import {guid} from "../../app/helper-functions";

dotenv.config();
export const mongoChildId = '65ada4aaf492160c42729149';
export const baseUrl = async () : Promise<string> => {
    return process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
}
export const performLogin = async (page: Page, username:string, password:string) => {
    const currentUrl = page.url();
    const expectedOrigin = new URL(await baseUrl()).origin;
    if (currentUrl === 'about:blank' || new URL(currentUrl).origin !== expectedOrigin) {
        await page.goto('/');
    }
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByLabel('Username').click();
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').click();
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('link', {name: 'Logout'})).toBeVisible();
};
export const loginAsMockParent = async (page: Page) => {
    await performLogin(page, 'parent1', 'pass123');
}

export const loginAsMockChild = async (page: Page, username?:string) => {
    await configMockEnvironment(page);
    await performLogin(page, username??'child1', 'pass123')
}

export const loginAsMongoParent = async (page: Page) => {
    await configMongoEnvironment(page);
    await performLogin(page, 'firstmongouser', 'pass123');
}

export const loginAsMongoChild = async (page: Page, username?:string) => {
    await configMongoEnvironment(page);
    await performLogin(page, username??'firstmongochild', 'pass123');
}

export const createMockChildRequest = async (page: Page) => {
    await loginAsMockChild(page);
    await page.getByLabel('I want to spend', {exact:true}).fill('10');
    await page.getByLabel('I want to spend this money because').fill('I want to test');
    await page.getByRole('button',{name:'Request'}).click();
    await expect(page.getByLabel('I want to spend', {exact: true})).toHaveValue('');
}

export const createMongoChildRequest = async (page:Page) => {
    const transactionId = guid();
    await loginAsMongoChild(page);
    await page.getByLabel('I want to spend', {exact:true}).fill('10');
    await page.getByLabel('I want to spend this money because').fill(transactionId);
    const persistedRequest = page.waitForResponse(response =>
        response.url().includes('/transactions') &&
        response.request().method() === 'POST' &&
        response.ok()
    );
    await page.getByRole('button',{name:'Request'}).click();
    await persistedRequest;
    await expect(page.getByLabel('I want to spend', {exact: true})).toHaveValue('');
    return transactionId;
}

export const openMongoChildRequests = async (page: Page) => {
    await page
        .getByTestId(`child-preview-${mongoChildId}`)
        .getByRole('button', {name: /pending requests?/})
        .click();
}


export const configMockEnvironment = async (page: Page) => {
    
    await page.route('**/api/client', async (route: Route) => route.fulfill({
        status: 200,
        body: ClientType.Mock
    }));
};

export const configMongoEnvironment = async (page: Page) => {
    await page.route('**/api/client', async (route: Route) => route.fulfill({
        status: 200,
        body: ClientType.Mongo
    }));
};

export const deleteMongoTransaction = async (request: APIRequestContext, transactionId:string) => {
    await request.delete(`${await baseUrl()}/api/transactions/${transactionId}`);
}
