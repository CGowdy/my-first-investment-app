import {expect, test} from "@playwright/test";
import {configMockEnvironment} from "../helperFunctions";

test("the public landing page leads into the interactive demo", async ({page}) => {
    await configMockEnvironment(page);
    await page.goto("/");

    await expect(page.getByRole("heading", {name: /Help money lessons take root/})).toBeVisible();
    await page.getByRole("link", {name: "Explore as a parent"}).click();
    await expect(page.getByRole("heading", {name: /Good morning, Jordan/})).toBeVisible();
});

test("the landing page can open the child demo directly", async ({page}) => {
    await configMockEnvironment(page);
    await page.goto("/");

    await page.getByRole("link", {name: "Explore as a child"}).click();
    await expect(page.getByText("Good morning, Maya", {exact: true})).toBeVisible();
});

test("the landing page role launchers switch an existing demo session", async ({page}) => {
    await configMockEnvironment(page);
    await page.goto("/");

    await page.getByRole("link", {name: "Explore as a parent"}).click();
    await expect(page.getByRole("heading", {name: /Good morning, Jordan/})).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", {name: "Explore as a child"}).click();
    await expect(page.getByText("Good morning, Maya", {exact: true})).toBeVisible();
});

test("the create-child dialog has a visible way to cancel", async ({page}) => {
    await configMockEnvironment(page);
    await page.goto("/dashboard");
    await page.getByRole("button", {name: /Try parent demo/}).click();
    await expect(page.getByRole("heading", {name: /Good morning, Jordan/})).toBeVisible();

    await page.getByRole("button", {name: "+ Add child"}).click();
    const cancelButton = page.getByRole("button", {name: "Cancel"});
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    await expect(page.getByRole("button", {name: "Create Account"})).toBeHidden();
});

test("a visitor can enter, refresh, and reset an isolated parent demo", async ({page}) => {
    await configMockEnvironment(page);
    await page.goto("/dashboard");
    await page.getByRole("button", {name: /Try parent demo/}).click();

    await expect(page.getByRole("heading", {name: /Good morning, Jordan/})).toBeVisible();
    await expect(page.getByText("2 requests", {exact: true})).toBeVisible();
    await expect(page.getByText(/A family pass for the science museum/)).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", {name: /Good morning, Jordan/})).toBeVisible();

    await page.getByRole("button", {name: "Reset demo"}).click();
    await expect(page.getByRole("button", {name: /Try parent demo/})).toBeVisible();
});

test("a visitor can open the child experience without credentials", async ({page}) => {
    await configMockEnvironment(page);
    await page.goto("/dashboard");
    await page.getByRole("button", {name: /Try child demo/}).click();

    await expect(page.getByText("Good morning, Maya", {exact: true})).toBeVisible();
    await expect(page.getByRole("heading", {name: "Watch a choice grow"})).toBeVisible();
    await expect(page.getByTestId("spend-report")).toContainText("Art supplies for a weekend project");
    await expect(page.getByTestId("learn-report")).toContainText("Simulated growth");
});
