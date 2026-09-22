import {expect, test} from "@playwright/test";
import {loginAsMockParent} from "@playwrightHelpers";

test("a parent can edit a child's profile and practice balance", async ({page}) => {
    await loginAsMockParent(page);
    const child = page.getByTestId("child-preview-123");

    await child.getByRole("button", {name: "Edit account"}).click();
    const dialog = page.getByRole("dialog", {name: "Edit Child 2"});
    await expect(dialog.getByLabel("Name", {exact: true})).toHaveValue("Child 2");
    await expect(dialog.getByLabel("Username")).toHaveValue("child2");
    await expect(dialog.getByLabel("New password (optional)")).toHaveValue("");
    await expect(dialog.getByLabel("Interest amount")).toHaveValue("12");
    await expect(dialog.getByLabel("Balance")).toHaveValue("1150");

    await dialog.getByLabel("Name", {exact: true}).fill("Garden Kid");
    await dialog.getByLabel("Username").fill("garden-kid");
    await dialog.getByLabel("Interest amount").fill("8");
    await dialog.getByLabel("Balance").fill("1175");
    await dialog.getByRole("button", {name: "Save changes"}).click();

    await expect(dialog).toBeHidden();
    await expect(child.getByRole("heading", {name: "Garden Kid"})).toBeVisible();
    await expect(child.getByText("8% simulated growth")).toBeVisible();
    await expect(child.getByTestId("child-balance-123")).toHaveText("1175");

    await child.getByRole("button", {name: "Edit account"}).click();
    await expect(page.getByRole("dialog").getByLabel("Username")).toHaveValue("garden-kid");
});

test("cancel leaves a child's account unchanged", async ({page}) => {
    await loginAsMockParent(page);
    const child = page.getByTestId("child-preview-123");

    await child.getByRole("button", {name: "Edit account"}).click();
    const dialog = page.getByRole("dialog", {name: "Edit Child 2"});
    await dialog.getByLabel("Name", {exact: true}).fill("Changed Name");
    await dialog.getByLabel("Balance").fill("2000");
    await dialog.getByRole("button", {name: "Cancel"}).click();

    await expect(dialog).toBeHidden();
    await expect(child.getByRole("heading", {name: "Child 2"})).toBeVisible();
    await expect(child.getByTestId("child-balance-123")).toHaveText("1150");
});
