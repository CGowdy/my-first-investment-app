import {expect, test} from '@playwright/test';
import {createMockChildRequest, loginAsMockParent} from '@playwrightHelpers';

test.describe('Mock Pending Requests', ()=>{
    test.beforeEach(async ({page}) => {
        await createMockChildRequest(page);
        await page.getByRole('link', {name: 'Logout'}).click();
        await loginAsMockParent(page);
        await page.getByTestId('child-preview-2').getByText('1 request', {exact: true}).click();
    });
    test('should render', async ({page}) => {
        await expect(page.getByRole('region', {name: 'Family overview'}).getByText('1 request', {exact: true})).toBeVisible();
        await expect(page.getByRole('complementary').getByRole('heading', {name: 'Purchase request'})).toBeVisible();
        const child = page.getByTestId('child-preview-2');
        await expect(child.getByText('Request $10')).toBeVisible();
        await expect(child.getByText('I want to test')).toBeVisible();
        await expect(child.getByRole('button', {name: 'Approve'})).toBeVisible();
        await expect(child.getByRole('button', {name: 'Deny'})).toBeVisible();
    });
});
