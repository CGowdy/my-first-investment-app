import {expect, test} from '@playwright/test'
import {baseUrl, loginAsMongoChild} from '@playwrightHelpers';
import {Transaction} from "@models/transaction";


test.describe('Mongo Spend Money Request', ()=>{
    let currentTransactionId = '';
    test.beforeEach(async ({page}) => {
        await loginAsMongoChild(page, 'spendmoneychild');
    });

    test.afterEach(async ({request}) => {
        if(currentTransactionId) {
            await request.delete(`${await baseUrl()}/api/transactions/${currentTransactionId}`);
        }
    });

    test('should have purchase request area', async ({page}) => {
        await expect(page.getByRole('heading', {name: 'Make a purchase request'})).toBeVisible();
    });

    test('should update the account balance when a money request is made', async ({page, request}) => {
        const accountBalance = Number.parseFloat(await page.getByTestId('account-balance').textContent() ?? "0");
        await page.getByPlaceholder('Enter amount', {exact: true}).fill('10');
        await page.getByLabel('I want to spend this money because').fill('I want to test');
        const persistedRequest = page.waitForResponse(response =>
            response.url().includes('/transactions') &&
            response.request().method() === 'POST' &&
            response.ok()
        );
        await page.getByRole('button', {name: 'Ask my parent'}).click();
        const responseData: Transaction[] = await (await persistedRequest).json();
        currentTransactionId = responseData[0]._id ?? '';
        await expect(page.getByText(`($${accountBalance.toFixed(2)})`)).toBeVisible();
        await expect(page.getByText(`$${(accountBalance - 10).toFixed(2)}`)).toBeVisible();
    });
});
