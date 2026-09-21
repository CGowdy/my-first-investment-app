import {expect, test} from '@playwright/test';
import {createMongoChildRequest, loginAsMongoParent, openMongoChildRequests} from '@playwrightHelpers';

test.describe('Mongo Pending Requests', ()=>{
    let currentTransactionId = '';
    test.beforeEach(async ({page}) => {
        currentTransactionId = await createMongoChildRequest(page);
        await page.getByRole('link', {name: 'Logout'}).click();
        await loginAsMongoParent(page);
        await openMongoChildRequests(page);
    });
    test('should render', async ({page, request}) => {
        const requestComponent = page.getByText(`Request $10Reason: ${currentTransactionId}`);
        await expect(requestComponent).toBeVisible();
        await expect(requestComponent.getByText('Request $10').first()).toBeVisible();
        await expect(requestComponent.getByText(currentTransactionId).first()).toBeVisible();
        await expect(requestComponent.getByRole('button', {name: 'Approve'})).toBeVisible();
        await expect(requestComponent.getByRole('button', {name: 'Deny'})).toBeVisible();
    });
});
