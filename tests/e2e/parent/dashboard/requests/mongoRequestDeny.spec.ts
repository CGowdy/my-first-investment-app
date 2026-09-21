import {expect, test} from '@playwright/test';
import {createMongoChildRequest, loginAsMongoParent, openMongoChildRequests} from "@playwrightHelpers";

test.describe('Mongo Request Denial', () => {
    let currentTransactionId = '';
    test.beforeEach(async ({page}) => {
        currentTransactionId = await createMongoChildRequest(page);
        await page.getByRole('link', {name: 'Logout'}).click();
        await loginAsMongoParent(page);
        await openMongoChildRequests(page);
    });

    test('should deny request', async ({page, request}) => {
        const requestComponent = page.getByText(`Request $10Reason: ${currentTransactionId}`);
        await expect(requestComponent).toBeVisible();
        await requestComponent.getByRole('button', {name: 'Deny'}).click();
        await expect(requestComponent).toBeHidden();

    });

});
