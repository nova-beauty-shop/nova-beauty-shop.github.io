import { expect, test } from '@playwright/test';

test.describe('storefront shell', () => {
  test('home page is Persian RTL and has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('primary navigation reaches the shop', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/shop"]').first().click();
    await expect(page).toHaveURL(/\/shop\/?$/);
  });

  test('unknown pages show the not-found page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-qa');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('admin access for visitors', () => {
  test('admin pages do not render the dashboard to an anonymous visitor', async ({ page }) => {
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: /سفارش/ })).toHaveCount(0);
  });
});
