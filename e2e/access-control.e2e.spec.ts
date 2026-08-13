import { expect, test } from '@playwright/test';

for (const path of ['/access-control/client-applications', '/access-control/users', '/backup']) {
  test(`unauthenticated request to ${path} cannot render administration`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
    await expect(page.locator('body')).not.toContainText('Database Backup Administration');
  });
}
