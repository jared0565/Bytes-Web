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
 for(const edit of [p=>delete p.image.alt,p=>p.image.width=0,p=>p.image.height=NaN,p=>p.image.src='/projects/../secret.png',p=>p.caseStudyPath='/projects/other/',p=>p.publishState='pending',p=>p.kind='client']){
  const p=sample();edit(p);assert.throws(()=>publishedProjects([p]));
 }
});
test('duplicate routes and featured ranks cannot produce ambiguous pages',()=>{
 const p=sample();assert.throws(()=>publishedProjects([p,p]));
 const q=structuredClone(projects[1]);q.featuredOrder=p.featuredOrder;assert.throws(()=>publishedProjects([p,q]));
});
test('kind labels distinguish demonstrations and owned work',()=>{
 assert.deepEqual(kindLabels,{'owned-product':'Owned product','live-store':'Live store','demonstration':'Demonstration'});
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
