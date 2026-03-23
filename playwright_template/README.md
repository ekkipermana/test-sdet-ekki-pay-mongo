# SDET Technical Assessment

## Overview

This submission implements an AI-assisted quality gate for both API and E2E testing using Playwright.

The solution includes:
- API test generation grounded on the application Swagger/OpenAPI spec
- E2E test generation grounded on the actual React/Next.js page source
- execution of generated tests through Playwright
- CI integration through GitHub Actions
- a single command to generate and run the quality gate locally and in CI

The design goal is reliability over raw generation freedom:
- the LLM is treated as a test generator
- the application source remains the source of truth
- generated output is constrained and validated to reduce hallucinated selectors and brittle assertions

---

## Project Structure

```text
Paymongo/
├── .github/
│   └── workflows/
│       └── qa-generated.yml
├── application_code/
│   ├── app/
│   │   └── page.tsx
│   ├── docs/
│   │   ├── swagger.json
│   │   └── swagger.yaml
│   ├── main.go
│   ├── go.mod
│   └── go.sum
└── playwright_template/
    ├── config/
    │   └── environment.ts
    ├── scripts/
    │   ├── generate-api-test.js
    │   └── generate-web-test.js
    ├── tests/
    │   ├── api/
    │   │   ├── generated.spec.ts
    │   │   └── example-api.spec.ts.bak
    │   └── web/
    │       ├── generated-web.spec.ts
    │       └── example-web.spec.ts.bak
    ├── .env.example
    ├── package.json
    ├── playwright.config.ts
    └── README.md
```

---

## Assessment Interpretation

The assessment asks for:
- API tests generated from Swagger using an LLM
- frontend E2E tests generated using an LLM
- CI integration so that generated tests act as a quality gate
- no hardcoded secrets
- clear documentation and rationale

During implementation, I found that the written sample flow and sample template tests did not fully match the actual application behavior. Because of that, I grounded generation on the real implementation artifacts instead of relying on the template assumptions.

That means:
- API generation is grounded on the actual Swagger spec
- E2E generation is grounded on the actual React page source
- the final quality gate validates the real app, not the sample expectations

---

## Approach

### 1. API test generation
The API generator reads the real Swagger spec from:

```text
../application_code/docs/swagger.json
```

It sends that spec to the LLM and writes the generated Playwright API test to:

```text
tests/api/generated.spec.ts
```

### 2. E2E test generation
The web generator reads the real UI source from:

```text
../application_code/app/page.tsx
```

It then uses the LLM to generate a Playwright E2E test, but with strict constraints:
- only selectors that exist in the actual implementation are allowed
- unsupported fields such as shipping name/address are forbidden
- brittle patterns such as `getByLabel()` are rejected
- the generated output is validated before being written to disk

The generated web test is written to:

```text
tests/web/generated-web.spec.ts
```

### 3. Execution
Generated tests are executed via Playwright:
- API tests run in the `api-tests` project
- E2E tests run in the `chromium` project

---

## Why this design

I initially explored more free-form LLM generation for both API and E2E tests.

That worked well for API generation because Swagger is structured input.

For E2E generation, raw LLM output produced unstable selectors and brittle assertions, such as:
- `getByLabel()` on labels that were not accessibility-bound
- validation-message assertions that were not stable in the DOM
- assumptions copied from sample tests instead of the real implementation

To make E2E generation reliable while still keeping it LLM-based, I constrained the LLM output and added post-generation validation.

This preserves the intent of the assessment while making the quality gate stable enough for CI.

---

## Key Design Decisions

### LLM as generator, not source of truth
The LLM is used to generate tests, but test validity is always grounded on:
- Swagger for API
- actual React page source for E2E

### Source-grounded selectors
For E2E tests, selectors are based on real DOM attributes in the implementation, such as:
- `input[name="email"]`
- `input[name="cardNumber"]`
- `input[name="expiry"]`
- `input[name="cvv"]`
- `input[name="amount"]`
- `button[type="submit"]`

### Post-generation validation
The E2E generator validates that generated output:
- imports from `@playwright/test`
- navigates to `/`
- uses only required supported selectors
- does not use banned patterns such as `getByLabel()` or `getByPlaceholder()`
- contains an allowed success assertion

If validation fails, the generator exits with an error instead of writing an invalid test.

### Isolation of template example tests
The provided template example tests were intentionally isolated because they were not aligned with the actual application behavior.

Renamed files:
- `tests/api/example-api.spec.ts.bak`
- `tests/web/example-web.spec.ts.bak`

---

## Mismatches Found During Implementation

A few mismatches were identified between the brief or sample expectations and the actual application.

### API template mismatch
The provided example API tests did not align with the actual implementation and failed against the live local app.

### Web template mismatch
The sample web test expected a title like `Home` or `Welcome`, while the actual page title is:

```text
Payment Checkout App
```

### Assessment flow mismatch
The written brief mentions fields such as shipping name and shipping address, but the actual frontend implementation exposes:
- email
- card number
- expiry
- cvv
- amount

To avoid hallucinated or invalid tests, I treated the actual page source as the source of truth for E2E generation.

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm
- Go 1.21+
- Gemini API key

### 1. Start the backend
From `application_code`:

```bash
go run main.go
```

### 2. Start the frontend
From `application_code`:

```bash
npm install
npm run dev
```

### 3. Verify the app is running
- Frontend: `http://localhost:3000`
- Health check: `http://localhost:8080/api/health`
- Swagger: `http://localhost:8080/swagger.json`

### 4. Install Playwright dependencies
From `playwright_template`:

```bash
npm install
npx playwright install
```

---

## Environment Variables

Create `.env` inside `playwright_template`:

```env
TEST_ENV=staging
STAGING_BASE_URL=http://localhost:3000
STAGING_API_URL=http://localhost:8080
HEADLESS=true
SLOW_MO=0
TIMEOUT=30000
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

---

## Available Commands

From `playwright_template`:

### Generate API test
```bash
npm run generate:api
```

### Generate E2E test
```bash
npm run generate:web
```

### Run generated API test only
```bash
npm run test:api:generated
```

### Run generated E2E test only
```bash
npm run test:web:generated
```

### Run both generated tests
```bash
npm run test:generated
```

### Full end-to-end quality gate
```bash
npm run qa:generated
```

---

## Final Verified Flow

The final stable local flow is:

```bash
cd playwright_template
npm run qa:generated
```

This command:
1. generates API tests
2. generates E2E tests
3. runs generated API tests
4. runs generated E2E tests

For local execution, the backend and frontend must already be running before the tests are executed.

---

## Example Generated Test Coverage

### API
The generated API test validates:
- `/api/health`
- HTTP 200 response
- healthy status payload

### E2E
The generated E2E test validates:
- homepage load
- checkout form visibility
- entering valid values into all real form fields
- submitting the payment form
- confirming a successful completion outcome

---

## CI Integration

The repository includes a GitHub Actions workflow at:

```text
.github/workflows/qa-generated.yml
```

It:
1. installs application and Playwright dependencies
2. starts backend and frontend
3. waits for local services to become ready
4. runs `npm run qa:generated`
5. uploads Playwright reports and logs as artifacts

This makes the generated tests act as a PR quality gate.

---

## Guardrails Against Hallucination

### API guardrails
- Swagger file path must exist before generation
- API generation is grounded on the actual application spec

### E2E guardrails
- UI source file path must exist before generation
- required input fields are validated against `page.tsx`
- selectors are constrained to DOM attributes that actually exist
- banned patterns such as `getByLabel()` and unsupported fields are rejected
- brittle template or sample tests are excluded from the gate

---

## Tradeoffs

### What worked well
- Swagger-based API generation is straightforward and reliable
- source-grounded E2E generation becomes stable when selectors are constrained
- CI integration is practical and reproducible

### What required adjustment
- raw free-form E2E generation produced unstable selectors and assertions
- template tests could not be trusted as-is and had to be isolated
- the written flow in the brief did not fully match the real implementation

### Why this is acceptable
For a practical SDET quality gate, reliability and reproducibility are more important than unconstrained generative freedom. The solution therefore preserves LLM generation while constraining and validating the output against the actual implementation.

---

## Future Improvements

Given more time, I would extend this with:
- schema-aware API generation for more endpoints
- stronger post-generation validation of generated code
- TypeScript AST validation before test execution
- automatic DOM-aware selector validation
- richer negative-path E2E scenarios
- improved prompt templates stored as separate prompt files

---

## Summary

This submission demonstrates an AI-assisted test generation workflow that is:
- grounded on real application artifacts
- executable locally
- stable enough to act as a quality gate
- practical for CI integration

The key engineering principle behind the solution is:

> Use the LLM to generate tests, but use the application source as the source of truth.
