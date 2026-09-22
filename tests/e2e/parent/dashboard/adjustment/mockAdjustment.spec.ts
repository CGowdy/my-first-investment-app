import {expect, test} from "@playwright/test";
import {loginAsMockParent} from "@playwrightHelpers";

test("a parent can add to their child's simulated balance", async ({page}) => {
    await loginAsMockParent(page);
    const child = page.getByTestId("child-preview-123");
    await expect(child.getByTestId("child-balance-123")).toHaveText("1150");

    await child.getByRole("button", {name: "Adjust balance"}).click();
    await child.getByRole("button", {name: "+", exact: true}).click();
    await child.getByRole("button", {name: "Submit"}).click();

    await expect(child.getByTestId("child-balance-123")).toHaveText("1151");
});

test("a parent sees why an invalid withdrawal was rejected", async ({page}) => {
    await loginAsMockParent(page);
    const child = page.getByTestId("child-preview-123");
    await child.getByRole("button", {name: "Adjust balance"}).click();
    await child.getByRole("textbox").fill("-2000");
    await child.getByRole("button", {name: "Submit"}).click();

    await expect(child.getByRole("alert")).toHaveText("Adjustment cannot make the balance negative");
    await expect(child.getByTestId("child-balance-123")).toHaveText("1150");
});

test("a parent can cancel adding to a child's simulated balance", async ({page}) => {
    await loginAsMockParent(page);
    const child = page.getByTestId("child-preview-123");

    await child.getByRole("button", {name: "Adjust balance"}).click();
    await child.getByRole("textbox").fill("25");
    await child.getByRole("button", {name: "Cancel"}).click();

    await expect(child.getByRole("textbox")).toBeHidden();
    await expect(child.getByTestId("child-balance-123")).toHaveText("1150");
    await child.getByRole("button", {name: "Adjust balance"}).click();
    await expect(child.getByRole("textbox")).toHaveValue("0");
});

test("a parent can cancel removing from a child's simulated balance", async ({page}) => {
    await loginAsMockParent(page);
    const child = page.getByTestId("child-preview-123");

    await child.getByRole("button", {name: "Adjust balance"}).click();
    await child.getByRole("textbox").fill("-40");
    await child.getByRole("button", {name: "Cancel"}).click();

    await expect(child.getByRole("textbox")).toBeHidden();
    await expect(child.getByTestId("child-balance-123")).toHaveText("1150");
    await child.getByRole("button", {name: "Adjust balance"}).click();
    await expect(child.getByRole("textbox")).toHaveValue("0");
});
