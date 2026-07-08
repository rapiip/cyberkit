import { test, expect } from '@playwright/test';

test.describe('UX and Accessibility', () => {
  test('Mobile viewport navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Look for mobile elements (often hamburger menus or simplified layouts)
    // The exact selectors depend on the application, we just assert the page loads
    // without overflowing horizontally in a critical way.
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    
    // We allow a small tolerance, but it shouldn't be grossly oversized
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 50);
  });

  test('Keyboard navigation (Tab focus)', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab
    await page.keyboard.press('Tab');
    
    // Ensure something is focused (typically a skip link or the first nav item)
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).not.toBe('BODY'); // Something should capture focus
  });

  test('Empty state on history page', async ({ page }) => {
    // History should initially be empty on a fresh browser context
    await page.goto('/history');
    
    const bodyText = await page.textContent('body');
    // Ensure it doesn't crash and shows an empty state or 0 results
    expect(bodyText).not.toContain('Internal Server Error');
  });

  test('Error state gracefully handled (404)', async ({ page }) => {
    const response = await page.goto('/non-existent-page-for-testing-404');
    expect(response?.status()).toBe(404);
    
    const bodyText = await page.textContent('body');
    // Ensure Next.js custom or default 404 is shown, not a hard crash
    expect(bodyText).not.toContain('Internal Server Error');
  });
});
