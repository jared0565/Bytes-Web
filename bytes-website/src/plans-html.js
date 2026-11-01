// The chatbot plan cards, built from plans.json. Plain strings with no browser code, so the build writes
// them straight into the AI chatbot page's HTML (vite.config.js): search engines and AI tools read the
// prices without running a script, and the page can never show a price plans.json doesn't have.

const fmtNum = (n) => Number(n).toLocaleString('en-GB');

function planPrice(data, p) {
  if (p.price === null) return '<span class="hx-price-num">Custom</span>';
  return `<span class="hx-price-num">${data.currency}${p.price}</span><span class="hx-price-per">${p.price === 0 ? 'forever' : '/ month'}</span>`;
}

function planFeatures(data, p) {
  const mode = data.modes[p.mode];
  const yes = (t) => `<li>${t}</li>`;
  const no = (t) => `<li class="is-off"><span class="sr-only">Not included: </span>${t}</li>`;
  return [
    yes(`<strong>${mode.name} chatbot</strong>: ${mode.summary}`),
    yes(`${fmtNum(mode.dailyMessages)} chatbot messages a day`),
    yes(p.domains === -1 ? 'Unlimited websites' : `${p.domains} website${p.domains === 1 ? '' : 's'}`),
    yes(p.leadsPerDay == null ? 'Unlimited leads in your dashboard' : `${p.leadsPerDay} leads a day, ${p.contacts} contacts`),
    p.aiFollowUps ? yes('AI email follow-ups, proposals and campaigns') : no('AI email campaigns'),
    p.removeBadge ? yes('Remove the “Powered by BytesFX” badge') : no('Remove the “Powered by BytesFX” badge'),
    p.whiteLabel ? yes('Custom bot name, colour and avatar') : no('Custom bot name, colour and avatar'),
    ...(p.mode === 'ai_plus' ? [yes('Premium AI models')] : []),
  ].join('');
}

// Free starts the free plan, which comes with the AI trial. A paid plan goes to the homepage's contact form
// with the plan filled in (the page adds the client id when the visitor came from the dashboard), until
// checkout is online.
function planButton(data, p) {
  if (p.price === 0) return `<a href="/onboarding/" class="hx-btn hx-btn-ghost hx-btn-full">Start free</a><p class="hx-plan-trial">Includes a ${data.trial.days}-day AI trial</p>`;
  return `<a href="/?plan=${p.id}#contact" class="hx-btn ${p.featured ? 'hx-btn-primary' : 'hx-btn-ghost'} hx-btn-full">Choose ${p.name}</a>`;
}

export function planCards(data) {
  const cards = data.plans.filter(p => p.price !== null);
  const ent = data.plans.find(p => p.price === null);
  return `
        <div class="hx-plans">
          ${cards.map((p, i) => `
          <article class="hx-plan reveal${p.featured ? ' is-featured' : ''}" data-plan="${p.id}" style="--d:${i}">
            ${p.featured ? '<p class="hx-plan-badge">Recommended</p>' : ''}
            <h3>${p.name}</h3>
            <p class="hx-price">${planPrice(data, p)}</p>
            <p class="hx-plan-tag">${p.tagline}</p>
            ${planButton(data, p)}
            <ul class="hx-plan-list">${planFeatures(data, p)}</ul>
          </article>`).join('')}
        </div>
        ${ent ? `
        <article class="hx-plan hx-plan-wide reveal" data-plan="${ent.id}">
          <div>
            <h3>${ent.name}</h3>
            <p class="hx-plan-tag">${ent.tagline}</p>
          </div>
          <ul class="hx-plan-list hx-plan-list-inline">${planFeatures(data, ent)}</ul>
          <a href="/?plan=${ent.id}#contact" class="hx-btn hx-btn-ghost">Talk to us</a>
        </article>` : ''}
        <p class="hx-plan-note">Prices in US dollars. Choose a plan and the team will reply within 24 hours to set it up.</p>`;
}
