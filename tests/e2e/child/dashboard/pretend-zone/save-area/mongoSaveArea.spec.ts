
import {Locator, expect, test} from '@playwright/test';
import {configMongoEnvironment, loginAsMongoChild} from "@playwrightHelpers";

test.describe('Mongo Save Area', ()=>{
    let accountBalance: number;
    let ifISaveInput: Locator;
    test.beforeEach(async ({page}) => {
        await configMongoEnvironment(page);
        await loginAsMongoChild(page);
        accountBalance = Number.parseFloat(await page.getByTestId('account-balance').textContent()??"0");
        ifISaveInput = await page.getByLabel('If I save');
    });
    test('should have nothing by default', async ({page}) => {

        await expect(ifISaveInput).toBeVisible();
        expect(await ifISaveInput.inputValue()).toBe('');

        await expect(page.getByTestId('save-resulting-balance')).toHaveText(`$${accountBalance}`);
    });

    test('should update when entering a value', async ({page}) => {
        await ifISaveInput.fill('15');
        await expect(page.getByTestId('save-resulting-balance')).toHaveText(`$${accountBalance + 15}`);
    });
});
