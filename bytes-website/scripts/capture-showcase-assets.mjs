// Start the named CLI browser from the intended checkout root; artifact paths are relative to that browser session.
// CLI function expression: playwright-cli run-code --filename <this file>.
// Copy scripts/fixtures/showcase-leads.json to dist/__showcase-fixtures.json for capture only.
// A subsequent build removes that temporary fixture; it is never added to public/.
//
// The four BytesFX dashboard screenshots are recaptured only when that synthetic fixture is
// served locally. Six project screenshots are captured from the public live sites and never
// write to a service: every non-GET/HEAD request is blocked. Pivot Parlor's images come from
// capture-pivot-shops.mjs and the Pivot Parlor handoff instead.
async (page) => {
 const local='http://127.0.0.1:4173',root='.';
 const blocked=[],mocked=[],unknown=[],errors=[],results=[];
 let leads=[];
 await page.emulateMedia({reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(!['GET','HEAD'].includes(r.method())){blocked.push({host:u.hostname,path:u.pathname,method:r.method()});return route.abort();}
  if(u.origin===local)return route.continue();
  if(['crm-api.bmorris0565.workers.dev','ai.bytesfx.com'].includes(u.hostname)){
   mocked.push(u.pathname);
   const map={
    '/api/auth/me':{role:'client',name:'Sample Owner',email:'owner@example.com',companyName:'Sample business · demo data'},
    '/api/leads':leads,
    '/api/crm-settings':{plan:'starter',inTrial:false,campaign_mode:'ai'},
    '/api/chatbot/status':{ready:true,canSend:true,mail:{configured:true},mailReady:true},
    '/api/conversations/badge':{count:0},
    '/api/conversations':{conversations:[],total:0,pageSize:50},
    '/api/sales/status':{replyTracking:true,replyDomain:'example.com'},
    '/api/leads/9001/messages':{messages:[],replyTracking:true,files:[],pending:{sequence:[]}},
    '/api/leads/9003/messages':{messages:[],replyTracking:true,files:[],pending:{sequence:[]}}
   };
   if(!(u.pathname in map))unknown.push(u.pathname);
   return route.fulfill({status:u.pathname in map?200:404,contentType:'application/json',body:JSON.stringify(map[u.pathname]||{error:'Read not mocked'})});
  }
  return route.continue();
 });
 await page.setViewportSize({width:1440,height:1000});

 // 1. The BytesFX dashboard screens, only when the synthetic fixture is served locally.
 const fixture=await page.request.get(local+'/__showcase-fixtures.json').catch(()=>null);
 const fixtureIsJson=!!(fixture&&fixture.ok()&&String(fixture.headers()['content-type']||'').includes('json'));
 let bytesfxCaptured=false;
 if(fixtureIsJson){
  const {leads:loadedLeads}=await fixture.json();
  leads=loadedLeads;
  if(!leads.every(l=>l.email.endsWith('@example.com')))throw new Error('Only synthetic contacts allowed');
  await page.goto(local+'/dashboard/',{waitUntil:'networkidle'});
  await page.locator('.lead-card').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:root+'/bytes-website/public/projects/bytesfx-pipeline.png'});
  await page.locator('.lead-card[data-id="9001"]').click();
  await page.locator('#ld-drawer.open').waitFor();
  await page.locator('#ld-drawer').screenshot({path:root+'/bytes-website/public/projects/bytesfx-lead.png',animations:'disabled'});
  await page.locator('#ld-d-close').click();
  await page.locator('.lead-card[data-id="9003"]').click();
  await page.locator('#ld-prop-text').waitFor();
  await page.locator('#ld-prop-text').scrollIntoViewIfNeeded();
  await page.locator('#ld-drawer').screenshot({path:root+'/bytes-website/public/projects/bytesfx-proposal.png',animations:'disabled'});
  await page.goto(local+'/ai-chatbot/',{waitUntil:'networkidle'});
  await page.locator('#chatbot-window').screenshot({path:root+'/bytes-website/public/projects/bytesfx-chat.png'});
  bytesfxCaptured=true;
 }

 // 2. The four live project sites. Read-only visits to the public pages.
 // A cookie banner or an install prompt is dismissed before the shot: it would
 // cover the interface the screenshot is meant to show.
 // The Pivot Parlor demo shops are captured by capture-pivot-shops.mjs, which needs its own clean-frame steps.
 const dismissOverlays=async()=>{
  for(const re of [/^not now$/i,/reject optional categories/i,/^reject$/i,/^got it!?$/i,/^close$/i]){
   const control=page.locator('button:visible').filter({hasText:re}).first();
   if(await control.count()){
    try{await control.click({timeout:2000});await page.waitForTimeout(600);}catch(error){}
   }
  }
 };
 for(const [id,url] of [
  ['active-paw','https://activepaw.co.uk/'],
  ['bytesai-learning','https://learn.bytesai.uk/'],
  ['cafe-bookings','https://cafe.bytesfx.com/'],
  ['file-converter','https://file-converter.bmorris0565.workers.dev/']]){
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(2500);
  await dismissOverlays();
  await page.evaluate(()=>document.fonts.ready);
  results.push({id,url:page.url(),title:await page.title(),headings:await page.locator('h1,h2,h3').allTextContents(),text:(await page.locator('body').innerText()).slice(0,4500)});
  await page.screenshot({path:root+'/bytes-website/public/projects/'+id+'.png'});
 }

 // 3. Medication Reminder. The schedule is seeded in this browser's own storage, so the app
 // shows a synthetic routine. No account is created and every write request stays blocked.
 const medicationOrigin='https://medication.bytesfx.com';
 await page.addInitScript(({origin,schedule})=>{
  if(location.origin!==origin)return;
  localStorage.removeItem('medication-reminder-mobile-unpaired-v1');
  localStorage.setItem('medication-reminder-schedule-v1',JSON.stringify(schedule));
 },{origin:medicationOrigin,schedule:{
  version:1,timezone:'Europe/London',events:[
   {id:'sample-morning',enabled:true,time:'08:00',label:'Sample morning routine',medicines:['Sample medication A - 10mg','Sample medication B - 5ml'],instructions:'Synthetic sample entry. Not a real medication record.',days:['mon','tue','wed','thu','fri','sat','sun'],start_date:null,end_date:null},
   {id:'sample-midday',enabled:true,time:'13:00',label:'Sample midday routine',medicines:['Sample medication C - 1 tablet'],instructions:'Synthetic sample entry. Not a real medication record.',days:['mon','tue','wed','thu','fri','sat','sun'],start_date:null,end_date:null},
   {id:'sample-evening',enabled:true,time:'20:00',label:'Sample evening routine',medicines:['Sample medication D - 2 tablets'],instructions:'Synthetic sample entry. Not a real medication record.',days:['mon','tue','wed','thu','fri','sat','sun'],start_date:null,end_date:null}
  ]}});
 await page.goto(medicationOrigin+'/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(2000);
 const continueChoice=page.getByRole('button',{name:/continue on this device/i}).or(page.getByRole('link',{name:/continue on this device/i}));
 if(await continueChoice.count()){
  await continueChoice.first().click();
  await page.waitForTimeout(1000);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
 }
 const schedulesTab=page.getByRole('button',{name:/^schedules$/i}).or(page.getByRole('link',{name:/^schedules$/i})).or(page.getByRole('tab',{name:/schedules/i}));
 if(await schedulesTab.count()){await schedulesTab.first().click();await page.waitForTimeout(1200);}
 await page.evaluate(()=>document.fonts.ready);
 results.push({id:'medication-reminder',url:page.url(),title:await page.title(),headings:await page.locator('h1,h2,h3').allTextContents(),text:(await page.locator('body').innerText()).slice(0,2500)});
 await page.screenshot({path:root+'/bytes-website/public/projects/medication-reminder.png'});

 // 4. Shikaku. The guest puzzle board: no account, no matchmaking, no score.
 await page.goto('https://shikaku.bytesai.uk/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(2500);
 await page.locator('button:has-text("Play Quest")').first().click();
 await page.waitForTimeout(1500);
 await page.locator('#level-select-screen .level-card:not(.locked)').first().click();
 await page.waitForTimeout(2000);
 await page.evaluate(()=>document.fonts.ready);
 results.push({id:'shikaku',url:page.url(),title:await page.title(),headings:await page.locator('h1,h2,h3').allTextContents(),text:(await page.locator('body').innerText()).slice(0,2500)});
 await page.screenshot({path:root+'/bytes-website/public/projects/shikaku.png'});

 return {bytesfxCaptured,results,blocked,mocked,unknown,errors,productionWrites:0};
}
