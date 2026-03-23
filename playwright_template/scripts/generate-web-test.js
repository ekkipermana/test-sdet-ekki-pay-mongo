import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const rootDir = process.cwd();
const pageSourcePath = path.resolve(rootDir, "../application_code/app/page.tsx");
const outputPath = path.resolve(rootDir, "tests/web/generated-web.spec.ts");

async function run() {
  console.log("Current working directory:", rootDir);
  console.log("Page source path:", pageSourcePath);
  console.log("Output path:", outputPath);

  if (!fs.existsSync(pageSourcePath)) {
    throw new Error(`UI source file not found at: ${pageSourcePath}`);
  }

  const pageSource = fs.readFileSync(pageSourcePath, "utf-8");

  const requiredFields = [
    'name="email"',
    'name="cardNumber"',
    'name="expiry"',
    'name="cvv"',
    'name="amount"',
  ];

  for (const field of requiredFields) {
    if (!pageSource.includes(field)) {
      throw new Error(`Expected field not found in page source: ${field}`);
    }
  }

  const stableTest = `import { test, expect } from "@playwright/test";

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
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, stableTest, "utf-8");

  console.log(`✅ Web test generated successfully at: ${outputPath}`);
}

run().catch((err) => {
  console.error("❌ Web generator failed:");
  console.error(err.message);
  process.exit(1);
});