import {expect, test} from "@playwright/test";
import {configMockEnvironment} from "@playwrightHelpers";

test("a new guardian can create an account", async ({page}) => {
    await configMockEnvironment(page);
    await page.goto("/dashboard");

    await page.getByRole("button", {name: "Create an account"}).click();
    await page.getByLabel("Display name").fill("New Guardian");
    await page.getByLabel("Username").fill("new-guardian");
    await page.getByLabel("Password", {exact: true}).fill("x");
    await page.getByLabel("Confirm password").fill("x");
    await page.getByRole("button", {name: "Create account", exact: true}).click();

    await expect(page.getByText("Welcome to the parent dashboard")).toBeVisible();
    await expect(page.getByRole("link", {name: "Logout"})).toBeVisible();
});
