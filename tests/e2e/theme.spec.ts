import {expect, test} from '@playwright/test';

test.describe('Color theme', () => {
    test.beforeEach(async ({page}) => {
        await page.emulateMedia({colorScheme: 'light'});
        await page.goto('/');
        await page.evaluate(() => localStorage.removeItem('color-theme'));
        await page.reload();
    });

    test('should toggle the color theme and remember the choice', async ({page}) => {
        const root = page.locator('html');

        const toggle = page.getByRole('button', {name: 'Toggle color theme'});
        await expect(toggle).toBeVisible();
        await expect(root).toHaveAttribute('data-theme-ready', 'true');
        await toggle.click();

        await expect(root).toHaveClass(/dark/);
        await expect.poll(() => page.evaluate(() => localStorage.getItem('color-theme'))).toBe('dark');

        await page.reload();

        await expect(root).toHaveClass(/dark/);
        await expect(toggle).toBeVisible();
    });
});
