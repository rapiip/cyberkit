import { test, expect } from '@playwright/test';

test.describe('Priority Workflows E2E', () => {
  const workflows = [
    { name: 'Home', path: '/', heading: 'CyberKit' },
    { name: 'Workspaces', path: '/workspaces', heading: 'Workspaces' },
    { name: 'Website Audit', path: '/workspaces/website-security-audit', heading: 'Website Security Audit' },
    { name: 'Domain / IP', path: '/workspaces/domain-ip-intelligence', heading: 'Domain / IP' },
    { name: 'File Triage', path: '/workspaces/file-triage-ioc', heading: 'File Triage' },
    { name: 'Secret Scanner', path: '/workspaces/secret-scanner', heading: 'Secret Scanner' },
    { name: 'CVE / KEV', path: '/workspaces/cve-kev-intelligence', heading: 'CVE / KEV' },
    { name: 'Labs', path: '/labs', heading: 'Security Labs' }
  ];

  for (const wf of workflows) {
    test(`Workflow: ${wf.name} loads correctly`, async ({ page }) => {
      // Navigate to the workflow
      await page.goto(wf.path);
      
      // Verify no generic server errors or empty states without reason
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Application error: a client-side exception has occurred');
      expect(bodyText).not.toContain('500 Internal Server Error');
      
      // Look for the main heading or identifier (approximate match since actual UI varies)
      // Playwright uses regex or loose text match. We check if the heading exists anywhere on page
      await expect(page.locator(`text=${wf.heading}`).first()).toBeVisible({ timeout: 5000 });
    });
  }

  test('Utility Workbenches are available under Workspaces', async ({ page }) => {
    await page.goto('/workspaces');
    await expect(page.locator('text=Network').first()).toBeVisible();
    await expect(page.locator('text=Hash').first()).toBeVisible();
  });
});
