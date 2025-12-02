import { expect, test } from '@playwright/test';

test.describe('Table view', () => {
  test('renders canvas and hides artwork overlay by default', async ({
    page,
  }) => {
    await page.goto('/table');

    await expect(page.getByLabel('Viewport canvas')).toBeVisible();
    await expect(
      page.locator('[class*=artwork-overlay]', { hasText: 'Artwork' }),
    ).toHaveCount(0);
  });
});
