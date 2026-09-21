import {expect, test} from "@playwright/test";
import {configMongoEnvironment} from "@playwrightHelpers";

test("a new guardian can register against MongoDB", async ({page}) => {
    await configMongoEnvironment(page);
    await page.goto("/dashboard");

    await page.getByRole("button", {name: "Create an account"}).click();
    await page.getByLabel("Display name").fill("Playwright Guardian");
    await page.getByLabel("Username").fill("playwright-registered-guardian");
    await page.getByLabel("Password", {exact: true}).fill("playwright-password");
    await page.getByLabel("Confirm password").fill("playwright-password");
    await page.getByRole("button", {name: "Create account", exact: true}).click();

    await expect(page.getByText("Welcome to the parent dashboard")).toBeVisible();
    await expect(page.getByRole("link", {name: "Logout"})).toBeVisible();
});
