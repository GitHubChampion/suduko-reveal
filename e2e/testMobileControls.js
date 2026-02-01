const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // capture browser console
  page.on('console', (msg) => {
    const args = msg.args();
    Promise.all(args.map(a => a.jsonValue().catch(() => undefined))).then((vals) => {
      console.log('PAGE LOG:', msg.type(), ...vals.filter((v) => v !== undefined));
    }).catch(() => {});
  });

  // set mobile-like viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true });

  const url = 'http://localhost:3000';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle0' });

  // helper to click button by visible text
  async function clickByText(text) {
    const ok = await page.evaluate((t) => {
      const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find((b) => normalize(b.textContent) === t);
      if (!found) return false;
      found.click();
      return true;
    }, text);
    if (!ok) throw new Error('Button not found: ' + text);
    return true;
  }

    // simple sleep replacement compatible with this Puppeteer
    async function sleep(ms) {
      return page.evaluate((t) => new Promise((res) => setTimeout(res, t)), ms);
    }

    // helper to check status area (if present)
    async function getStatusText() {
    const txt = await page.evaluate(() => {
      const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
      // search for likely status containers
      const candidates = Array.from(document.querySelectorAll('div, p, span'));
      for (const el of candidates) {
        const t = normalize(el.textContent);
        if (!t) continue;
        if (/Saved|Loaded|Reset|Welcome back|Start Over|Start Over\?|Reset Puzzle\?/i.test(t)) return t;
      }
      return null;
    });
    return txt;
  }

  // Click Load
  try {
    console.log('\n-- Clicking Load --');
    await clickByText('Load');
    await sleep(500);
    console.log('Status after Load:', await getStatusText());
  } catch (e) {
    console.error('Load click failed:', e.message);
  }

  // Click Restart (should open confirmation modal)
  try {
    console.log('\n-- Clicking Restart (expect modal) --');
    await clickByText('Restart');
      await sleep(500);
    // modal should appear with text 'Reset Puzzle?'
    const modal = await page.evaluate(() => !!Array.from(document.querySelectorAll('div')).find(d => /Reset Puzzle\?|Start Over\?/i.test(d.textContent || '')));
    console.log('Modal found:', modal);
    // Click 'Yes, Reset' if present
    try {
      await clickByText('Yes, Reset');
        await sleep(500);
      console.log('Clicked Yes, Reset');
      console.log('Status after Reset:', await getStatusText());
    } catch (err) {
      console.log('Could not click Yes, Reset:', err.message);
    }
  } catch (e) {
    console.error('Restart click failed:', e.message);
  }

  // Click Start Over (expect full-reset modal)
  try {
    console.log('\n-- Clicking Start Over --');
    await clickByText('Start Over');
      await sleep(500);
    const modal2 = await page.evaluate(() => !!Array.from(document.querySelectorAll('div')).find(d => /Start Over\?/i.test(d.textContent || '')));
    console.log('Start Over modal found:', modal2);
    // Click 'Yes, Start Over'
    try {
      await clickByText('Yes, Start Over');
        await sleep(500);
      console.log('Clicked Yes, Start Over');
      console.log('Status after Start Over:', await getStatusText());
    } catch (err) {
      console.log('Could not click Yes, Start Over:', err.message);
    }
  } catch (e) {
    console.error('Start Over click failed:', e.message);
  }

  await browser.close();
  console.log('\nTest complete');
})();
