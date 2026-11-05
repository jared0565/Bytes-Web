import { escapeHTML } from './html-text.js';

function requireText(value, name, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) {
    throw new Error('Invalid workflow ' + name);
  }
}

export function validateWorkflow(workflow) {
  if (!workflow || typeof workflow !== 'object') throw new Error('Missing workflow');
  requireText(workflow.title, 'title', 120);
  requireText(workflow.description, 'description', 600);
  if (!Array.isArray(workflow.lanes) || workflow.lanes.length < 1 || workflow.lanes.length > 4) {
    throw new Error('Invalid workflow lanes');
  }
  for (const lane of workflow.lanes) {
    if (!lane || typeof lane !== 'object') throw new Error('Invalid workflow lane');
    requireText(lane.title, 'lane title', 120);
    if (!Array.isArray(lane.steps) || lane.steps.length < 2 || lane.steps.length > 5) {
      throw new Error('Invalid workflow steps');
    }
    for (const step of lane.steps) {
      if (!step || typeof step !== 'object') throw new Error('Invalid workflow step');
      requireText(step.title, 'step title', 120);
      requireText(step.body, 'step body', 500);
      if (step.ownerAction !== undefined && typeof step.ownerAction !== 'boolean') {
        throw new Error('Invalid workflow owner action');
      }
    }
  }
}

export function workflowHTML(workflow) {
  validateWorkflow(workflow);
  const lanes = workflow.lanes.map(lane => `
    <section class="showcase-flow-lane">
      <h3>${escapeHTML(lane.title)}</h3>
      <ol class="showcase-flow-steps showcase-flow-steps--${lane.steps.length}" aria-label="${escapeHTML(lane.title)}">
        ${lane.steps.map(step => `
          <li class="showcase-flow-step${step.ownerAction ? ' showcase-flow-human' : ''}">
            ${step.ownerAction ? '<span class="showcase-flow-tag">Owner action</span>' : ''}
            <h4>${escapeHTML(step.title)}</h4>
            <p>${escapeHTML(step.body)}</p>
          </li>`).join('')}
      </ol>
    </section>`).join('');
  return `
    <section class="showcase-system-flow" aria-label="Project workflow">
      <header class="showcase-flow-heading">
        <p class="showcase-kicker">Workflow</p>
        <h2>${escapeHTML(workflow.title)}</h2>
        <p>${escapeHTML(workflow.description)}</p>
      </header>
      ${lanes}
      <p class="showcase-flow-legend">Follow the arrows within each workflow. Steps marked “Owner action” retain a human decision or action.</p>
    </section>`;
}
