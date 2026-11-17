// Existing Playwright CLI: run-code --filename bytes-website/scripts/review-system-cases.mjs --raw
async page => {
  const origin='http://127.0.0.1:4173';
  const checks=[],errors=[];
  const check=(name,passed)=>checks.push({name,passed:!!passed});
  page.removeAllListeners('pageerror');
  page.on('pageerror',error=>errors.push(error.message));
  await page.unroute('**/*');
  await page.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(request.method()==='GET'&&(url.origin===origin||['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)))return route.continue();
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(origin+'/projects/',{waitUntil:'networkidle'});
  const cases=await page.locator('[data-project]').evaluateAll(cards=>cards.map(card=>card.dataset.project));
  check('catalogue exposes seven distinct cases',cases.length===7&&new Set(cases).size===cases.length);
  // Every card action: the preview opens that project's case, and the external action names an allowlisted host.
  const LIVE_HOSTS=['web.bytesfx.com','pivotparlor.com','activepaw.co.uk','learn.bytesai.uk','cafe.bytesfx.com','file-converter.bmorris0565.workers.dev','medication.bytesfx.com','shikaku.bytesai.uk'];
  const cards=await page.locator('[data-project]').evaluateAll(list=>list.map(card=>({
    id:card.dataset.project,
    preview:card.querySelector('.showcase-preview').getAttribute('href'),
    actions:[...card.querySelectorAll('.showcase-actions a')].map(a=>({label:a.textContent.trim(),href:a.getAttribute('href')}))
  })));
  for(const card of cards){
    check(card.id+' card opens its own case',card.preview==='/projects/'+card.id+'/');
    check(card.id+' card offers a view and a live action',card.actions.length===2);
    const live=card.actions.find(a=>/^https?:/.test(a.href||''));
    check(card.id+' card names an allowlisted destination',!!live&&LIVE_HOSTS.includes(new URL(live.href).hostname));
  }
  // The index leads with the product proof, and does not repeat the chatbot page's workflow.
  check('index leads with the product proof',await page.locator('.showcase-proof-feature').count()===1);
  check('product proof opens the BytesFX case study',await page.locator('.showcase-proof-feature a[href="/projects/bytesfx/"]').count()===1);
  check('product proof names the chatbot page',await page.locator('.showcase-proof-feature a[href="/ai-chatbot/"]').count()===1);
  check('the index does not repeat the chatbot workflow',await page.locator('.showcase-workflow').count()===0);
  // Keyboard: a card action is reachable and carries a visible focus ring.
  const firstPreview=page.locator('[data-project] .showcase-preview').first();
  const firstHref=await firstPreview.getAttribute('href');
  await firstPreview.focus();
  const ring=await firstPreview.evaluate(e=>{const s=getComputedStyle(e);return s.outlineStyle+' '+s.outlineWidth;});
  check('a card action shows a focus ring',ring.includes('solid'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  check('the keyboard opens the case from the index',new URL(page.url()).pathname===firstHref);
  // The BytesFX case has no card (the product proof leads to it), so it is reviewed alongside the cards' cases.
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const slug of ['bytesfx',...cases]){
      const route='/projects/'+slug+'/';
      const response=await page.goto(origin+route,{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      check(width+' '+slug+' loads',response.ok());
      check(width+' '+slug+' one workflow',await page.locator('.showcase-system-flow').count()===1);
      // The build audit checks exact lane and section counts against the source catalogue.
      check(width+' '+slug+' operational lanes',await page.locator('.showcase-flow-lane').count()>=2);
      check(width+' '+slug+' scope explanations',await page.locator('.showcase-scope-section').count()>=2);
      check(width+' '+slug+' names its own kind',await page.locator('.showcase-kind').count()===1);
      check(width+' '+slug+' offers a live action',await page.locator('.showcase-case-body a[href^="http"]').count()>=1);
      const state=await page.evaluate(()=>({
        fits:document.documentElement.scrollWidth<=innerWidth+1,
        nodesFit:[...document.querySelectorAll('.showcase-flow-step h4,.showcase-flow-step p,.showcase-flow-tag')].every(e=>e.scrollWidth<=e.clientWidth+1),
        h1:document.querySelectorAll('h1').length,
        repositories:[...document.querySelectorAll('a')].filter(e=>e.href.includes('github.com')).length,
        arrow:getComputedStyle(document.querySelector('.showcase-flow-step'),'::after').content,
      }));
      check(width+' '+slug+' page and nodes fit',state.fits&&state.nodesFit);
      check(width+' '+slug+' semantics and no repository links',state.h1===1&&state.repositories===0);
      check(width+' '+slug+' arrow direction',state.arrow.includes(width>1200?'→':'↓'));
      for(const image of await page.locator('img[src^="/projects/"]').all()){
        await image.scrollIntoViewIfNeeded();await image.evaluate(e=>e.decode());
      }
      check(width+' '+slug+' images load',await page.locator('img[src^="/projects/"]').evaluateAll(images=>images.every(e=>e.naturalWidth>0)));
      if(width===1440||width===390){
        await page.locator('.showcase-system-flow').screenshot({path:'output/playwright/system-cases/'+slug+'-flow-'+width+'.png',style:'.navbar,.cb-skip-link{visibility:hidden!important}'});
        if(slug==='active-paw'){
          await page.evaluate(()=>scrollTo(0,0));
          await page.screenshot({path:'output/playwright/system-cases/active-paw-case-'+width+'.png',fullPage:true});
        }
      }
      await page.addStyleTag({content:'html{font-size:200%!important}'});
      check(width+' '+slug+' enlarged text fits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('.showcase-flow-step h4,.showcase-flow-step p,.showcase-flow-tag')].every(e=>e.scrollWidth<=e.clientWidth+1)));
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/projects/',{waitUntil:'networkidle'});
  check('Active Paw title represents both components',await page.getByRole('heading',{name:'Active Paw + PawScout',exact:true}).count()===1);
  await page.locator('[data-project="active-paw"] .showcase-preview').click();
  check('Active Paw card opens dedicated case',new URL(page.url()).pathname==='/projects/active-paw/');
  check('Active Paw scope includes Shopify and PawScout',await page.locator('.showcase-case-body').evaluate(e=>e.textContent.includes('Shopify')&&e.textContent.includes('PawScout')));
  check('Active Paw human controls visible',await page.locator('.showcase-flow-tag').count()===2);
  await page.locator('#mobileMenuBtn').click();
  await page.locator('#navLinks .nav-work').click();
  check('mobile navigation returns to work index',new URL(page.url()).pathname==='/projects/');
  for(const route of ['/','/ai-chatbot/']){
    await page.goto(origin+route,{waitUntil:'networkidle'});
    await page.locator('#projects').waitFor();
    check(route+' paired project preview',await page.getByRole('heading',{name:'Active Paw + PawScout',exact:true}).count()===1);
  }
  check('no runtime errors',errors.length===0);
  return {checkCount:checks.length,passed:checks.filter(c=>c.passed).length,failures:checks.filter(c=>!c.passed),errors,productionWritesForwarded:0};
}
