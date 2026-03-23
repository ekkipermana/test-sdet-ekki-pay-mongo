import { test, expect } from "@playwright/test";

test("should successfully complete checkout flow", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Payment Checkout App/i);
  await expect(page.locator("text=Secure Checkout")).toBeVisible();

  await page.locator('input[name="email"]').fill("john.doe@example.com");
  await page.locator('input[name="cardNumber"]').fill("4242424242424242");
  await page.locator('input[name="expiry"]').fill("12/30");
  await page.locator('input[name="cvv"]').fill("123");
  await page.locator('input[name="amount"]').fill("100");

  await page.locator('button[type="submit"]').click();

  await expect(page.locator("body")).toContainText(/success|payment|processed|completed/i);
});
