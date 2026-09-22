import {expect, test} from '@playwright/test';
import {configMockEnvironment, configMongoEnvironment, loginAsMockParent, loginAsMongoChild, loginAsMongoParent} from "@playwrightHelpers";

test.describe('Mongo Dashboard', ()=>{  
    test.beforeEach(async ({page}) => {
        await configMongoEnvironment(page);
        await loginAsMongoParent(page);
    });
    test('should display header', async ({page}) => {
        await expect(page.getByText('Good morning, First Mongo Parent.')).toBeVisible();
    });
    test('should have create child account button', async ({page}) => {
        await expect(page.getByRole('button', {name: '+ Add child'})).toBeVisible();
    });
    test('should have logout button', async ({page}) => {
        await expect(page.getByText('Logout')).toBeVisible();
    });
    test('should show any child accounts after successful login', async ({page}) => {
        await expect(page.getByText('First Mongo Child')).toBeVisible();
    });
    test('should lazily settle elapsed simulated growth', async ({page}) => {
        await expect(page.getByText('Growth Child')).toBeVisible();
        await expect(page.getByTestId('child-balance-65ada4aaf492160c4272914c')).toHaveText('1004.12');
    });
});
