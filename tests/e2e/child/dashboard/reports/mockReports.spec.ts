import {expect, test} from "@playwright/test";
import {createMockChildRequest, loginAsMockChild, loginAsMockParent} from "@playwrightHelpers";

test("the long-term Pretend Zone responds instantly without changing the account", async ({page}) => {
    await loginAsMockChild(page);
    const accountBalance = page.getByTestId("account-balance");
    await expect(accountBalance).toHaveText("250.00");
    await expect(page.getByRole("heading", {name: "Watch a choice grow"})).toBeVisible();

    const scenarioLine = page.getByTestId("pretend-growth-line");
    const initialPath = await scenarioLine.getAttribute("d");
    await page.getByLabel("Pretend balance change").fill("100");

    await expect(page.getByText("$350.00", {exact: true})).toBeVisible();
    await expect(scenarioLine).not.toHaveAttribute("d", initialPath ?? "");
    await expect(accountBalance).toHaveText("250.00");

    const oneYearBalance = Number((await page.getByTestId("projection-final-balance").textContent())?.replace("$", ""));
    await page.getByRole("button", {name: "5 years"}).click();
    const fiveYearBalance = Number((await page.getByTestId("projection-final-balance").textContent())?.replace("$", ""));
    expect(fiveYearBalance).toBeGreaterThan(oneYearBalance);
    await expect(accountBalance).toHaveText("250.00");
});

test("an approved purchase appears in the spending report", async ({page}) => {
    await createMockChildRequest(page);
    await page.getByRole("link", {name: "Logout"}).click();
    await loginAsMockParent(page);
    const child = page.getByTestId("child-preview-2");
    await child.getByText("1 request", {exact: true}).click();
    await child.getByRole("button", {name: "Approve"}).click();
    await child.getByRole("button", {name: "Act as child"}).click();

    const spendingReport = page.getByTestId("spend-report");
    await expect(spendingReport.getByRole("heading", {name: "Spending report"})).toBeVisible();
    await expect(spendingReport).toContainText("$10.00");
    await expect(spendingReport).toContainText("I want to test");
    await expect(page.getByTestId("learn-report")).toContainText("Interest growth report");
});
