import {expect, test} from '@playwright/test';
import {configMockEnvironment, configMongoEnvironment, loginAsMockParent, loginAsMongoChild, loginAsMongoParent} from "@playwrightHelpers";

test.describe('Mock Login', ()=>{  
    test.beforeEach(async ({page}) => {
        await configMockEnvironment(page);
        await loginAsMockParent(page);
    });
    test('should display header', async ({page}) => {
        await expect(page.getByText('Good morning, Parent One.')).toBeVisible();
    });
    test('should have create child account button', async ({page}) => {
        await expect(page.getByRole('button', {name: '+ Add child'})).toBeVisible();
    });
    test('should have logout button', async ({page}) => {
        await expect(page.getByText('Logout')).toBeVisible();
    });
    test('should show any child accounts after successful login', async ({page}) => {
        await expect(page.getByText('Child 1')).toBeVisible();
    });
});
