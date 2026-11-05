// Build-time renderer. Catalogue records are trusted editorial data, validated at the publication boundary.
export const kindLabels = Object.freeze({'owned-product':'Owned product','live-store':'Live store','demonstration':'Demonstration'});
const LIVE_HOSTS = new Set(['pivotparlor.com','activepaw.co.uk','learn.bytesai.uk','cafe.bytesfx.com','file-converter.bmorris0565.workers.dev']);
export const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = (v,name) => { if(typeof v!=='string'||!v.trim())throw new Error('Missing '+name); };
function checkedURL(value, hosts) {
  text(value,'URL');
  let u;try{u=new URL(value);}catch{throw new Error('Invalid URL');}
  if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.username||u.password||u.port||/[\s\\]/.test(value))throw new Error('Unsafe URL');
}
function validateImage(image) {
  if(!image||!/^\/projects\/[a-z0-9-]+\.png$/.test(image.src))throw new Error('Invalid image path');
  text(image.alt,'image alt');
  for(const dimension of ['width','height'])if(!Number.isInteger(image[dimension])||image[dimension]<1)throw new Error('Invalid image dimension');
}
function validateProject(p) {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id))throw new Error('Invalid project id');
  if(p.caseStudyPath!=='/projects/'+p.id+'/')throw new Error('Invalid case path');
  if(!Object.hasOwn(kindLabels,p.kind))throw new Error('Invalid project kind');
  for(const field of ['title','summary','liveActionLabel','problem','implementation','note'])text(p[field],field);
  for(const key of ['capabilities','walkthrough','repositoryUrls','evidence']){
    if(!Array.isArray(p[key])||!p[key].length)throw new Error('Missing '+key);
    p[key].forEach(v=>text(v,key));
  }
  validateImage(p.image);
  checkedURL(p.liveUrl,LIVE_HOSTS);
  p.repositoryUrls.forEach(u=>checkedURL(u,new Set(['github.com'])));
  if(p.featuredOrder!==null&&(!Number.isInteger(p.featuredOrder)||p.featuredOrder<1))throw new Error('Invalid featured order');
}
export function publishedProjects(records) {
  if(!Array.isArray(records))throw new Error('Invalid catalogue');
  const ids=new Set(),ranks=new Set();
  return records.filter(p=>{
    if(!p||!['draft','published'].includes(p.publishState))throw new Error('Invalid publication state');
    if(p.publishState==='draft')return false;
    validateProject(p);
    if(ids.has(p.id))throw new Error('Duplicate project');
    ids.add(p.id);
    if(p.featuredOrder!==null){
      if(ranks.has(p.featuredOrder))throw new Error('Duplicate featured order');
      ranks.add(p.featuredOrder);
    }
    return true;
  });
}
export const featuredProjects = records => publishedProjects(records).filter(p=>p.featuredOrder!==null).sort((a,b)=>a.featuredOrder-b.featuredOrder).slice(0,3);
export function imageHTML(image, className='') {
  validateImage(image);
  return '<img class="'+escapeHTML(className)+'" src="'+escapeHTML(image.src)+'" alt="'+escapeHTML(image.alt)+'" width="'+image.width+'" height="'+image.height+'" loading="lazy" decoding="async">';
}
const listHTML = values => '<ul>'+values.map(v=>'<li>'+escapeHTML(v)+'</li>').join('')+'</ul>';
export function projectCardHTML(record) {
  const p=publishedProjects([record])[0];if(!p)return '';
  return '<article class="showcase-project" data-project="'+p.id+'"><a class="showcase-preview" href="'+p.caseStudyPath+'" aria-label="View '+escapeHTML(p.title)+' project">'+imageHTML(p.image)+'</a><div class="showcase-project-copy"><h3><a href="'+p.caseStudyPath+'">'+escapeHTML(p.title)+'</a></h3><p class="showcase-kind">'+kindLabels[p.kind]+'</p><p>'+escapeHTML(p.summary)+'</p>'+listHTML(p.capabilities)+'<div class="showcase-actions"><a href="'+p.caseStudyPath+'">View project<span class="sr-only">: '+escapeHTML(p.title)+'</span> &rarr;</a><a href="'+escapeHTML(p.liveUrl)+'">'+escapeHTML(p.liveActionLabel)+'<span class="sr-only">: '+escapeHTML(p.title)+'</span> &nearr;</a></div></div></article>';
}
export function selectedProjectsHTML(records) {
  return '<section id="projects" class="hx-section showcase-selected" aria-labelledby="projectsTitle"><div class="hx-container"><header class="cb-head"><h2 id="projectsTitle">Explore what we’ve built</h2><p>Booking experiences, a live store and a learning product. Different problems, working interfaces you can explore.</p></header><div class="showcase-selected-grid">'+featuredProjects(records).map(projectCardHTML).join('')+'</div><div class="showcase-return"><a href="/projects/">See all projects &rarr;</a><a class="hx-btn hx-btn-primary" href="/onboarding/">Start your free trial</a></div></div></section>';
}
export function projectIndexHTML(records) {
 return '<section class="hx-section"><div class="hx-container"><header class="cb-head"><h1>Work you can explore</h1><p>Owned products, a live store and clearly labelled demonstrations. Inspect what was built, then explore the interface.</p></header><div class="showcase-index">'+publishedProjects(records).map(projectCardHTML).join('')+'</div>'+trialHTML()+'</div></section>';
}
function trialHTML() {
 return '<aside class="showcase-return" aria-label="Try BytesFX"><div><h2>Turn your website’s questions into leads</h2><p>Explore BytesFX’s own chat-to-sales workflow, or start your free trial.</p><a href="/ai-chatbot/">See the chatbot &rarr;</a></div><a class="hx-btn hx-btn-primary" href="/onboarding/">Start your free trial</a></aside>';
}
export function projectCaseHTML(record) {
 const p=publishedProjects([record])[0];if(!p)return '';
 return '<section class="hx-section showcase-case"><div class="hx-container"><a href="/projects/" class="showcase-back">&larr; All projects</a><header class="cb-head"><h1>'+escapeHTML(p.title)+'</h1><p class="showcase-kind">'+kindLabels[p.kind]+'</p><p>'+escapeHTML(p.summary)+'</p></header><figure class="showcase-case-image">'+imageHTML(p.image)+'<figcaption>Actual public interface, captured November 2026.</figcaption></figure><div class="showcase-case-body"><section><h2>The problem</h2><p>'+escapeHTML(p.problem)+'</p><h2>What we built</h2><p>'+escapeHTML(p.implementation)+'</p><h2>Explore the workflow</h2><ol>'+p.walkthrough.map(s=>'<li>'+escapeHTML(s)+'</li>').join('')+'</ol></section><aside><h2>What you can inspect</h2>'+listHTML(p.capabilities)+'<p>'+escapeHTML(p.note)+'</p><a class="hx-btn hx-btn-primary" href="'+escapeHTML(p.liveUrl)+'">'+escapeHTML(p.liveActionLabel)+' &nearr;</a><h2>Technical work</h2>'+p.repositoryUrls.map((u,i)=>'<p><a href="'+escapeHTML(u)+'">View repository'+(p.repositoryUrls.length>1?' '+(i+1):'')+' on GitHub &nearr;</a></p>').join('')+'</aside></div>'+trialHTML()+'</div></section>';
}
export function productProofHTML(plans) {
 const paid=plans.plans.filter(p=>p.aiFollowUps).map(p=>p.name);
 const gate='AI email follow-ups are included in the '+plans.trial.days+'-day trial and '+paid.join(', ')+' plans. Email delivery requires your sender setup; reply tracking requires email routing.';
 return '<section id="product-workflow" class="hx-section showcase-proof" aria-labelledby="pipelineTitle"><div class="hx-container"><header class="cb-head"><h2 id="pipelineTitle">One conversation. A clear path to the sale.</h2><p>Your BytesFX dashboard connects the chat, the contact and the next step. Keep leads moving, review proposals and record the outcome.</p></header><figure class="showcase-pipeline">'+imageHTML({src:'/projects/bytesfx-pipeline.png',alt:'Actual BytesFX dashboard with Inbox, Priority, Opportunity, Campaigns and Closed columns, using invented contacts and amounts',width:1440,height:1000})+'<figcaption>Actual BytesFX interface · synthetic sample data. Contacts, budgets and Won/Lost outcomes are examples, not customer results. <a href="/projects/bytesfx-pipeline.png">Open full-size pipeline screenshot</a>.</figcaption></figure><ol class="showcase-workflow"><li><h3>Chat and capture</h3><p>The chatbot collects a name and email. Each lead’s verification status is visible in the dashboard.</p></li><li><h3>Choose the next step</h3><p>Move leads through Inbox, Priority, Opportunity and Campaigns. Record Won or Lost in Closed.</p></li><li><h3>Review before sending</h3><p>Check the proposal, fill in any blanks and decide when to send. A positive reply is yours to confirm before marking Won.</p></li></ol><details class="showcase-details"><summary>See the lead and proposal screens</summary><div class="showcase-screen-pair"><figure>'+imageHTML({src:'/projects/bytesfx-lead.png',alt:'Actual BytesFX lead drawer showing an unverified example.com contact and manual outcome controls',width:460,height:1000})+'<figcaption>Lead details and verification status. Sample contact only.</figcaption></figure><figure>'+imageHTML({src:'/projects/bytesfx-proposal.png',alt:'Actual BytesFX proposal editor with a draft labelled Needs your review and an example investment',width:460,height:1000})+'<figcaption>AI draft for human review. Example scope and price; no email sent.</figcaption></figure></div></details><p class="showcase-plan-note">'+escapeHTML(gate)+' The Free plan keeps lead management with its existing limits; AI replies and AI follow-ups end when the trial ends.</p></div></section>';
}
