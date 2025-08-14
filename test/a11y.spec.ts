import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Helper to run axe and filter to serious/critical
async function runAxe(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a','wcag2aa'])     // sensible default
    .disableRules([
      // Example: disable color-contrast if your brand colors are verified elsewhere
      // 'color-contrast'
    ])
    .analyze();
  const violations = results.violations.filter(v =>
    ['serious','critical'].includes(v.impact || '')
  );
  return { results, violations };
}

test.describe('Accessibility (axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    // Playwright webServer (see playwright.config.js) serves the site; just use baseURL-relative path
    await page.goto('/index.html');
  });

  const states: Array<{ name:string; cmd: (page:any)=>Promise<void> }> = [
    { name: 'Biomed (dark)', async cmd(page){ /* default dark */ } },
    { name: 'Biomed (light)', async cmd(page){ await page.click('#themeToggle'); } },
    { name: 'Software (light)', async cmd(page){ await page.click('#themeToggle'); await page.click('#tab-software'); } },
    { name: 'Linguistics (light)', async cmd(page){ await page.click('#themeToggle'); await page.click('#tab-linguistics'); } },
  ];

  for (const s of states) {
    test(`axe: ${s.name}`, async ({ page }) => {
      await s.cmd(page);
      // Let dynamic swaps settle
      await page.waitForTimeout(100);
      const { violations } = await runAxe(page);
      if (violations.length) {
        console.log(JSON.stringify(violations, null, 2));
      }
      expect(violations, `${s.name} should have no serious/critical axe violations`).toHaveLength(0);
    });
  }
});
