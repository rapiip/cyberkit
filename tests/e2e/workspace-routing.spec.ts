import { test, expect } from '@playwright/test';

/**
 * Workspace routing contract.
 *
 * The `?tool=` parameter is read on the client so the page stays statically
 * prerenderable. That is what allows an unknown workspace segment to return a
 * real 404: while the page read `searchParams` on the server it rendered
 * dynamically, and `notFound()` during a dynamic render served the not-found
 * body with an HTTP 200 status.
 */

test('an unknown workspace returns 404, not a 200 carrying the not-found page', async ({ page }) => {
  const response = await page.goto('/workspaces/definitely-not-a-workspace');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
});

test('the tool query parameter selects the requested panel', async ({ page }) => {
  await page.goto('/workspaces/data-transformation?tool=hex-converter');

  // The requested panel must be the active tab and the one rendered.
  await expect(page.getByRole('tab', { name: 'Hex Encoder/Decoder' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByRole('heading', { name: 'Hex Encoder/Decoder', level: 2 })).toBeVisible();
});

test('without a tool parameter the workspace opens its primary panel', async ({ page }) => {
  await page.goto('/workspaces/data-transformation');
  await expect(page.getByRole('tab', { name: 'Base64 Encoder/Decoder' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

test('an unknown tool parameter falls back to the primary panel', async ({ page }) => {
  await page.goto('/workspaces/data-transformation?tool=not-a-real-tool');
  await expect(page.getByRole('tab', { name: 'Base64 Encoder/Decoder' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

test('a legacy tool URL redirects and opens the matching panel', async ({ page }) => {
  await page.goto('/tools/hex-converter');
  await expect(page).toHaveURL(/\/workspaces\/data-transformation\?tool=hex-converter$/);
  await expect(page.getByRole('tab', { name: 'Hex Encoder/Decoder' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
});

test('selecting a panel updates the URL so it can be shared', async ({ page }) => {
  await page.goto('/workspaces/data-transformation');
  await page.getByRole('tab', { name: 'Unicode Converter' }).click();
  await expect(page).toHaveURL(/\?tool=unicode-converter$/);
});
