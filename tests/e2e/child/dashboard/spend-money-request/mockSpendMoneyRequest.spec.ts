import {expect, test} from '@playwright/test'
import {configMockEnvironment, loginAsMockChild} from '@playwrightHelpers';


test.describe('Mock Spend Money Request', ()=>{
    test.beforeEach(async ({page}) => {
        await configMockEnvironment(page);
        await loginAsMockChild(page);
    });

    test('should have purchase request area', async ({page}) => {
        await expect(page.getByRole('heading', {name: 'Make a purchase request'})).toBeVisible();
        await expect(page.getByLabel('I want to spend', {exact: true})).toBeVisible();
    });

    test('should give the reason field more planning space on desktop', async ({page}) => {
        const amountField = page.getByLabel('I want to spend', {exact: true});
        const reasonField = page.getByLabel('I want to spend this money because');
        const amountBox = await amountField.boundingBox();
        const reasonBox = await reasonField.boundingBox();

        expect(amountBox).not.toBeNull();
        expect(reasonBox).not.toBeNull();
        expect(reasonBox!.width).toBeGreaterThan(amountBox!.width * 1.5);
    });

    test('should update the account balance when a money request is made', async ({page}) => {
        const accountBalance = Number.parseFloat(await page.getByTestId('account-balance').textContent()??"0");
        await page.getByPlaceholder('Enter amount', { exact: true }).fill('10');
        await page.getByLabel('I want to spend this money because').fill('I want to test');
        await page.getByRole('button',{name:'Ask my parent'}).click();
        await expect(page.getByText(`($${accountBalance.toFixed(2)})`)).toBeVisible();
        await expect(page.getByText(`$${(accountBalance-10).toFixed(2)}`)).toBeVisible();
    });

});
