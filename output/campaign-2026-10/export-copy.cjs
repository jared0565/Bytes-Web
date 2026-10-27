'use strict';
// Rebuild portable captions from the reviewed campaign copy; no dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {}, URL };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'campaign.js'), 'utf8'), context);
const posts = context.window.CAMPAIGN.map(post => ({
  ...post,
  width: post.platform === 'LinkedIn' ? 1200 : 1080,
  height: post.platform === 'LinkedIn' ? 1200 : 1350,
  organicUrl: context.window.campaignUrl(post),
  paidUrl: context.window.campaignUrl(post, 'paid_social'),
  caption: post.caption.replace('{url}', context.window.campaignUrl(post)),
  image: `assets/${post.id}.png`
}));
fs.writeFileSync(path.join(__dirname, 'posts.json'), JSON.stringify(posts, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'captions.md'), '# BytesFX campaign captions\n\nProposed · not published\n\n' + posts.map(post =>
  `## ${post.id} — ${post.platform}\n\nImage: ${post.image} (${post.width} × ${post.height})\n\n${post.caption}\n\n**Optional paid headline:** ${post.headline}\n\n**Image description:** ${post.alt}\n\n**Paid URL:** ${post.paidUrl}\n`
).join('\n'));
console.log(`Exported ${posts.length} captions and tracked links.`);
