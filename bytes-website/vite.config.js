import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { projects } from './src/showcase-content.js';
import { productProofHTML, selectedProjectsHTML, publishedProjects, projectCaseHTML, projectIndexHTML } from './src/showcase-html.js';
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
        const filename = ctx.filename.replace(/\\/g, '/');
        if (filename === here('./index.html').replace(/\\/g, '/')) return html.replace('<!--@home-projects-->', selectedProjectsHTML(projects));
        if (filename.endsWith('/projects/index.html')) return html.replace('<!--@project-page-->', projectIndexHTML(projects));
        const project = publishedProjects(projects).find(p => filename.endsWith(p.caseStudyPath + 'index.html'));
        if (project) return html.replace('<!--@project-page-->', projectCaseHTML(project));
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
          .replace('<!--@product-proof-->', productProofHTML(data))
          .replace('<!--@selected-projects-->', selectedProjectsHTML(projects))
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
        projects: here('./projects/index.html'),
        bytesfx: here('./projects/bytesfx/index.html'),
        'pivot-parlor': here('./projects/pivot-parlor/index.html'),
        'active-paw': here('./projects/active-paw/index.html'),
        'bytesai-learning': here('./projects/bytesai-learning/index.html'),
        'cafe-bookings': here('./projects/cafe-bookings/index.html'),
        'file-converter': here('./projects/file-converter/index.html'),
      },
    },
  },
});
