import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
	await page.goto("/login");
	await page.getByRole("textbox", { name: "Email" }).click();
	await page.getByRole("textbox", { name: "Email" }).fill("lungarellaraffaele@gmail.com");
	await page.getByRole("textbox", { name: "Email" }).press("Tab");
	await page.getByRole("textbox", { name: "Passwords" }).fill("lungarellaraffaele");
	await page.getByRole("textbox", { name: "Passwords" }).press("Enter");

	// Wait until the page receives the cookies.
	//
	// Sometimes login flow sets cookies in the process of several redirects.
	// Wait for the final URL to ensure that the cookies are actually set.
	await page.waitForURL("/");

	await expect(page.locator("#bits-1")).toBeVisible();
	// End of authentication steps.

	await page.context().storageState({ path: authFile });
});
