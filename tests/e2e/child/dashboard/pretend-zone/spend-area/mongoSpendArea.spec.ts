import {Locator, expect, test} from '@playwright/test';
import {configMongoEnvironment, loginAsMongoChild} from "@playwrightHelpers";

test.describe('Mongo Spend Area', ()=>{
    let accountBalance: number;
    let ifISpendInput: Locator;
    test.beforeEach(async ({page}) => {
        await configMongoEnvironment(page);
        await loginAsMongoChild(page);
        accountBalance = Number.parseFloat(await page.getByTestId('account-balance').textContent()??"0");
        ifISpendInput = await page.getByLabel('If I spend');
    });
    test('should have nothing by default', async ({page}) => {

        await expect(ifISpendInput).toBeVisible();
        expect(await ifISpendInput.inputValue()).toBe('');

        await expect(page.getByTestId('spend-resulting-balance')).toHaveText(`$${accountBalance}`);
    });

    test('should update when entering a value', async ({page}) => {
        await ifISpendInput.fill('10');
        await expect(page.getByTestId('spend-resulting-balance')).toHaveText(`$${accountBalance - 10}`);
    });
});
