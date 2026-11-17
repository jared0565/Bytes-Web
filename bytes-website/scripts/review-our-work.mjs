// Run through the existing Playwright CLI against the local production preview.
async (page) => {
  const origin = 'http://127.0.0.1:4173';
  const checks = [], errors = [];
  page.removeAllListeners('pageerror');
  await page.unroute('**/*');
  const check = (name, passed, detail) => checks.push({ name, passed: !!passed, ...(detail ? { detail } : {}) });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && (url.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname))) return route.continue();
    return route.fulfill({status: 200, contentType: 'application/json', body: '{}'});
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(origin + '/projects/', {waitUntil: 'networkidle'});
  const caseRoutes = await page.locator('[data-project] .showcase-preview').evaluateAll(links => links.map(link => link.getAttribute('href')));
  check('catalogue case routes are present and unique', caseRoutes.length === 7 && new Set(caseRoutes).size === caseRoutes.length);
  const routes = ['/', '/ai-chatbot/', '/projects/', ...caseRoutes, '/privacy-policy.html', '/terms-of-service.html', '/cookie-policy.html', '/data-deletion.html'];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      const response = await page.goto(origin + route, {waitUntil: 'networkidle'});
      await page.evaluate(() => document.fonts.ready);
      check(`${width} ${route} loads`, response.ok());
      if (route === '/') await page.locator('#projects').waitFor();
      if (route === '/ai-chatbot/') await page.locator('.showcase-details summary').click();
      for (const image of await page.locator('img[src^="/projects/"]').all()) await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('img[src^="/projects/"]')].every(image => image.complete && image.naturalWidth > 0));
      check(`${width} ${route} fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.evaluate(() => scrollTo(0, 0));
      const work = page.locator('nav a[href="/projects/"]').first();
      if (width <= 768 && await page.locator('#mobileMenuBtn').count()) {
        check(`${width} ${route} hidden menu is inert`, await page.locator('#navLinks').evaluate(e => e.inert));
        await page.locator('#mobileMenuBtn').click();
      }
      await work.waitFor({state:'visible'});
      check(`${width} ${route} Our Work visible`, await work.isVisible());
      check(`${width} ${route} nav fits`, await page.evaluate(() => {
        const nav = document.querySelector('nav'), rect = nav.getBoundingClientRect();
        return [...nav.querySelectorAll('a,button')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').every(e => {
          const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= rect.top - 1;
        });
      }));
      if (width <= 768 && await page.locator('#mobileMenuBtn').count()) {
        await work.focus();
        await page.keyboard.press('Escape');
        check(`${width} ${route} Escape restores focus`, await page.evaluate(() => document.activeElement.id === 'mobileMenuBtn' && document.querySelector('#navLinks').inert));
      }
      if ((width === 1440 || width === 390) && ['/', '/projects/', '/projects/pivot-parlor/'].includes(route)) {
        const name = route === '/' ? 'home' : route === '/projects/' ? 'index' : 'pivot';
        await page.screenshot({ path: `output/playwright/our-work/${name}-${width}.png`, fullPage: true, animations: 'disabled' });
      }
      if (width === 390 && route === '/ai-chatbot/') await page.locator('#projects').screenshot({path:'output/playwright/our-work/chatbot-preview-390.png'});
    }
  }
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(origin + '/', {waitUntil: 'networkidle'});
  await page.locator('#mobileMenuBtn').click();
  await page.locator('#navLinks .nav-work').click();
  await page.waitForURL(origin + '/projects/');
  check('mobile Our Work click opens catalogue', await page.locator('h1').textContent() === 'What we’ve built');
  check('catalogue shows seven projects', await page.locator('[data-project]').count() === 7);
  // The index leads with the BytesFX product proof, which points into the chatbot page.
  check('index leads with the product proof', await page.locator('.showcase-proof-feature').count() === 1);
  await page.locator('.showcase-proof-feature a[href="/ai-chatbot/#product-workflow"]').click();
  await page.waitForURL(url => url.pathname === '/ai-chatbot/');
  check('product proof opens the chatbot workflow', await page.locator('#product-workflow').count() === 1);
  check('product proof labels its sample data', (await page.locator('#product-workflow').innerText()).toLowerCase().includes('synthetic'));
  // A project card opens its own case and returns to the index.
  await page.goto(origin + '/projects/', {waitUntil: 'networkidle'});
  await page.locator('[data-project="pivot-parlor"] .showcase-preview').click();
  await page.waitForURL(origin + '/projects/pivot-parlor/');
  check('a project card opens its case', await page.locator('h1').textContent() === 'Pivot Parlor');
  check('case states ownership', await page.getByText('Built by BytesFX', {exact:true}).count() === 1);
  await page.locator('.showcase-back').click();
  check('case returns to catalogue', new URL(page.url()).pathname === '/projects/');
  for (const route of routes) {
    await page.goto(origin + route, {waitUntil: 'networkidle'});
    await page.addStyleTag({content:'html {font-size:200% !important}'});
    check(`200% ${route} fits`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  check('no runtime errors', errors.length === 0, errors);
  return {checkCount:checks.length, passed:checks.filter(check=>check.passed).length, failures:checks.filter(check => !check.passed), errors, productionWritesForwarded: 0};
}
