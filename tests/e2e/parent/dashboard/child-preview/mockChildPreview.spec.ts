import {expect, test} from "@playwright/test";
import {loginAsMockParent} from "@playwrightHelpers";

test.describe("guardian child-dashboard preview", () => {
    test.beforeEach(async ({page}) => {
        await loginAsMockParent(page);
        await page.getByTestId("child-preview-2").getByRole("button", {name: "Act as child"}).click();
    });

    test("lets a guardian explore the child experience and return", async ({page}) => {
        await expect(page.getByRole("region", {name: "Guardian acting as child"})).toContainText("You’re acting as Child 1");
        await expect(page.getByRole("heading", {name: "Your money is growing."})).toBeVisible();

        await page.getByLabel("If I spend").fill("25");
        await expect(page.getByTestId("spend-resulting-balance")).toHaveText("$225.00");

        await page.getByRole("button", {name: "Back to parent dashboard"}).click();
        await expect(page.getByText("Good morning, Parent One.")).toBeVisible();
    });

    test("submits a purchase request on the child's behalf", async ({page}) => {
        await page.getByLabel("I want to spend", {exact: true}).fill("10");
        await page.getByLabel("I want to spend this money because").fill("A drawing book");
        await page.getByRole("button", {name: "Ask my parent"}).click();

		await expect(page.getByText("1 request is waiting for your parent")).toBeVisible();
        await page.getByRole("button", {name: "Back to parent dashboard"}).click();
		await expect(page.getByRole("region", {name: "Family overview"}).getByText("1 request", {exact: true})).toBeVisible();
		await expect(page.getByRole("complementary")).toContainText("A drawing book");
    });
});
