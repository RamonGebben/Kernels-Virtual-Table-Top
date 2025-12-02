import { expect, test } from '@playwright/test';

test.describe('DM view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dm');
    await expect(page.getByLabel('Viewport canvas')).toBeVisible();
  });

  test('opens and closes drawer via rail buttons', async ({ page }) => {
    const drawer = page.locator('aside[aria-hidden]');
    const drawerTitle = page.locator('[class*=drawer-title]');

    await page.getByRole('button', { name: 'Maps' }).click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
    await expect(drawerTitle).toHaveText(/Maps/i);

    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  });

  test('switches between panels when toolbar buttons are pressed', async ({
    page,
  }) => {
    const drawerTitle = page.locator('[class*=drawer-title]');

    await page.getByRole('button', { name: 'Maps' }).click();
    await expect(drawerTitle).toHaveText('Maps');

    await page.getByRole('button', { name: 'Artwork' }).click();
    await expect(drawerTitle).toHaveText('Artwork');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(drawerTitle).toHaveText('Settings');
  });
});
