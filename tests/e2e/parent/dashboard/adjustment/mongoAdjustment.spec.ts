import {expect, test} from "@playwright/test";
import {loginAsMongoParent} from "@playwrightHelpers";

const adjustmentChildId = "65ada4aaf492160c4272914b";

test("a parent can atomically add to their child's Mongo-backed balance", async ({page}) => {
    await loginAsMongoParent(page);
    const child = page.getByTestId(`child-preview-${adjustmentChildId}`);
    await expect(child.getByTestId(`child-balance-${adjustmentChildId}`)).toHaveText("60");

    await child.getByRole("button", {name: "Adjust balance"}).click();
    await child.getByRole("button", {name: "+", exact: true}).click();
    const persistedAdjustment = page.waitForResponse(response =>
        response.url().includes(`/api/childaccount/${adjustmentChildId}/adjustment`)
        && response.request().method() === "POST"
        && response.ok()
    );
    await child.getByRole("button", {name: "Submit"}).click();
    await persistedAdjustment;

    await expect(child.getByTestId(`child-balance-${adjustmentChildId}`)).toHaveText("61");
});
