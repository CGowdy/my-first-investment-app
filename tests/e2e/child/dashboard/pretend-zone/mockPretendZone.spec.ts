import {Locator, expect, test} from '@playwright/test';
import {configMockEnvironment, configMongoEnvironment, loginAsMockChild, loginAsMockParent, loginAsMongoChild, loginAsMongoParent} from "@playwrightHelpers";

test.describe('Mock Pretend Zone',()=>{
    let accountBalance: number;
    test.beforeEach(async ({page}) => {
        await configMockEnvironment(page);
        await loginAsMockChild(page);
        accountBalance = Number.parseFloat(await page.getByTestId('account-balance').textContent()??"0");
    });
    test('should have header', async ({page}) => {
        await expect(page.getByText('Pretend Zone')).toBeVisible();
    });

    test('should distinguish editable amounts from calculated results', async ({page}) => {
        const spendScenario = page.getByRole('region', {name: 'Spend scenario'});
        const saveScenario = page.getByRole('region', {name: 'Save scenario'});

        await expect(spendScenario.getByRole('textbox')).toHaveCount(1);
        await expect(spendScenario.locator('output')).toHaveCount(2);
        await expect(saveScenario.getByRole('textbox')).toHaveCount(1);
        await expect(saveScenario.locator('output')).toHaveCount(2);
    });
});
