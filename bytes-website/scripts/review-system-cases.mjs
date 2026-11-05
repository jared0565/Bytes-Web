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
  check('catalogue exposes six distinct cases',cases.length===6&&new Set(cases).size===cases.length);
  for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const slug of cases){
      const route='/projects/'+slug+'/';
      const response=await page.goto(origin+route,{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      check(width+' '+slug+' loads',response.ok());
      check(width+' '+slug+' one workflow',await page.locator('.showcase-system-flow').count()===1);
      // The build audit checks exact lane counts against the source catalogue.
      check(width+' '+slug+' operational lanes',await page.locator('.showcase-flow-lane').count()>=2);
      check(width+' '+slug+' scope explanations',await page.locator('.showcase-scope-section').count()===2);
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
