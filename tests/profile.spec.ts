import { expect, test } from "@playwright/test";

test("profile page", async ({ page }) => {
	await page.goto("/profile");
	await expect(page.getByRole("heading", { name: "Profilo" })).toBeVisible();
});
