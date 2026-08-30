import { test, expect } from '@playwright/test';

/**
 * Regression cover for icon/text collisions in inputs.
 *
 * The component classes in globals.css used to be unlayered, so
 * `.input-cyber { padding: 10px 14px }` beat Tailwind's `pl-12` and the leading
 * icon rendered on top of the placeholder. These tests assert the real computed
 * geometry: the text box must start after the icon ends.
 */

interface Box {
  x: number;
  width: number;
}

/** Fails if the icon overlaps the input's text area. */
async function expectNoOverlap(
  label: string,
  iconBox: Box | null,
  inputBox: Box | null,
  paddingLeft: string
) {
  expect(iconBox, `${label}: icon not found`).not.toBeNull();
  expect(inputBox, `${label}: input not found`).not.toBeNull();

  const iconRight = iconBox!.x + iconBox!.width;
  const textStart = inputBox!.x + Number.parseFloat(paddingLeft);

  expect(
    textStart,
    `${label}: text starts at ${textStart} but the icon ends at ${iconRight} (padding-left ${paddingLeft})`
  ).toBeGreaterThanOrEqual(iconRight);
}

test('dashboard search text clears the search icon', async ({ page }) => {
  await page.goto('/dashboard');

  const input = page.getByLabel('Jump to a workflow, workspace, or tool');
  await expect(input).toBeVisible();

  const paddingLeft = await input.evaluate((element) => getComputedStyle(element).paddingLeft);
  // pl-12 must win over the .input-cyber padding shorthand.
  expect(paddingLeft).toBe('48px');

  const icon = input.locator('xpath=preceding-sibling::*[name()="svg"][1]');
  await expectNoOverlap('dashboard search', await icon.boundingBox(), await input.boundingBox(), paddingLeft);
});

test('audit target text clears the globe icon', async ({ page }) => {
  await page.goto('/audit');

  const input = page.getByLabel('Target website URL to audit');
  await expect(input).toBeVisible();

  const paddingLeft = await input.evaluate((element) => getComputedStyle(element).paddingLeft);
  expect(paddingLeft).toBe('48px');

  const icon = input.locator('xpath=preceding-sibling::*[name()="svg"][1]');
  await expectNoOverlap('audit target', await icon.boundingBox(), await input.boundingBox(), paddingLeft);
});

test('reports filter text clears the search icon', async ({ page }) => {
  // The filter row only renders once a report exists, so seed one first.
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    window.localStorage.setItem(
      'cyberkit-reports:v1',
      JSON.stringify([
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Layout probe report',
          target: 'example.com',
          content: '# Layout probe report',
          format: 'markdown',
          toolsUsed: ['cidr-calculator'],
          createdAt: now,
          updatedAt: now,
        },
      ])
    );
  });
  await page.goto('/reports');

  const input = page.getByLabel('Filter reports by target or title');
  await expect(input).toBeVisible();

  const paddingLeft = await input.evaluate((element) => getComputedStyle(element).paddingLeft);
  // pl-9
  expect(paddingLeft).toBe('36px');

  const icon = input.locator('xpath=preceding-sibling::*[name()="svg"][1]');
  await expectNoOverlap('reports filter', await icon.boundingBox(), await input.boundingBox(), paddingLeft);
});

test('cloud sync passphrase text clears the reveal toggle', async ({ page }) => {
  await page.goto('/settings');

  const input = page.locator('#cloud-sync-passphrase');
  await expect(input).toBeVisible();

  const paddingRight = await input.evaluate((element) => getComputedStyle(element).paddingRight);
  // pr-11 keeps the value clear of the eye button.
  expect(paddingRight).toBe('44px');

  const toggle = page.getByRole('button', { name: /passphrase/i });
  const toggleBox = await toggle.boundingBox();
  const inputBox = await input.boundingBox();
  expect(toggleBox).not.toBeNull();
  expect(inputBox).not.toBeNull();

  const textEnd = inputBox!.x + inputBox!.width - Number.parseFloat(paddingRight);
  expect(textEnd, 'passphrase text must end before the reveal toggle starts').toBeLessThanOrEqual(toggleBox!.x);
});

test('utilities override component class font sizes and padding', async ({ page }) => {
  await page.goto('/workspaces/data-transformation');

  // A compact select declares `input-cyber py-1 text-xs`; both must apply.
  const compact = page.getByLabel('Panel A capability');
  await expect(compact).toBeVisible();
  const compactStyle = await compact.evaluate((element) => {
    const style = getComputedStyle(element);
    return { fontSize: style.fontSize, paddingTop: style.paddingTop };
  });
  expect(compactStyle.fontSize).toBe('12px');
  expect(compactStyle.paddingTop).toBe('4px');

  // Buttons must honour their padding utilities too.
  await page.goto('/audit');
  const auditButton = page.getByRole('button', { name: /start security audit/i });
  const buttonStyle = await auditButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return { paddingLeft: style.paddingLeft, paddingTop: style.paddingTop };
  });
  // px-6 py-3
  expect(buttonStyle.paddingLeft).toBe('24px');
  expect(buttonStyle.paddingTop).toBe('12px');
});
