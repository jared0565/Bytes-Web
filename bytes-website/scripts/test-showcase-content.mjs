import test from 'node:test';
import assert from 'node:assert/strict';
import {projects} from '../src/showcase-content.js';
import {publishedProjects,featuredProjects,projectCardHTML,projectCaseHTML,projectIndexHTML,kindLabels} from '../src/showcase-html.js';
const sample=()=>structuredClone(projects.find(p=>p.id==='pivot-parlor'));
test('draft content never reaches published records or featured order',()=>{
 assert.equal(publishedProjects(projects).length,6);
 assert.deepEqual(featuredProjects(projects).map(p=>p.id),['pivot-parlor','active-paw','bytesai-learning']);
 assert.equal(projectCardHTML({...sample(),publishState:'draft'}),'');
});
test('featured records are ordered independently of input order',()=>{
 assert.deepEqual(featuredProjects([...projects].reverse()).map(p=>p.id),['pivot-parlor','active-paw','bytesai-learning']);
});
test('untrusted protocols, hosts, credentials and ports fail closed',()=>{
 for(const url of ['javascript:alert(1)','http://pivotparlor.com/','https://evil.example/','https://user:pass@pivotparlor.com/','https://pivotparlor.com:444/']){
  const p=sample();p.liveUrl=url;assert.throws(()=>publishedProjects([p]),/URL/);
 }
 const p=sample();p.repositoryUrls=['https://evil.example/repo'];assert.throws(()=>publishedProjects([p]),/URL/);
});
test('HTML escapes all editorial text and attribute characters',()=>{
 const p=sample();p.title='A <script> & "quote"';p.image.alt='"><img src=x onerror=alert(1)>';p.summary="a'b";
 const html=projectCardHTML(p);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&amp;'));assert.ok(html.includes('&quot;'));
 assert.ok(html.includes('&#39;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('alt=""><img'));
});
test('missing image metadata, unsafe paths and invalid publication states fail closed',()=>{
 for(const edit of [p=>delete p.image.alt,p=>p.image.width=0,p=>p.image.height=NaN,p=>p.image.src='/projects/../secret.png',p=>p.caseStudyPath='/projects/other/',p=>p.publishState='pending',p=>p.kind='client',p=>p.example.url='javascript:alert(1)',p=>p.example.image.src='/projects/../secret.png',p=>delete p.example.caption]){
  const p=sample();edit(p);assert.throws(()=>publishedProjects([p]));
 }
});
test('duplicate routes and featured ranks cannot produce ambiguous pages',()=>{
 const p=sample();assert.throws(()=>publishedProjects([p,p]));
 const q=structuredClone(projects.find(p=>p.id==='active-paw'));q.featuredOrder=p.featuredOrder;assert.throws(()=>publishedProjects([p,q]));
});
test('kind labels distinguish demonstrations and owned work',()=>{
 assert.deepEqual(kindLabels,{'owned-product':'Owned product','live-store':'Live store','demonstration':'Demonstration','platform':'Platform'});
 for(const p of projects.filter(p=>p.publishState==='published'))assert.ok(projectCardHTML(p).includes(kindLabels[p.kind]));
});

test('ownership is explicit and full delivery scope is required and escaped',()=>{
 const p=sample();
 delete p.deliveryScope;
 assert.throws(()=>publishedProjects([p]),/deliveryScope/);
 p.deliveryScope=['Design <script>'];
 const html=projectCaseHTML(p);
 assert.ok(html.includes('Built by BytesFX'));
 assert.ok(html.includes('complete delivery'));
 assert.ok(html.includes('Design &lt;script&gt;'));
 assert.ok(html.includes('href="/#contact"'));
});

test('the catalogue leads with the owned BytesFX system and labels sample data',()=>{
 const html=projectIndexHTML(projects);
 assert.ok(html.indexOf('data-project="bytesfx"')<html.indexOf('data-project="pivot-parlor"'));
 const detail=projectCaseHTML(projects.find(p=>p.id==='bytesfx'));
 assert.ok(detail.includes('Synthetic sample data'));
 assert.ok(detail.includes('href="/onboarding/"'));
});

test('every published case has system scope and a readable, escaped workflow',()=>{
 for(const p of publishedProjects(projects)){
  const html=projectCaseHTML(p);
  assert.ok(html.includes('aria-label="Project workflow"'),p.id);
  assert.equal((html.match(/class="showcase-flow-lane"/g)||[]).length,p.workflow.lanes.length,p.id);
  assert.ok(html.includes('Our delivery scope'),p.id);
 }
 const p=sample();
 p.workflow.lanes[0].steps[0].title='<img src=x onerror=alert(1)>';
 p.sections[0].body='<script>alert(1)</script>';
 const html=projectCaseHTML(p);
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(!html.includes('<script>alert'));
});

test('malformed or excessive workflow data cannot publish',()=>{
 for(const edit of [
  p=>delete p.workflow,
  p=>p.workflow.lanes=[],
  p=>p.workflow.lanes[0].steps=[{}],
  p=>p.workflow.lanes[0].steps=Array(6).fill(p.workflow.lanes[0].steps[0]),
  p=>p.workflow.lanes[0].steps[0].ownerAction='false',
  p=>p.sections=[null],
 ]){
  const p=sample();edit(p);assert.throws(()=>publishedProjects([p]));
 }
});

const screenItem=caption=>({image:{src:'/projects/pivot-till.png',alt:'Till screen',width:1440,height:1000},caption});
const withScreens=()=>{const p=sample();p.screens={title:'Inside the workspace',intro:'Sample data only.',items:[screenItem('First'),screenItem('Second')]};return p;};

test('optional workspace screens render escaped, in order',()=>{
 const p=withScreens();
 p.screens.title='Inside <b>';p.screens.intro='Sample & data';p.screens.items[0].caption='<script>x</script>';
 const html=projectCaseHTML(p);
 assert.equal((html.match(/class="showcase-screen-grid"/g)||[]).length,1);
 assert.ok(html.includes('Inside &lt;b&gt;'));
 assert.ok(html.includes('Sample &amp; data'));
 assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
 assert.ok(!html.includes('<script>x'));
 assert.equal((html.match(/<figure><img/g)||[]).length,2);
 assert.ok(html.indexOf('class="showcase-screen-grid"')>html.indexOf('class="showcase-flow'));
});

test('records without screens render no screen grid',()=>{
 const html=projectCaseHTML(projects.find(p=>p.id==='active-paw'));
 assert.ok(html.includes('Our delivery scope'));
 assert.ok(!html.includes('showcase-screen-grid'));
});

test('malformed screens fail closed',()=>{
 assert.equal(publishedProjects([withScreens()]).length,1);
 for(const edit of [
  p=>p.screens=null,
  p=>p.screens.items=[],
  p=>p.screens.items=[screenItem('Only')],
  p=>p.screens.items=Array.from({length:7},(_,i)=>screenItem('Item '+i)),
  p=>p.screens.items[0].image.src='/projects/../x.png',
  p=>delete p.screens.items[0].caption,
  p=>delete p.screens.title,
  p=>delete p.screens.intro,
 ]){
  const p=withScreens();edit(p);assert.throws(()=>publishedProjects([p]));
 }
});
