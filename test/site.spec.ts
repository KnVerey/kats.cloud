// @ts-check
const { test, expect } = require('@playwright/test');

const sel = {
  shell: '#shell',
  bgA: '#bgA',
  bgB: '#bgB',
  timeline: '#timeline',
  tabBtn: (key) => `#timeline button[data-theme="${key}"]`,
  details: '#details',
  panel: '#detailsInner',
  gallery: '.media-grid',
  galleryImgs: '.media-grid img',
  videoWrap: '.video-wrap',
  videoThumb: '.video-thumb',
  videoIframe: '#software-video-iframe',
  bgDesc: '#bgDesc'
};

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

/** Utility: count visible grid images (those not display:none) */
async function visibleGridCount(page) {
  return page.$$eval(sel.galleryImgs, (els) =>
    els.filter(el => getComputedStyle(el).display !== 'none').length
  );
}

/** Utility: read which bg layer shows a given url */
async function bgHasURL(page, urlPart) {
  const a = await page.$eval(sel.bgA, el => getComputedStyle(el).backgroundImage);
  const b = await page.$eval(sel.bgB, el => getComputedStyle(el).backgroundImage);
  return (a.includes(urlPart) || b.includes(urlPart));
}

async function liveBgText(page){
  return page.$eval(sel.bgDesc, el => el.textContent || '');
}

test('tabs have proper ARIA + roving tabindex and update on click', async ({ page }) => {
  const biomed = page.locator(sel.tabBtn('biomed'));
  const software = page.locator(sel.tabBtn('software'));
  const linguistics = page.locator(sel.tabBtn('linguistics'));
  await expect(biomed).toHaveAttribute('aria-selected', 'true');
  await expect(biomed).toHaveAttribute('tabindex', '0');
  await expect(software).toHaveAttribute('aria-selected', 'false');
  await expect(software).toHaveAttribute('tabindex', '-1');

  // Click Software; ARIA + tabindex should swap
  await software.click();
  await expect(software).toHaveAttribute('aria-selected', 'true');
  await expect(software).toHaveAttribute('tabindex', '0');
  await expect(biomed).toHaveAttribute('aria-selected', 'false');
  await expect(biomed).toHaveAttribute('tabindex', '-1');

  // Panel should be labelled by the active tab
  await expect(page.locator(sel.panel)).toHaveAttribute('aria-labelledby', /tab-software/);
});

test('keyboard navigation: arrows + Home/End update selection and focus', async ({ page }) => {
  const timeline = page.locator(sel.timeline);
  await timeline.focus();

  // Nudge focus into the active button if the container swallowed focus
  await page.waitForTimeout(30);

  await page.keyboard.press('ArrowRight');
  await expect(page.locator(sel.tabBtn('software'))).toBeFocused();
  await expect(page.locator(sel.tabBtn('software'))).toHaveAttribute('aria-selected','true');

  await page.keyboard.press('End');
  await expect(page.locator(sel.tabBtn('linguistics'))).toBeFocused();
  await expect(page.locator(sel.tabBtn('linguistics'))).toHaveAttribute('aria-selected','true');

  await page.keyboard.press('Home');
  await expect(page.locator(sel.tabBtn('biomed'))).toBeFocused();
  await expect(page.locator(sel.tabBtn('biomed'))).toHaveAttribute('aria-selected','true');
});

test('theme toggle persists and sets correct biomed background (micro1[-light])', async ({ page, context }) => {
  // Toggle to light
  await page.click('#themeToggle');
  // Re-open page (new tab) to verify persistence
  const page2 = await context.newPage();
  await page2.goto('/index.html');

  // Ensure Biomed tab is active for a deterministic background check
  await page2.click(sel.tabBtn('biomed'));

  // Last selected tab should restore (biomed by default on first run)
  // Background for biomed (light) should include micro1-light.jpg
  await expect(await bgHasURL(page2, 'micro1-light.jpg')).toBeTruthy();

  // Toggle back to dark, bg should show micro1.jpg
  await page2.click('#themeToggle');
  await expect(await bgHasURL(page2, 'micro1.jpg')).toBeTruthy();
});

test('background live region announces caption on load and after theme toggle', async ({ page }) => {
  // Ensure biomed is active
  await page.click(sel.tabBtn('biomed'));
  // There should be a non-empty announcement when background sets
  const t1 = await liveBgText(page);
  expect(t1.trim().length).toBeGreaterThan(0);

  // Toggle theme; caption should still be non-empty (may differ)
  await page.click('#themeToggle');
  const t2 = await liveBgText(page);
  expect(t2.trim().length).toBeGreaterThan(0);
});

test('biomed gallery is container-aware and shows full even rows', async ({ page }) => {
  // Ensure Biomed tab active
  await page.click(sel.tabBtn('biomed'));

  async function expectRowsFor(width){
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(180);
    const cols = await page.$eval(sel.gallery, el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    const expected = cols * 2; // two full rows always
    const count = await visibleGridCount(page);
    expect(count).toBe(expected);
  }

  await expectRowsFor(1400); // likely 4 cols => 8
  await expectRowsFor(900);  // likely 3 cols => 6
  await expectRowsFor(480);  // likely 2 cols => 4
});

test('biomed gallery images have non-empty alt text', async ({ page }) => {
  await page.click(sel.tabBtn('biomed'));
  await page.setViewportSize({ width: 900, height: 900 });
  await page.waitForTimeout(150);
  const alts = await page.$$eval(sel.galleryImgs, els => els.filter(el => getComputedStyle(el).display !== 'none').map(el => el.getAttribute('alt') || ''));
  expect(alts.length).toBeGreaterThan(0);
  for (const a of alts) expect(a.trim().length).toBeGreaterThan(0);
});

test('software overlay: clickable/keyboard, hides on activate, iframe loads and gets focus', async ({ page }) => {
  await page.click(sel.tabBtn('software'));

  const thumb = page.locator(sel.videoThumb);
  const iframe = page.locator(sel.videoIframe);
  await expect(thumb).toBeVisible();

  // Click to activate
  await thumb.click();
  await expect(thumb).toBeHidden();
  await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/videoseries/);

  await expect(page.locator(sel.videoThumb)).toHaveAttribute('aria-pressed', 'true');
  // Focus should move into iframe (or at least be focusable)
  await page.waitForTimeout(50);
  const active = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
  expect(active).toBe('IFRAME');

  // Reload Software and test keyboard activation too
  await page.click(sel.tabBtn('biomed'));
  await page.click(sel.tabBtn('software'));
  await page.locator(sel.videoThumb).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(sel.videoThumb)).toBeHidden();
});

test('press-and-hold on background hides the card and restores on release', async ({ page }) => {
  // Find a point outside the card to press
  const shellBox = await page.locator(sel.shell).boundingBox();
  const x = (shellBox.x || 0) - 20;
  const y = (shellBox.y || 0) + 20;

  // Press and hold 350ms
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await expect(page.locator(sel.shell)).toHaveClass(/peek-bg/);

  // Release returns the card
  await page.mouse.up();
  await expect(page.locator(sel.shell)).not.toHaveClass(/peek-bg/);
});

test('quick tap on background does not trigger peek (300ms threshold)', async ({ page }) => {
  const shellBox = await page.locator(sel.shell).boundingBox();
  const x = (shellBox.x || 0) - 20;
  const y = (shellBox.y || 0) + 20;
  // Quick tap
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(page.locator(sel.shell)).not.toHaveClass(/peek-bg/);
});
