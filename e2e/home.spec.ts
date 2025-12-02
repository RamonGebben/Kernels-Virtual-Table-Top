import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
  test('routes users to DM and Table views', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Kernel Virtual Tabletop' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join as DM' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Join as Table' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Join as DM' }).click();
    await expect(page).toHaveURL(/\/dm$/);

    await page.goBack();
    await page.getByRole('link', { name: 'Join as Table' }).click();
    await expect(page).toHaveURL(/\/table$/);
  });
});
