import {Locator, expect, test} from '@playwright/test';
import {configMockEnvironment, configMongoEnvironment, loginAsMockChild, loginAsMockParent, loginAsMongoChild, loginAsMongoParent} from "@playwrightHelpers";

test.describe('Mock Save Area', ()=>{
    let accountBalance: number;
    let ifISaveInput: Locator;
    test.beforeEach(async ({page}) => {
        await configMockEnvironment(page);
        await loginAsMockChild(page);
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
