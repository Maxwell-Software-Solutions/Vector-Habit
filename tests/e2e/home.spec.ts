import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Vercel Spine/);

    // Check heading
    await expect(page.locator('h1')).toContainText('Vercel Spine');
  });

  test('should display features', async ({ page }) => {
    await page.goto('/');

    // Check for section headings using more specific selectors
    await expect(page.getByRole('heading', { name: /🚀 Features/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /✅ Testing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /🛠️ Tools/i })).toBeVisible();
  });

  test('should meet basic performance requirements', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display footer with copyright text', async ({ page }) => {
    await page.goto('/');

    // Check footer is visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Check copyright text
    await expect(footer).toContainText('© 2023 Maxwell Software Solutions MB');
  });

  test('should have footer visible without scrolling on large viewports', async ({ page }) => {
    // Set viewport to 2560x1305 as mentioned in the issue
    await page.setViewportSize({ width: 2560, height: 1305 });
    await page.goto('/');

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Check if footer is in viewport without scrolling
    const footerBox = await footer.boundingBox();
    const viewportSize = page.viewportSize();
    
    expect(footerBox).not.toBeNull();
    expect(viewportSize).not.toBeNull();
    
    if (footerBox && viewportSize) {
      // Footer should be within viewport height
      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(viewportSize.height);
      
      // Footer should be at or near the bottom of the viewport
      expect(footerBox.y).toBeGreaterThan(0);
    }
  });

  test('should have footer at bottom of content when scrolling is needed', async ({ page }) => {
    // Use a smaller viewport where content might need scrolling
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Footer should still be visible (but may require scrolling)
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Scroll to footer
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeInViewport();
  });
});
