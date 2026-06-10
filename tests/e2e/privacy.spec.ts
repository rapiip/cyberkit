import { expect, test } from '@playwright/test';

test('password analysis stays out of localStorage and reports zxcvbn feedback', async ({ page }) => {
  await page.goto('/workspaces/password-security');
  await expect(page.getByText('Password inputs and generated values remain in browser memory')).toBeVisible();
  const password = 'PrivacyTest-Password-42!';
  await page.getByLabel('Password*').fill(password);
  await page.getByRole('button', { name: 'Run Password Strength Checker' }).click();
  await expect(page.getByText('zxcvbn-ts Score')).toBeVisible();
  await expect(page.getByText('Breach Status', { exact: true })).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  expect(storage).not.toContain(password);
  await expect(page.getByRole('button', { name: 'Export structured JSON result' })).toHaveCount(0);
});

test('Pwned Password sends only a five-character prefix and matches suffix in browser', async ({ page }) => {
  let requestBody: Record<string, unknown> | undefined;
  await page.route('**/api/pwned-password', async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        provider: 'HIBP test',
        hashPrefix: '5BAA6',
        range: [{ suffix: '1E4C9B93F3F0682250B6CF8331B7EE68FD8', count: 42 }],
      }),
    });
  });

  await page.goto('/workspaces/password-security?tool=pwned-password');
  await page.getByLabel('Password*').fill('password');
  await page.getByRole('button', { name: 'Run Pwned Password Checker' }).click();
  await expect(page.getByText('Found 42 time(s)', { exact: false })).toBeVisible();
  expect(requestBody).toEqual({ hashPrefix: '5BAA6' });
  expect(JSON.stringify(requestBody)).not.toContain('password');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('password');
});

test('JWT Inspector redacts sensitive claims and never persists the token', async ({ page }) => {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    sub: 'private-subject',
    jti: 'private-identifier',
    iat: 1_800_000_000,
  })}.`;

  await page.goto('/workspaces/jwt-inspector');
  await expect(page.getByText('Decoding alone never establishes authenticity')).toBeVisible();
  await page.getByLabel('JWT Token*').fill(token);
  await page.getByRole('button', { name: 'Run JWT Inspector' }).click();
  await expect(page.getByText('Decoded; signature not verified', { exact: false })).toBeVisible();
  await expect(page.getByText('pr***ct')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(token);
});

test('Cloud Sync encrypts before network transport', async ({ page }) => {
  let requestBody: Record<string, unknown> | undefined;
  await page.route('**/api/sync', async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        syncedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        version: 1,
      }),
    });
  });

  const passphrase = 'browser-only passphrase 123';
  await page.goto('/settings');
  await page.getByLabel('Sync ID').fill('browser-test-sync');
  await page.getByLabel('Encryption passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Push Backup' }).click();
  await expect(page.getByText('Encrypted backup synced at', { exact: false })).toBeVisible();

  expect(requestBody?.syncId).toBe('browser-test-sync');
  expect(requestBody).toHaveProperty('envelope');
  expect(JSON.stringify(requestBody)).not.toContain(passphrase);
  expect(JSON.stringify(requestBody)).not.toContain('"history":');
  const envelope = requestBody?.envelope as Record<string, unknown>;
  expect(Object.keys(envelope).sort()).toEqual(['ciphertext', 'iv', 'salt', 'timestamp', 'version']);
});

test('Secret Scanner keeps findings local and redacted during file scanning', async ({ page }) => {
  const secret = 'ghp_1234567890abcdefghijklmnopqrstuvwxyzABCD';
  await page.goto('/workspaces/secret-scanner');
  await expect(page.getByText('Secret scanning runs locally by default')).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'secrets.ts',
    mimeType: 'text/plain',
    buffer: Buffer.from(`export const token = "${secret}";`),
  });
  await page.getByRole('button', { name: 'Run GitHub Secret Pattern Checker' }).click();
  await expect(page.getByText('Masked Preview', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('ghp_***ABCD').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export structured JSON result' })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(secret);
});
