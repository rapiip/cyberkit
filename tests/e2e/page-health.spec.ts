import { test, expect } from '@playwright/test';

/**
 * Every route must load clean: no console errors, no hydration mismatch, no
 * failed requests, React actually hydrated, and no horizontal overflow.
 *
 * This catches whole classes of defect that unit tests cannot see. It already
 * found two: the dev server rejecting its own chunks with 403 when reached by IP
 * (so nothing hydrated), and a locale-dependent number format in the CSRF lab
 * that made React discard the tree on hydration.
 *
 * Hydration failures surface in both modes: verbose in `next dev`, as minified
 * React error #418/#423 under `next start`.
 */

const ROUTES = [
  '/',
  '/dashboard',
  '/workspaces',
  '/audit',
  '/labs',
  '/labs/xss',
  '/labs/sql-injection',
  '/labs/csrf',
  '/labs/auth-bypass',
  '/about',
  '/settings',
  '/history',
  '/reports',
  '/workspaces/website-security-audit',
  '/workspaces/domain-ip-intelligence',
  '/workspaces/network-workbench',
  '/workspaces/data-transformation',
  '/workspaces/jwt-inspector',
  '/workspaces/ctf-decoder-workbench',
  '/workspaces/hash-crypto-workbench',
  '/workspaces/password-security',
  '/workspaces/file-triage-ioc',
  '/workspaces/secret-scanner',
  '/workspaces/cve-kev-intelligence',
];

/** Console noise that is not an application defect. */
const IGNORED_MESSAGES = [/Download the React DevTools/i];

for (const route of ROUTES) {
  test(`${route} loads without console or hydration errors`, async ({ page }) => {
    const problems: string[] = [];

    page.on('console', (message) => {
      const text = message.text();
      if (IGNORED_MESSAGES.some((pattern) => pattern.test(text))) return;
      if (message.type() === 'error') problems.push(`console error: ${text}`);
      if (message.type() === 'warning' && /hydrat|did not match|mismatch/i.test(text)) {
        problems.push(`hydration warning: ${text}`);
      }
    });
    page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        problems.push(`HTTP ${response.status()} for ${new URL(response.url()).pathname}`);
      }
    });

    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.status(), `${route} must return a success status`).toBeLessThan(400);
    await page.waitForTimeout(1000);

    // Confirms React took over rather than merely that HTML arrived. When the dev
    // server blocked its own chunks the markup looked fine but nothing worked.
    const interactive = await page.evaluate(() => {
      const root = document.getElementById('main-content') ?? document.body;
      return root.childElementCount > 0 && document.querySelectorAll('[class]').length > 5;
    });
    expect(interactive, `${route} did not hydrate`).toBe(true);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${route} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);

    expect([...new Set(problems)], `${route} reported problems`).toEqual([]);
  });
}
