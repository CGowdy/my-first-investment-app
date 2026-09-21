import {expect, test} from '@playwright/test';
import {createMongoChildRequest, loginAsMongoParent, openMongoChildRequests} from "@playwrightHelpers";

test.describe('Mongo Request Approval', () => {
    let currentTransactionId = '';
    test.beforeEach(async ({page}) => {
        currentTransactionId = await createMongoChildRequest(page);
        await page.getByRole('link', {name: 'Logout'}).click();
        await loginAsMongoParent(page);
        await openMongoChildRequests(page);
    });

    test('should approve request', async ({page, request}) => {
        const requestComponent = page.getByText(`Request $10Reason: ${currentTransactionId}`);
        await expect(requestComponent).toBeVisible();
        await expect(page.getByTestId('child-balance-65ada4aaf492160c42729149')).toHaveText('100');
        await requestComponent.getByRole('button', {name: 'Approve'}).click();
        await expect(requestComponent).toBeHidden();
        await expect(page.getByTestId('child-balance-65ada4aaf492160c42729149')).toHaveText('90');
    });

});
