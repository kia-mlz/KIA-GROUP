import { test, expect } from '@playwright/test';

async function useLocale(page: import('@playwright/test').Page, locale: 'en' | 'fa') {
  await page.context().addCookies([
    {
      name: 'kia-academy-locale',
      value: locale,
      url: 'http://localhost:3000',
    },
  ]);
}

test.describe('Learner journey', () => {
  test.beforeEach(async ({ page }) => {
    await useLocale(page, 'en');
  });

  test('landing page shows phone and email sign-in CTAs', async ({ page }) => {
    await page.goto('/');
    // The hero carries the canonical brand tagline (Learn · Work · Create · …)
    // as a supporting heading — the brand wordmark is the h1 root.
    await expect(page.getByRole('heading', { level: 3 })).toContainText(/learn|work|create/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/kia./i);
    // Phone-first auth door — the single primary CTA on the minimal guest landing.
    const authCta = page.getByRole('link', { name: /Sign in \/ Sign up/i });
    await expect(authCta).toBeVisible();
    await expect(authCta).toHaveAttribute('href', '/education');
    // Secondary door: staff/learners with a password sign in through /login.
    const emailCta = page.getByRole('link', { name: /Sign in with email/i });
    await expect(emailCta).toBeVisible();
    await expect(emailCta).toHaveAttribute('href', '/login');
  });

  test('login page loads for staff', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in to kia./i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel(/Password/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  test('register redirects to the phone-first OTP flow', async ({ page }) => {
    // Public email registration was removed (AUTH-6 phone-only): /register is
    // a deliberate redirect so old bookmarks land on the OTP flow, not a 404.
    await page.goto('/register?next=%2Fassessment');
    await expect(page).toHaveURL(/\/education/);
    await expect(page.getByRole('heading', { name: /Sign up with phone/i })).toBeVisible();
    await expect(page.getByLabel(/Mobile number/i)).toBeVisible();
  });

  test('protected checkout redirects to education without session', async ({ page }) => {
    await page.goto('/checkout?product=ROADMAP_BUNDLE&roadmapId=rm-demo');
    await expect(page).toHaveURL(/\/education\?.*next=%2Fcheckout/);
  });

  test('assessment redirects unauthenticated users to education', async ({ page }) => {
    await page.goto('/assessment');
    await expect(page).toHaveURL(/\/education\?.*next=%2Fassessment/);
  });

  test('education phone step is reachable', async ({ page }) => {
    await page.goto('/education');
    await expect(page.getByRole('heading', { name: /Sign up with phone/i })).toBeVisible();
    await expect(page.getByLabel(/Mobile number/i)).toBeVisible();
  });
});

test.describe('Multilingual UI', () => {
  test('Persian enables RTL on landing', async ({ page }) => {
    await useLocale(page, 'fa');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('link', { name: /ورود \/ ثبت‌نام/i })).toBeVisible();
  });

  test('locale persists across reload for guests (cookie-driven)', async ({ page }) => {
    // Guests get the minimal landing without the site header — locale switching
    // is cookie-driven (`kia-academy-locale`), not via a header toggle.
    await useLocale(page, 'en');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('link', { name: /Sign in \/ Sign up/i })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('landing CTAs remain usable at compact widths', async ({ page }) => {
    await useLocale(page, 'en');
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Sign in \/ Sign up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign in with email/i })).toBeVisible();
  });
});
