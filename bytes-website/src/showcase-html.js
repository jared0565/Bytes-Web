// Build-time renderer. Catalogue records are trusted editorial data, validated at the publication boundary.
import { escapeHTML } from './html-text.js';
import { validateWorkflow, workflowHTML } from './showcase-flow.js';
export { escapeHTML } from './html-text.js';
export const kindLabels = Object.freeze({'owned-product':'Owned product','live-store':'Live store','demonstration':'Demonstration','platform':'Platform'});
const LIVE_HOSTS = new Set(['web.bytesfx.com','pivotparlor.com','activepaw.co.uk','learn.bytesai.uk','cafe.bytesfx.com','file-converter.bmorris0565.workers.dev']);
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
  for(const key of ['capabilities','deliveryScope','walkthrough','repositoryUrls','evidence']){
    if(!Array.isArray(p[key])||!p[key].length)throw new Error('Missing '+key);
    p[key].forEach(v=>text(v,key));
  }
  validateImage(p.image);
  validateWorkflow(p.workflow);
  if(!Array.isArray(p.sections)||p.sections.length<1||p.sections.length>6)throw new Error('Invalid project sections');
  for(const section of p.sections){
    if(!section||typeof section!=='object')throw new Error('Invalid project section');
    text(section.title,'section title');text(section.body,'section body');
  }
  checkedURL(p.liveUrl,LIVE_HOSTS);
  if(p.imageCaption!==undefined)text(p.imageCaption,'image caption');
  if(p.example!==undefined){
    if(!p.example||typeof p.example!=='object')throw new Error('Invalid project example');
    for(const field of ['title','caption','actionLabel'])text(p.example[field],'example '+field);
    validateImage(p.example.image);
    checkedURL(p.example.url,LIVE_HOSTS);
  }
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
export function projectCardHTML(record, headingLevel=3) {
  if(![2,3].includes(headingLevel))throw new Error('Invalid heading level');
  const p=publishedProjects([record])[0];if(!p)return '';
  return '<article class="showcase-project" data-project="'+p.id+'"><a class="showcase-preview" href="'+p.caseStudyPath+'" aria-label="View '+escapeHTML(p.title)+' project">'+imageHTML(p.image)+'</a><div class="showcase-project-copy"><h'+headingLevel+'><a href="'+p.caseStudyPath+'">'+escapeHTML(p.title)+'</a></h'+headingLevel+'><p class="showcase-kind">'+kindLabels[p.kind]+'</p><p>'+escapeHTML(p.summary)+'</p>'+listHTML(p.capabilities)+(p.id==='bytesfx'?'<p class="showcase-sample">Interface shown with synthetic sample data.</p>':'')+'<div class="showcase-actions"><a href="'+p.caseStudyPath+'">View project<span class="sr-only">: '+escapeHTML(p.title)+'</span> &rarr;</a><a href="'+escapeHTML(p.liveUrl)+'">'+escapeHTML(p.liveActionLabel)+'<span class="sr-only">: '+escapeHTML(p.title)+'</span> &nearr;</a></div></div></article>';
}
export function selectedProjectsHTML(records) {
  return '<section id="projects" class="hx-section showcase-selected" aria-labelledby="projectsTitle"><div class="hx-container"><header class="showcase-heading"><div><p class="showcase-kicker">Built by BytesFX</p><h2 id="projectsTitle">What we’ve built</h2><p>Platforms, commerce automation and learning tools. Explore a few examples of our work.</p></div><a class="showcase-all" href="/projects/">Explore Our Work &rarr;</a></header><div class="showcase-selected-grid">'+featuredProjects(records).map(projectPreviewHTML).join('')+'</div></div></section>';
}
function projectPreviewHTML(p) {
  return '<article class="showcase-project" data-project="'+p.id+'"><a class="showcase-preview" href="'+p.caseStudyPath+'" aria-label="View '+escapeHTML(p.title)+' project">'+imageHTML(p.image)+'</a><div class="showcase-project-copy"><p class="showcase-kind">'+kindLabels[p.kind]+'</p><h3><a href="'+p.caseStudyPath+'">'+escapeHTML(p.title)+'</a></h3><p>'+escapeHTML(p.summary)+'</p><a class="showcase-all" href="'+p.caseStudyPath+'">View project<span class="sr-only">: '+escapeHTML(p.title)+'</span> &rarr;</a></div></article>';
}
export function projectIndexHTML(records) {
 const published=publishedProjects(records);
 const flagship=published.find(p=>p.id==='bytesfx');
 return '<section class="hx-section"><div class="hx-container"><header class="cb-head"><p class="showcase-kicker">Built by BytesFX</p><h1>What we’ve built</h1><p>From the first design to the live application, we own the complete development process. Explore our products, a live store and working demonstrations.</p></header>'+(flagship?'<div class="showcase-flagship" aria-label="Featured project">'+projectCardHTML(flagship,2)+'</div>':'')+'<header class="showcase-heading"><h2>More work to explore</h2><p>Open a project to see what we built, or explore the live interface.</p></header><div class="showcase-index">'+published.filter(p=>p.id!=='bytesfx').map(p=>projectCardHTML(p)).join('')+'</div>'+projectEnquiryHTML()+'</div></section>';
}
function projectEnquiryHTML() {
 return '<aside class="showcase-return" aria-label="Discuss a project"><div><h2>What would you like to build?</h2><p>Tell us about your business and the workflow you want to improve.</p></div><a class="hx-btn hx-btn-primary" href="/#contact">Discuss your project &rarr;</a></aside>';
}
function trialHTML() {
 return '<aside class="showcase-return" aria-label="Try BytesFX"><div><h2>Turn your website’s questions into leads</h2><p>Explore BytesFX’s own chat-to-sales workflow, or start your free trial.</p><a href="/ai-chatbot/">See the chatbot &rarr;</a></div><a class="hx-btn hx-btn-primary" href="/onboarding/">Start your free trial</a></aside>';
}
function projectExampleHTML(p) {
 const example=p.example;
 if(!example)return '';
 return '<section class="showcase-case-screens"><h2>'+escapeHTML(example.title)+'</h2><figure class="showcase-case-image">'+imageHTML(example.image)+'<figcaption>'+escapeHTML(example.caption)+'</figcaption></figure><a class="showcase-all" href="'+escapeHTML(example.url)+'">'+escapeHTML(example.actionLabel)+' &nearr;</a></section>';
}
function bytesfxScreensHTML() {
  const lead = {src:'/projects/bytesfx-lead.png', alt:'BytesFX lead details with an invented example.com contact', width:460, height:1000};
  const proposal = {src:'/projects/bytesfx-proposal.png', alt:'BytesFX proposal editor showing an AI draft that needs human review', width:460, height:1000};
  return `<div class="showcase-case-screens">
    <h2>The lead and proposal screens</h2>
    <p>Actual interfaces with synthetic sample data. No customer contact details or sales results are shown.</p>
    <div class="showcase-screen-pair">
      <figure>${imageHTML(lead)}<figcaption>Lead details and verification status.</figcaption></figure>
      <figure>${imageHTML(proposal)}<figcaption>Proposal draft for review before sending.</figcaption></figure>
    </div>
  </div>`;
}

export function projectCaseHTML(record) {
  const p = publishedProjects([record])[0];
  if (!p) return '';
  const isBytesFX = p.id === 'bytesfx';
  const caption = p.imageCaption || 'Actual public interface, captured November 2026.';
  const sections = p.sections.map(section => `<section class="showcase-scope-section">
    <h3>${escapeHTML(section.title)}</h3><p>${escapeHTML(section.body)}</p>
  </section>`).join('');
  return `<section class="hx-section showcase-case"><div class="hx-container">
    <a href="/projects/" class="showcase-back">&larr; Our Work</a>
    <header class="cb-head">
      <p class="showcase-kicker">Built by BytesFX</p>
      <h1>${escapeHTML(p.title)}</h1>
      <p class="showcase-kind">${kindLabels[p.kind]}</p>
      <p>${escapeHTML(p.summary)}</p>
    </header>
    <figure class="showcase-case-image">${imageHTML(p.image)}<figcaption>${escapeHTML(caption)}</figcaption></figure>
    <div class="showcase-case-body">
      <section>
        <h2>The problem</h2><p>${escapeHTML(p.problem)}</p>
        <h2>What we built</h2><p>${escapeHTML(p.implementation)}</p>
        ${sections}
        <h2>Our delivery scope</h2>
        <p>BytesFX led the complete delivery, from design and development to integration and deployment.</p>
        ${listHTML(p.deliveryScope)}
      </section>
      <aside>
        <h2>Project capabilities</h2>${listHTML(p.capabilities)}
        <p>${escapeHTML(p.note)}</p>
        <a class="hx-btn hx-btn-primary" href="${escapeHTML(p.liveUrl)}">${escapeHTML(p.liveActionLabel)} &nearr;</a>
        <h2>Explore this project</h2>
        <ol>${p.walkthrough.map(item => '<li>'+escapeHTML(item)+'</li>').join('')}</ol>
      </aside>
    </div>
    ${workflowHTML(p.workflow)}
    ${projectExampleHTML(p)}
    ${isBytesFX ? bytesfxScreensHTML() + trialHTML() : projectEnquiryHTML()}
  </div></section>`;
}

export function productProofHTML(plans) {
 const paid=plans.plans.filter(p=>p.aiFollowUps).map(p=>p.name);
 const gate='AI email follow-ups are included in the '+plans.trial.days+'-day trial and '+paid.join(', ')+' plans. Email delivery requires your sender setup; reply tracking requires email routing.';
 return '<section id="product-workflow" class="hx-section showcase-proof" aria-labelledby="pipelineTitle"><div class="hx-container"><header class="cb-head"><h2 id="pipelineTitle">One conversation. A clear path to the sale.</h2><p>Your BytesFX dashboard connects the chat, the contact and the next step. Keep leads moving, review proposals and record the outcome.</p></header><figure class="showcase-pipeline">'+imageHTML({src:'/projects/bytesfx-pipeline.png',alt:'Actual BytesFX dashboard with Inbox, Priority, Opportunity, Campaigns and Closed columns, using invented contacts and amounts',width:1440,height:1000})+'<figcaption>Actual BytesFX interface · synthetic sample data. Contacts, budgets and Won/Lost outcomes are examples, not customer results. <a href="/projects/bytesfx-pipeline.png">Open full-size pipeline screenshot</a>.</figcaption></figure><ol class="showcase-workflow"><li><h3>Chat and capture</h3><p>The chatbot collects a name and email. Each lead’s verification status is visible in the dashboard.</p></li><li><h3>Choose the next step</h3><p>Move leads through Inbox, Priority, Opportunity and Campaigns. Record Won or Lost in Closed.</p></li><li><h3>Review before sending</h3><p>Check the proposal, fill in any blanks and decide when to send. A positive reply is yours to confirm before marking Won.</p></li></ol><details class="showcase-details"><summary>See the lead and proposal screens</summary><div class="showcase-screen-pair"><figure>'+imageHTML({src:'/projects/bytesfx-lead.png',alt:'Actual BytesFX lead drawer showing an unverified example.com contact and manual outcome controls',width:460,height:1000})+'<figcaption>Lead details and verification status. Sample contact only. <a href="/projects/bytesfx-lead.png">Open full-size lead screenshot</a>.</figcaption></figure><figure>'+imageHTML({src:'/projects/bytesfx-proposal.png',alt:'Actual BytesFX proposal editor with a draft labelled Needs your review and an example investment',width:460,height:1000})+'<figcaption>AI draft for human review. Example scope and price; no email sent. <a href="/projects/bytesfx-proposal.png">Open full-size proposal screenshot</a>.</figcaption></figure></div></details><p class="showcase-plan-note">'+escapeHTML(gate)+' The Free plan keeps lead management with its existing limits; AI replies and AI follow-ups end when the trial ends.</p></div></section>';
}
