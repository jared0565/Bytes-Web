// Start the named CLI browser from the intended checkout root; artifact paths are relative to that browser session.
// CLI: playwright-cli run-code --filename bytes-website/scripts/verify-showcase-ui.mjs --raw
async(page)=>{
 const local='http://127.0.0.1:4173',root='.';
 const checks=[],errors=[],network=[];
 const check=(name,ok)=>checks.push({name,passed:!!ok});
 await page.unroute('**/*');
 page.removeAllListeners('pageerror');
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin===local&&['GET','HEAD'].includes(req.method()))return route.continue();
  if(['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)&&req.method()==='GET')return route.continue();
  network.push({host:u.hostname,path:u.pathname,method:req.method()});
  if(u.hostname==='ai.bytesfx.com'&&req.method()==='POST')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({response:'Local sample reply. Start the free trial without a card.',sessionId:'showcase-local-only'})});
  return route.fulfill({status:200,contentType:'application/json',body:'{}'});
 });
 await page.emulateMedia({reducedMotion:'reduce'});
 const routes=['/ai-chatbot/','/projects/','/projects/pivot-parlor/','/projects/active-paw/','/projects/bytesai-learning/','/projects/cafe-bookings/','/projects/file-converter/'];
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const route of routes){
   const response=await page.goto(local+route,{waitUntil:'networkidle'});
   check(width+' '+route+' loads',response.ok());
   await page.evaluate(()=>document.fonts.ready);
   if(route==='/ai-chatbot/')await page.locator('.showcase-details summary').click();
   // Trigger all lazy images before evaluating their actual loaded state.
   for(const img of await page.locator('img[src^="/projects/"]').all())await img.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('img[src^="/projects/"]')).every(i=>i.complete&&i.naturalWidth>0));
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll('h1').length,trial:[...document.querySelectorAll('a[href="/onboarding/"]')].length,badImages:[...document.images].filter(i=>i.src.includes('/projects/')&&(!i.alt||!i.naturalWidth)).length}));
   check(width+' '+route+' no overflow',!state.overflow);
   check(width+' '+route+' H1/trial/images',state.h1===1&&state.trial>0&&state.badImages===0);
   if(route==='/ai-chatbot/')await page.locator('.showcase-details summary').click();
   await page.evaluate(()=>scrollTo(0,0));
   if(width===1440||width===390){
    if(route==='/ai-chatbot/'){
     await page.locator('#product-workflow').screenshot({style:'.navbar,.cb-skip-link {visibility:hidden!important}',path:root+'/output/playwright/showcase/proof-'+width+'.png',animations:'disabled'});
     await page.locator('#projects').screenshot({style:'.navbar,.cb-skip-link {visibility:hidden!important}',path:root+'/output/playwright/showcase/projects-'+width+'.png',animations:'disabled'});
     await page.locator('.showcase-details summary').click();
     await page.locator('.showcase-screen-pair').screenshot({style:'.navbar,.cb-skip-link {visibility:hidden!important}',path:root+'/output/playwright/showcase/screens-'+width+'.png',animations:'disabled'});
    }
    if(route==='/projects/pivot-parlor/'||route==='/projects/')await page.screenshot({path:root+'/output/playwright/showcase/'+(route==='/projects/'?'index':'case')+'-'+width+'.png',fullPage:true,animations:'disabled'});
   }
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(local+'/ai-chatbot/',{waitUntil:'networkidle'});
 await page.keyboard.press('Tab');
 check('skip link first focus',await page.evaluate(()=>document.activeElement.classList.contains('cb-skip-link')));
 await page.keyboard.press('Enter');
 check('skip focuses main',await page.evaluate(()=>document.activeElement.id==='app'));
 await page.locator('#mobileMenuBtn').click();
 check('mobile menu announces open',await page.locator('#mobileMenuBtn').getAttribute('aria-expanded')==='true');
 await page.locator('#navLinks a').first().focus();await page.keyboard.press('Escape');
 check('Escape restores trigger and closes links',await page.evaluate(()=>document.activeElement.id==='mobileMenuBtn'&&document.querySelector('#navLinks').inert));
 await page.locator('.showcase-details summary').focus();await page.keyboard.press('Enter');
 check('workflow disclosure opens by keyboard',await page.locator('.showcase-details').getAttribute('open')!==null);
 check('focus visibly styled',await page.locator('.showcase-details summary').evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
 await page.locator('#chatInput').fill('How do I start?');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#chat-messages').textContent.includes('Local sample reply'));
 check('embedded chat still handles a mocked reply',await page.locator('#chatInput').isEnabled());
 check('five plans retained',await page.locator('[data-plan]').count()===5);
 for(const p of ['starter','pro','business','enterprise'])check(p+' enquiry preserved',await page.locator('a[href="/?plan='+p+'#contact"]').count()>0);
 const destinations=await page.locator('.showcase-actions a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
 check('all selected project actions present',destinations.length===6);
 for(const href of destinations.filter(x=>x.startsWith('/projects/'))){
  const r=await page.request.get(local+href);check('action '+href+' loads',r.ok()&&(await r.text()).includes('<h1>'));
 }
 for(const route of routes){
  await page.goto(local+route,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'html {font-size:200% !important}'});
  check('200% text '+route+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }
 check('no browser runtime errors',errors.length===0);
 return {checks,failures:checks.filter(x=>!x.passed),errors,intercepted:network,productionRequestsForwarded:0,viewports:[1440,768,390,320],textScale:'200%',reducedMotion:true};
}
