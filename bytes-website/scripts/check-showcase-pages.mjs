import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {projects} from '../src/showcase-content.js';
import {publishedProjects,featuredProjects,kindLabels} from '../src/showcase-html.js';

const site=fileURLToPath(new URL('../',import.meta.url));
const dist=join(site,'dist');
const defaultRead=p=>existsSync(join(dist,p))?readFileSync(join(dist,p),'utf8'):'';
const defaultExists=p=>existsSync(join(dist,p));
const publicProjects=publishedProjects(projects);
export function auditShowcase({read=defaultRead,exists=defaultExists}={}) {
 const failures=[],check=(ok,m)=>{if(!ok)failures.push(m);};
 const routes=['/ai-chatbot/','/projects/',...publicProjects.map(p=>p.caseStudyPath)];
 const titles=new Set();
 for(const route of routes){
  const html=read(route.slice(1)+'index.html');
  check(!!html,route+': missing built page');
  check((html.match(/<h1[\s>]/g)||[]).length===1,route+': one H1 required');
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
  check(title&&!titles.has(title),route+': missing/duplicate title');titles.add(title);
  check(/<meta name="description" content="[^"]+"/.test(html),route+': missing description');
  check(html.includes('href="https://web.bytesfx.com'+route+'"'),route+': canonical missing');
  check(html.includes('href="/onboarding/"'),route+': trial action missing');
  const nav=html.match(/<ul class="nav-links"[\s\S]*?<\/ul>/)?.[0]||'';
  check(/href="\/projects\/" class="nav-item nav-work"/.test(nav),route+': Our Work navigation missing');
  if(route.startsWith('/projects/'))check(/nav-work" aria-current="(?:page|location)"/.test(nav),route+': current section missing');
  check(!html.includes('<!--@')&&!/\{\{\w+\}\}/.test(html),route+': unfilled marker');
  check(!/<iframe\b/i.test(html),route+': iframe forbidden');
  check(!/href="https?:\/\/(?:www\.)?github\.com\//i.test(html),route+': public repository link present');
  for(const draft of projects.filter(p=>p.publishState==='draft'))check(!html.toLowerCase().includes(draft.id),route+': draft leaked');
  for(const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)){
   const u=new URL(m[1],'https://web.bytesfx.com');
   const pathname=decodeURIComponent(u.pathname);
   const local=pathname.endsWith('/')?pathname.slice(1)+'index.html':pathname.slice(1);
   check(exists(local),route+': broken local path '+pathname);
  }
  for(const m of html.matchAll(/<img\b[^>]*src="(\/projects\/[^"]+)"[^>]*>/g)){
   const tag=m[0];
   check(/\balt="[^"]+"/.test(tag)&&/\bwidth="[1-9]\d*"/.test(tag)&&/\bheight="[1-9]\d*"/.test(tag),route+': missing image metadata '+m[1]);
  }
 }
 const cb=read('ai-chatbot/index.html');
 const featured=[...cb.matchAll(/data-project="([^"]+)"/g)].map(m=>m[1]);
 check(JSON.stringify(featured)===JSON.stringify(featuredProjects(projects).map(p=>p.id)),'featured count/order mismatch');
 check(cb.indexOf('id="product-workflow"')<cb.indexOf('id="projects"')&&cb.indexOf('id="projects"')<cb.indexOf('id="how"'),'product/project/setup sequence incorrect');
 for(const term of ['Inbox','Priority','Opportunity','Campaigns','Closed','Won','Lost','synthetic sample data','review'])check(cb.includes(term),'missing product proof '+term);
 for(const p of publicProjects){
  const html=read(p.caseStudyPath.slice(1)+'index.html');
  check(html.includes(kindLabels[p.kind]),p.id+': kind label missing');
  check(html.includes('Built by BytesFX')&&html.includes('complete delivery'),p.id+': ownership missing');
  check(p.deliveryScope.every(scope=>html.includes(scope)),p.id+': delivery scope missing');
 }
 const home=read('index.html'),index=read('projects/index.html');
 check(home.includes('class="nav-item nav-work"')&&home.includes('id="homeProjects"')&&home.includes('Explore Our Work'),'homepage discovery missing');
 check(index.includes('What we’ve built')&&index.includes('Built by BytesFX'),'showcase positioning missing');
 check(index.indexOf('data-project="bytesfx"')<index.indexOf('data-project="pivot-parlor"'),'BytesFX flagship must lead');
 const map=read('sitemap.xml');
 for(const route of routes.slice(1))check(map.includes('<loc>https://web.bytesfx.com'+route+'</loc>'),'sitemap route missing '+route);
 for(const draft of projects.filter(p=>p.publishState==='draft')){
  check(!map.toLowerCase().includes(draft.id),'draft sitemap leak');
  check(!exists('projects/'+draft.id+'/index.html'),'draft built route exists');
 }
 check(!exists('__showcase-fixtures.json'),'temporary capture fixtures shipped');
 for(const p of publicProjects){
  const data=readFileSync(join(dist,p.image.src));
  check(data.readUInt32BE(16)===p.image.width&&data.readUInt32BE(20)===p.image.height,p.id+': PNG dimensions differ from metadata');
 }
 return failures;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const failures=auditShowcase();
 if(process.argv.includes('--self-test')){
  const mutants=[
   s=>s.replace('data-project="pivot-parlor"','data-project="bytescrm"'),
   s=>s.replace('src="/projects/pivot-parlor.png"','src="/projects/missing.png"'),
   s=>s.replace('width="1440"','width="0"'),
   s=>s.replace('<!--@ld-->','')+'<iframe src="https://example.com"></iframe>',
   s=>s.replace('href="/onboarding/"','href="/missing-trial/"')
  ];
  for(const change of mutants){
   const found=auditShowcase({read:p=>p==='ai-chatbot/index.html'?change(defaultRead(p)):defaultRead(p)});
   if(!found.length)failures.push('checker mutation escaped detection');
  }
 }
 if(failures.length){failures.forEach(f=>console.error('[showcase] '+f));process.exitCode=1;}
 else console.log('[showcase] '+(publicProjects.length+2)+' built pages, navigation, ownership, published routes, image metadata, trial paths and draft boundary verified'+(process.argv.includes('--self-test')?'; five negative mutations detected':''));
}
