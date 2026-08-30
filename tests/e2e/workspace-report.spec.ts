import { test, expect } from '@playwright/test';

/**
 * Cross-tool workspace reporting, exercised through the real UI.
 *
 * Uses the Network Workbench because its panels are fully local: no network
 * provider is involved, so the flow is deterministic offline.
 */

test('collects local capability runs and assembles a cross-tool report', async ({ page }) => {
  await page.goto('/workspaces/network-workbench?tool=cidr-calculator');

  const reportSection = page.getByRole('region', { name: /workspace report/i });
  await expect(reportSection).toBeVisible();
  await expect(reportSection.getByText(/no results collected yet/i)).toBeVisible();

  await page.getByLabel('CIDR Block*').fill('192.0.2.0/24');
  await page.getByRole('button', { name: 'Run CIDR Calculator' }).click();
  await expect(reportSection.getByText('CIDR Calculator')).toBeVisible();

  // Run a second, different panel so the report is genuinely cross-tool.
  await page.getByRole('tab', { name: 'Subnet Calculator' }).click();
  await page.getByLabel('IP Address*').fill('192.0.2.10');
  await page.getByLabel('Subnet Mask or Prefix*').fill('255.255.255.0');
  await page.getByRole('button', { name: 'Run Subnet Calculator' }).click();

  await expect(reportSection.getByText('CIDR Calculator')).toBeVisible();
  await expect(reportSection.getByText('Subnet Calculator')).toBeVisible();
  await expect(reportSection.getByText('2 of 2 included')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    reportSection.getByRole('button', { name: /export markdown/i }).click(),
  ]);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const markdown = Buffer.concat(chunks).toString('utf8');

  expect(markdown).toContain('# Network Workbench');
  expect(markdown).toContain('## Capability Results');
  expect(markdown).toContain('CIDR Calculator');
  expect(markdown).toContain('Subnet Calculator');
  expect(markdown).toContain('## Disclaimer');
});

test('a saved workspace report appears on the reports page', async ({ page }) => {
  await page.goto('/workspaces/network-workbench?tool=cidr-calculator');

  await page.getByLabel('CIDR Block*').fill('198.51.100.0/24');
  await page.getByRole('button', { name: 'Run CIDR Calculator' }).click();

  const reportSection = page.getByRole('region', { name: /workspace report/i });
  await reportSection.getByRole('button', { name: /save to reports/i }).click();
  await expect(reportSection.getByText(/saved to reports/i)).toBeVisible();

  await page.goto('/reports');
  await expect(
    page.getByRole('heading', { name: 'Network Workbench — 198.51.100.0/24' })
  ).toBeVisible();
});

test('excluding a run keeps it out of the generated report', async ({ page }) => {
  await page.goto('/workspaces/network-workbench?tool=cidr-calculator');

  await page.getByLabel('CIDR Block*').fill('10.0.0.0/8');
  await page.getByRole('button', { name: 'Run CIDR Calculator' }).click();

  const reportSection = page.getByRole('region', { name: /workspace report/i });
  await expect(reportSection.getByText('1 of 1 included')).toBeVisible();

  await reportSection.getByRole('checkbox', { name: /include cidr calculator/i }).uncheck();
  await expect(reportSection.getByText('0 of 1 included')).toBeVisible();
  await expect(reportSection.getByRole('button', { name: /export markdown/i })).toBeDisabled();
});

test('privacy-restricted workspaces state that reporting is disabled', async ({ page }) => {
  await page.goto('/workspaces/secret-scanner');

  const reportSection = page.getByRole('region', { name: /workspace report/i });
  await expect(reportSection.getByText(/reporting is disabled for this workspace/i)).toBeVisible();
  await expect(reportSection.getByRole('button', { name: /export markdown/i })).toHaveCount(0);
});

test('a restricted panel result never enters the report collection', async ({ page }) => {
  const password = 'ReportCollectionProbe-42!';
  await page.goto('/workspaces/password-security?tool=password-strength');

  await page.getByLabel('Password*').fill(password);
  await page.getByRole('button', { name: 'Run Password Strength Checker' }).click();
  await expect(page.getByText('zxcvbn-ts Score')).toBeVisible();

  // The panel produced a result, but reporting must stay disabled.
  const reportSection = page.getByRole('region', { name: /workspace report/i });
  await expect(reportSection.getByText(/reporting is disabled for this workspace/i)).toBeVisible();

  const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(stored).not.toContain(password);
});
