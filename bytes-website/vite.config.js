import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planCards } from './src/plans-html.js';
import { faqHTML, chatbotStructuredData } from './src/chatbot-content.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// The AI chatbot page is plain HTML, so search engines and AI tools can read all of it without running a
// script. Its plans, questions and structured data are written in here, from plans.json, on every build
// and in the dev server, so the page can't drift from the plans (scripts/check-chatbot-page.mjs checks it).
function chatbotPage() {
  return {
    name: 'bytesfx-chatbot-page',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.filename.replace(/\\/g, '/').endsWith('/ai-chatbot/index.html')) return html;
        const data = JSON.parse(readFileSync(here('./public/plans.json'), 'utf8'));
        const ld = JSON.stringify(chatbotStructuredData(data)).replace(/</g, '\\u003c');
        const values = {
          trialDays: data.trial.days,
          trialSummary: data.trial.summary,
          currency: data.currency,
          fromPrice: Math.min(...data.plans.filter((p) => p.price > 0).map((p) => p.price)), // the lowest paid plan
        };
        return html
          .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in values ? String(values[k]) : m))
          .replace('<!--@plans-->', planCards(data))
          .replace('<!--@faq-->', faqHTML(data))
          .replace('<!--@ld-->', `<script type="application/ld+json">${ld}</script>`);
      },
    },
  };
}

export default defineConfig({
  plugins: [chatbotPage()],
  build: {
    rollupOptions: {
      input: {
        main: here('./index.html'),
        chatbot: here('./ai-chatbot/index.html'),
      },
    },
  },
});
