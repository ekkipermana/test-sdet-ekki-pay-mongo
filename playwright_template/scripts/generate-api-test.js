import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const rootDir = process.cwd();
const swaggerPath = path.resolve(rootDir, "../application_code/docs/swagger.json");
const outputPath = path.resolve(rootDir, "tests/api/generated.spec.ts");

function extractCodeBlock(text) {
  if (!text) return "";
  const match = text.match(/```(?:ts|typescript)?\n([\s\S]*?)```/i);
  return match ? match[1].trim() : text.trim();
}

async function run() {
  console.log("Current working directory:", rootDir);
  console.log("Swagger path:", swaggerPath);
  console.log("Output path:", outputPath);
  console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);

  if (!fs.existsSync(swaggerPath)) {
    throw new Error(`Swagger file not found at: ${swaggerPath}`);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in .env");
  }

  const swagger = fs.readFileSync(swaggerPath, "utf-8");

  const prompt = `
You are a QA automation engineer.

Given this OpenAPI spec:
${swagger}

Generate a simple Playwright API test in TypeScript that:
- tests one valid endpoint from the spec
- checks status code
- uses Playwright test format
- imports only from '@playwright/test'
- outputs only valid TypeScript code
- does not include explanations

Return only code.
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const rawText = await res.text();

  if (!res.ok) {
    throw new Error(`Gemini request failed: ${res.status} ${res.statusText}\n${rawText}`);
  }

  const data = JSON.parse(rawText);
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const cleanOutput = extractCodeBlock(output);

  if (!cleanOutput) {
    throw new Error(`No output from Gemini.\nResponse:\n${JSON.stringify(data, null, 2)}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, cleanOutput, "utf-8");

  console.log(`✅ Test generated successfully at: ${outputPath}`);
}

run().catch((err) => {
  console.error("❌ Generator failed:");
  console.error(err.message);
  process.exit(1);
});