// The AI chatbot page's questions and its structured data, built from plans.json at build time
// (vite.config.js). Plain strings with no browser code. Every answer must stay true: the plans,
// limits and trial come from plans.json, the rest from how the product works today.

const PAGE = 'https://web.bytesfx.com/ai-chatbot/';

// Each answer is [text, html]: the text goes to the structured data, the html is shown on the page
function questions(data) {
  const free = data.plans.find(p => p.price === 0);
  const m = data.modes;
  return [
    ['Do I need a card to start?',
      `No. ${data.trial.summary}`],
    ['What happens when the trial ends?',
      `Your chatbot keeps working on the Free plan: the guided ${m.scripted.name} chatbot on ${free.domains} website${free.domains === 1 ? '' : 's'}, with the "Powered by BytesFX" badge. Choose a paid plan to keep AI replies and AI email follow-ups.`],
    ['Will it work on my website?',
      'Yes, if you can add a line of code to your site. You paste one script tag, and the chat appears on your pages. Custom sites and most site builders allow it.'],
    [`What is the difference between ${m.scripted.name}, ${m.ai.name} and ${m.ai_plus.name}?`,
      `The ${m.scripted.name} chatbot ${m.scripted.summary}. The ${m.ai.name} chatbot ${m.ai.summary}. ${m.ai_plus.name} is ${m.ai_plus.summary}.`],
    ['Where do my leads go?',
      'Into your dashboard, together with the chat that produced each one, and it can email you an alert for every new lead. On paid plans the AI can also follow up with them by email.'],
    ['Can I change or cancel my plan?',
      'Yes. Tell us what you would like and the team will reply within 24 hours to change or cancel it. If you cancel, your chatbot carries on with the Free plan.'],
    ["How is my visitors' data handled?",
      ['Chats and leads are kept for your account and shown in your dashboard. Our privacy policy explains what is kept and why, and anyone can ask for their data to be deleted.',
        'Chats and leads are kept for your account and shown in your dashboard. Our <a href="/privacy-policy.html">privacy policy</a> explains what is kept and why, and anyone can <a href="/data-deletion.html">ask for their data to be deleted</a>.']],
  ].map(([q, a]) => ({ q, text: Array.isArray(a) ? a[0] : a, html: Array.isArray(a) ? a[1] : a }));
}

export function faqHTML(data) {
  return questions(data).map(({ q, html }) => `
          <details class="cb-faq-item">
            <summary>${q}</summary>
            <p>${html}</p>
          </details>`).join('');
}

// What search engines and AI tools read about the page: the product, its offers and the questions shown.
// No ratings until there are real reviews.
export function chatbotStructuredData(data) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'BytesFX AI Chatbot',
        url: PAGE,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: "An AI chatbot for your website that answers visitors' questions, finds out what they need and sends you the lead.",
        publisher: { '@type': 'Organization', name: 'BytesFX', url: 'https://web.bytesfx.com/' },
        offers: data.plans.filter(p => p.price !== null).map(p => ({
          '@type': 'Offer',
          name: p.name,
          price: p.price,
          priceCurrency: 'USD',
          description: p.tagline,
          url: `${PAGE}#pricing`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: questions(data).map(({ q, text }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text },
        })),
      },
    ],
  };
}
