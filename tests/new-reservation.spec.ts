import { expect, test } from "@playwright/test";

test.describe("New reservation Page", () => {
	test("should display the data step as the first step", async ({ page }) => {
		await page.goto("/newreservation");
		await expect(page.getByRole("tab", { name: "Data" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Data" })).toBeVisible();
	});

	test("should navigate using bottom buttons", async ({ page }) => {
		// await page.goto('/newreservation');
		await page.goto("/newreservation", { waitUntil: "networkidle" });

		// First step
		await expect(page.getByRole("heading", { name: "Data" })).toBeVisible();

		// Go to second step
		await page.getByRole("button", { name: "Go to next step" }).click();

		await expect(page.getByRole("heading", { name: "Servizio" })).toBeVisible();
	});

	test("should navigate the user to unhandled steps", async ({ page }) => {
		await page.goto("/newreservation", { waitUntil: "networkidle" });
		await page.getByRole("button", { name: "Go to next step" }).click();
		await page.getByRole("button", { name: "Submit" }).click();

		// Moves user to the first step because data is missing
		await expect(page.getByRole("heading", { name: "Data" })).toBeVisible();
		await expect(page.getByText("Devi inserire una data per")).toBeVisible();

		// Inserting data
		await page.getByRole("button", { name: "giovedì 16 gennaio" }).click();
		await page.getByRole("radio", { name: "12:00 Disponibile" }).click();

		// Go to last step
		await page.getByRole("button", { name: "Go to next step" }).click();
		await page.getByRole("button", { name: "Submit" }).click();

		// Step remains to personal info
		await expect(page.getByRole("heading", { name: "Servizio" })).toBeVisible();
	});
});
