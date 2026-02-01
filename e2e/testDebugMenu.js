const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({ width: 1024, height: 768 }); // desktop

  const url = 'http://localhost:3000';
  console.log('Opening', url, 'on desktop');
  await page.goto(url, { waitUntil: 'networkidle0' });

  // helper to sleep
  async function sleep(ms) {
    return page.evaluate((t) => new Promise((res) => setTimeout(res, t)), ms);
  }

  // Find the header and triple-click it
  async function tripleClickHeader() {
    const headerFound = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div')).find(
        (d) => d.textContent.includes('Hey Baby, Help Reveal') && d.classList.contains('cursor-pointer')
      );
      if (!el) return false;
      // Simulate 3 clicks
      for (let i = 0; i < 3; i++) {
        el.click();
      }
      return true;
    });
    return headerFound;
  }

  // Check if debug menu is visible
  async function isDebugMenuVisible() {
    return page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('div')).find(
        (d) => d.textContent.includes('DEBUG: Jump to Puzzle')
      );
    });
  }

  try {
    console.log('\n-- Triple-clicking header --');
    const clicked = await tripleClickHeader();
    console.log('Header found and clicked:', clicked);

    await sleep(300);

    const visible = await isDebugMenuVisible();
    console.log('Debug menu visible:', visible);

    if (visible) {
      // Try to find and click "Puzzle 3"
      const clicked3 = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.textContent.includes('Puzzle 3'));
        if (!btn) return false;
        btn.click();
        return true;
      });
      console.log('Clicked Puzzle 3:', clicked3);

      await sleep(300);

      const level = await page.evaluate(() => {
        const el = Array.from(document.querySelectorAll('div')).find(
          (d) => d.textContent.includes('Level 3')
        );
        return !!el;
      });
      console.log('Jumped to Level 3:', level);
    }
  } catch (e) {
    console.error('Test failed:', e.message);
  }

  await browser.close();
  console.log('\nDesktop test complete');
})();
