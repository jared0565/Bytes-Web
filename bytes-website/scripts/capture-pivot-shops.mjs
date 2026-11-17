// Start the named CLI browser from the intended checkout root; artifact paths are relative to that browser session.
// CLI function expression: playwright-cli run-code --filename <this file>.
// Read-only capture of the two public Pivot Parlor demo shops: only GET and HEAD leave the browser.
// Clean-frame recipe from the 17 Nov 2026 Pivot Parlor handoff: cookie consent and the install prompt are
// pre-answered in localStorage, the chat button is hidden, lazy images are forced to load and motion is
// reduced. The demo notice stays in shot; a frame without it, with an unloaded image, or with a cookie
// notice, chat button or install prompt in view is never saved. Afterwards run optimize-pivot-images.py.
async (page) => {
 const root='.',blocked=[],errors=[],results=[];
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{
  localStorage.setItem('pp_cookie_consent',JSON.stringify({essential:true,maps:'declined',timestamp:'2026-11-17T00:00:00.000Z'}));
  localStorage.setItem('pp-install-dismissed',String(Date.now()));
 });
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const r=route.request();
  if(!['GET','HEAD'].includes(r.method())){
   const u=new URL(r.url());
   blocked.push({host:u.hostname,path:u.pathname,method:r.method()});
   return route.abort();
  }
  return route.continue();
 });
 await page.setViewportSize({width:1440,height:1000});
 for(const [id,url] of [
  ['pivot-parlor','https://pivotparlor.com/ferdyms-barber-shop-demo'],
  ['pivot-linden-lark','https://pivotparlor.com/linden-and-lark-demo']]){
  await page.goto(url,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'.pp-chat-fab{display:none!important}html{scrollbar-width:none}'});
  await page.evaluate(async()=>{
   document.querySelectorAll('img[loading="lazy"]').forEach(i=>{i.loading='eager';});
   await Promise.all([...document.images].map(i=>i.complete?null:new Promise(done=>{
    i.addEventListener('load',done,{once:true});
    i.addEventListener('error',done,{once:true});
   })));
   await document.fonts.ready;
  });
  const title=await page.title();
  if(!title.endsWith('(demo)'))throw new Error(id+': not the demo shop page: '+title);
  if(!await page.locator('.pp-demo-notice').first().isVisible())throw new Error(id+': demo notice not visible');
  const unloaded=await page.evaluate(()=>[...document.images]
   .filter(i=>(i.currentSrc||i.src)&&(!i.complete||i.naturalWidth===0))
   .map(i=>i.currentSrc||i.src));
  if(unloaded.length)throw new Error(id+': images not loaded: '+unloaded.join(', '));
  // The localStorage keys and the chat class above belong to Pivot Parlor; if they change, refuse the frame.
  const overlays=await page.evaluate(()=>{
   const shown=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    return r.width>=1&&r.height>=1&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&s.visibility!=='hidden'&&Number(s.opacity)>0;};
   const ownText=e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
   const found=[];
   for(const e of document.querySelectorAll('body *')){
    if(!shown(e))continue;
    const text=ownText(e),label=e.getAttribute('aria-label')||'';
    if(/Cookies & privacy|strictly necessary cookies/i.test(text)||(e.tagName==='BUTTON'&&e.textContent.trim()==='Got it'))found.push('cookie notice: '+(text||'Got it').slice(0,40));
    else if(e.matches('.pp-chat-fab')||(/^(BUTTON|A)$/.test(e.tagName)&&/chat|assistant/i.test(label)))found.push('chat button: '+(label||e.className).slice(0,40));
    else if(/install the app|add to home screen/i.test(text))found.push('install prompt: '+text.slice(0,40));
   }
   return found;
  });
  if(overlays.length)throw new Error(id+': overlay in frame: '+overlays.join('; '));
  await page.screenshot({path:root+'/bytes-website/public/projects/'+id+'.png'});
  results.push({id,url:page.url(),title});
 }
 return {results,blocked,errors,capturedAt:new Date().toISOString()};
}
