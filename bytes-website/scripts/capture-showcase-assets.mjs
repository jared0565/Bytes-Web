// CLI function expression: playwright-cli run-code --filename <this file>.
// Copy scripts/fixtures/showcase-leads.json to dist/__showcase-fixtures.json for capture only.
// A subsequent build removes that temporary fixture; it is never added to public/.
async (page) => {
 const local='http://127.0.0.1:4173',root='C:/Users/fbmac/atlas/Codex/.codex_state/user_home/worktrees/626f/Bytes-Web';
 const response=await page.request.get(local+'/__showcase-fixtures.json');
 if(!response.ok()) throw new Error('Serve the synthetic fixture locally before capture');
 const {leads}=await response.json();
 if(!leads.every(l=>l.email.endsWith('@example.com')))throw new Error('Only synthetic contacts allowed');
 const blocked=[],mocked=[],unknown=[],errors=[];
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
 const results=[];
 for(const [id,url] of [
 ['pivot-parlor','https://pivotparlor.com/ferdyms-barber-shop-014'],
 ['active-paw','https://activepaw.co.uk/'],
 ['bytesai-learning','https://learn.bytesai.uk/'],
 ['cafe-bookings','https://cafe.bytesfx.com/'],
 ['file-converter','https://file-converter.bmorris0565.workers.dev/']]){
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);
  await page.evaluate(()=>document.fonts.ready);
  results.push({id,url:page.url(),title:await page.title(),headings:await page.locator('h1,h2,h3').allTextContents(),text:(await page.locator('body').innerText()).slice(0,4500)});
  await page.screenshot({path:root+'/bytes-website/public/projects/'+id+'.png'});
 }
 return {results,blocked,mocked,unknown,errors,productionWrites:0};
}