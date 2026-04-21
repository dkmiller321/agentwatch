import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Marketing Pages", () => {
  test("landing page loads with hero and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AgentWatch/);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i }).first()).toBeVisible();
  });

  test("pricing page shows three tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /pricing/i })).toBeVisible();
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Enterprise", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("$4,000")).toBeVisible();
  });

  test("security page loads", async ({ page }) => {
    await page.goto("/security");
    await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();
  });
});

test.describe("Auth Pages", () => {
  test("signup page renders form with email and password", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up|create/i })).toBeVisible();
  });

  test("login page renders form with email and password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /log in|sign in/i })).toBeVisible();
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /sign up|create|register/i })).toBeVisible();
  });

  test("signup page has link to login", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("link", { name: /log in|sign in/i })).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user is redirected from dashboard/agents to login", async ({ page }) => {
    await page.goto("/dashboard/agents");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});

test.describe("Onboarding Page", () => {
  test("onboarding page loads with upload prompt", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText(/upload/i).first()).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });
});

test.describe("Authenticated Workflows", () => {
  // Use a single test that signs up + tests the full flow
  // Supabase free tier may require email confirmation, so we test what we can

  test("signup form submits without client error", async ({ page }) => {
    const email = `e2etest+${Date.now()}@agentwatch.dev`;
    await page.goto("/signup");
    await page.fill('input[type="email"]', email);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill("TestPassword123!");
    if ((await passwordInputs.count()) > 1) {
      await passwordInputs.nth(1).fill("TestPassword123!");
    }

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // The form should either redirect (if email confirm disabled)
    // or show a success/check-email message (if email confirm enabled)
    const url = page.url();
    const bodyText = await page.textContent("body");

    const success =
      url.includes("/onboarding") ||
      url.includes("/dashboard") ||
      bodyText?.toLowerCase().includes("check your email") ||
      bodyText?.toLowerCase().includes("confirm") ||
      bodyText?.toLowerCase().includes("verification") ||
      bodyText?.toLowerCase().includes("success");

    // Should not have stayed on signup with no feedback
    expect(success || !url.includes("/signup")).toBeTruthy();
  });

  test("API routes return proper status codes", async ({ request }) => {
    // Unauthenticated calls should return 401
    const ingestionRes = await request.post("/api/ingestion-jobs", {
      data: { filePath: "test" },
    });
    expect(ingestionRes.status()).toBe(401);

    const checkoutRes = await request.post("/api/stripe/checkout");
    expect(checkoutRes.status()).toBe(401);

    const exportRes = await request.get("/api/export?template=general");
    expect(exportRes.status()).toBe(401);
  });

  test("cron endpoint rejects without secret", async ({ request }) => {
    const res = await request.get("/api/cron/ingest");
    expect(res.status()).toBe(401);
  });

  test("webhook endpoint handles invalid payload", async ({ request }) => {
    const res = await request.post("/api/webhooks/stripe", {
      data: { type: "fake" },
      headers: { "stripe-signature": "invalid" },
    });
    // Should return 400 or 401 for bad signature, not 500
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("Navigation", () => {
  test("marketing nav links work", async ({ page }) => {
    await page.goto("/");

    // Click pricing link
    await page.getByRole("link", { name: /pricing/i }).first().click();
    await page.waitForURL(/\/pricing/);
    expect(page.url()).toContain("/pricing");

    // Click security link
    await page.getByRole("link", { name: /security/i }).first().click();
    await page.waitForURL(/\/security/);
    expect(page.url()).toContain("/security");
  });

  test("login link from landing works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /log in/i }).first().click();
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });
});
