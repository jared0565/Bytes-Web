const API_BASE = 'https://crm-api.bmorris0565.workers.dev';

// UI Elements
const slides = document.querySelectorAll('.slide');
const steps = document.querySelectorAll('.step-circle');

// Step 1 Inputs
const inputName = document.getElementById('client-name');
const inputEmail = document.getElementById('client-email');
const next1 = document.getElementById('btn-next-1');

// Step 2 Inputs
const inputCompany = document.getElementById('company-name');
const tonePicker = document.getElementById('bot-tone');
tonePicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.tone-option');
    if (!btn) return;
    tonePicker.querySelectorAll('.tone-option').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('selected');
    btn.setAttribute('aria-pressed', 'true');
});
// Pill pickers expose their state to screen readers
document.querySelectorAll('.tone-option').forEach(b => b.setAttribute('aria-pressed', String(b.classList.contains('selected'))));
const next2 = document.getElementById('btn-next-2');
const back2 = document.getElementById('btn-back-2');

// Step 3 Elements
const embedCode = document.getElementById('embed-code');
const copyBtn = document.getElementById('btn-copy');

// Inline errors (replace browser alerts). Pass '' to clear; field gets aria-invalid.
function showError(id, msg, field) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
    document.querySelectorAll('[aria-invalid="true"]').forEach(f => f.removeAttribute('aria-invalid'));
    if (msg && field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
}

// Client IDs must match the API's ^[a-z0-9][a-z0-9-]{2,60}$ — names with accents or
// non-Latin scripts would otherwise produce an invalid (or empty) slug.
function makeClientId(...names) {
    const slug = names.map(n => (n || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, ''))
        .find(Boolean) || 'client';
    return `${slug}-${crypto.randomUUID().split('-')[0]}`;
}

// A plain-language starter prompt with blanks to fill in (no marketing jargon)
function starterPrompt(company, tone) {
    company = company.replace(/[.!?]+$/, '');
    return `You are the friendly assistant for ${company}. Your tone is ${tone.toLowerCase()}.\n\n`
        + `What we do: [one or two sentences about your services].\n`
        + `Who we help: [your ideal customers].\n`
        + `Prices: [starting prices, or "we quote after a short call"].\n\n`
        + `Goals, in order:\n1. Answer questions clearly in 2–3 short sentences.\n`
        + `2. Ask for the visitor's name and email when they show interest.\n`
        + `3. Offer a free consultation and confirm we'll be in touch.\n\n`
        + `Rules: only discuss ${company} and its services; never invent prices or promises; if unsure, offer to have a team member follow up.`;
}

let currentStep = 1;
let setupToken = '';
let registrationData = {
    clientId: '',
    name: '',
    email: '',
    company: '',
    tone: ''
};

// --- Social Login Logic ---

// Returns true if the user was redirected (no further init needed)
async function redirectIfAlreadySetUp() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
            const me = await res.json();
            if (me && me.companyName) {
                window.location.href = '/dashboard/';
                return true;
            }
        }
    } catch { /* no session — continue normally */ }
    return false;
}

// Check for social login success on page load
window.addEventListener('DOMContentLoaded', async () => {
    // Auth-aware routing: send returning users straight to the dashboard
    const redirected = await redirectIfAlreadySetUp();
    if (redirected) return;

    const params = new URLSearchParams(window.location.search);
    const socialToken = params.get('social_token');

    if (socialToken) {
        try {
            // H3: Exchange the opaque token for user info — PII never travels in URL params
            let nonce = '';
            try { nonce = sessionStorage.getItem('login_nonce') || ''; } catch (_) {}
            const res = await fetch(`${API_BASE}/api/auth/exchange?token=${encodeURIComponent(socialToken)}&nonce=${encodeURIComponent(nonce)}`);
            if (!res.ok) throw new Error('Exchange failed');

            const userData = await res.json();
            const { name, email } = userData;

            // If this email already has a chatbot, send them to the dashboard to sign in
            if (email) {
                try {
                    const setupRes = await fetch(`${API_BASE}/api/check-setup?email=${encodeURIComponent(email)}`);
                    if (setupRes.ok) {
                        const { hasSetup } = await setupRes.json();
                        if (hasSetup) {
                            window.location.href = '/dashboard/?signin=existing';
                            return;
                        }
                    }
                } catch { /* proceed with onboarding if check fails */ }
            }

            if (name) inputName.value = name;
            if (email) inputEmail.value = email;

            // Visual feedback — safe DOM construction to avoid XSS
            const formTitle = document.querySelector('#step-1 h1');
            if (formTitle) {
                formTitle.textContent = '';
                formTitle.appendChild(document.createTextNode('Welcome back, '));
                const span = document.createElement('span');
                span.className = 'text-gradient';
                span.textContent = ((name || '').split(' ')[0] || 'there') + '!';
                formTitle.appendChild(span);
            }

            if (name && email) {
                setTimeout(() => { next1.click(); }, 1000);
            }
        } catch {
            showError('err-1', 'Social sign-in failed. Please try again, or use your email below.');
        }

        // Remove token from URL so it can't be reused via browser history
        window.history.replaceState({}, '', window.location.pathname);

    } else if (params.get('social_error')) {
        showError('err-1', 'Social sign-in was cancelled or failed. Please try again, or use your email below.');
        window.history.replaceState({}, '', window.location.pathname);
    }
});

// Social button click handlers
document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
        const provider = btn.getAttribute('data-provider');
        // A random value kept in this tab and checked when the sign-in comes back, so someone
        // else's sign-in link can't pre-fill this form with their details
        const nonce = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
        try { sessionStorage.setItem('login_nonce', nonce); } catch (_) {}
        window.location.href = `${API_BASE}/api/auth/${encodeURIComponent(provider)}?n=${nonce}`;
    });
});

// --- Navigation Logic ---
function goToStep(step) {
    slides.forEach(s => s.classList.remove('active'));
    steps.forEach(s => s.classList.remove('active'));

    document.getElementById(`step-${step}`).classList.add('active');

    // Update Progress UI
    for (let i = 1; i <= steps.length; i++) {
        const circle = document.querySelector(`.step-circle[data-step="${i}"]`);
        if (!circle) continue;

        if (i < step) {
            circle.classList.add('completed');
            circle.classList.remove('active');
        } else if (i === step) {
            circle.classList.add('active');
            circle.classList.remove('completed');
        } else {
            circle.classList.remove('active', 'completed');
        }
    }
    currentStep = step;
    // Move focus to the new step's heading for keyboard and screen-reader users
    const h = document.querySelector(`#step-${step} h1`);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Event Listeners ---

// Step 1 -> 2
next1.addEventListener('click', () => {
    if (!inputName.value.trim()) return showError('err-1', 'Please enter your name.', inputName);
    if (!inputEmail.value.trim()) return showError('err-1', 'Please enter your email.', inputEmail);

    // Strict Email Format Validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(inputEmail.value.trim())) {
        return showError('err-1', 'Please enter a valid email address (e.g. name@company.com).', inputEmail);
    }
    showError('err-1', '');

    /* 
     * TODO (Verification Placeholder): 
     * Before proceeding to Step 2, we will eventually trigger an OTP (One Time Password) 
     * flow here via API (e.g., POST /api/verify-email). 
     * If unverified, show a modal to enter the 6-digit code sent to `inputEmail.value`.
     * proceedToStep2() will only be called upon successful OTP validation.
     */

    registrationData.name = inputName.value.trim();
    registrationData.email = inputEmail.value.trim().toLowerCase();

    goToStep(2);
});

// Allow 'Enter' key to submit Step 1
[inputName, inputEmail].forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            next1.click();
        }
    });
});

// Allow 'Enter' key to submit Step 2
inputCompany.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        next2.click();
    }
});

// Step 2 -> 3 (The Provisioning)
next2.addEventListener('click', async () => {
    if (!inputCompany.value.trim()) return showError('err-2', 'Please enter your company or brand name.', inputCompany);
    showError('err-2', '');
    registrationData.company = inputCompany.value.trim();
    registrationData.tone = tonePicker.querySelector('.tone-option.selected')?.dataset.value || 'Professional & Authoritative';
    // Unguessable ID (random suffix), readable prefix from the company or the person's name
    registrationData.clientId = makeClientId(registrationData.company, registrationData.name);
    const prompt = starterPrompt(registrationData.company, registrationData.tone);

    next2.textContent = 'Creating your chatbot…';
    next2.disabled = true;

    try {
        // PROVISIONING — registers client, saves chatbot config, starts 7-day trial
        const res = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: registrationData.clientId,
                ownerEmail: registrationData.email,
                settings: {
                    companyName: registrationData.company,
                    systemPrompt: prompt,
                }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (err.hasSetup) {
                next2.textContent = 'Create my chatbot';
                next2.disabled = false;
                document.getElementById('err-2').innerHTML = 'This email already has a chatbot. <a href="/dashboard/">Sign in to your dashboard</a>';
                document.getElementById('err-2').hidden = false;
                return;
            }
            throw new Error(err.error || 'We could not create your chatbot.');
        }

        const resData = await res.json();
        setupToken = resData.setupToken || '';

        // Pre-fill the system prompt in step 4
        document.getElementById('settings-prompt').value = prompt;

        // Generate the Embed Code
        embedCode.textContent = '<!-- BytesAI Chatbot Widget Start -->\n'
            + `<script src="https://web.bytesfx.com/widget.js"\n  data-client-id="${registrationData.clientId}"></scr` + 'ipt>\n'
            + '<!-- BytesAI Chatbot Widget End -->';

        // Populate install limits card (trial = 1 domain / 1 installation)
        const planLimits = { free: [1,1], trial: [1,1], starter: [3,3], pro: [10,10], business: [25,25], enterprise: ['∞','∞'] };
        const trialDaysLeft = resData.trialDaysLeft || 7;
        const [maxSites, maxDomains] = planLimits.trial;
        const sitesEl = document.getElementById('install-max-sites');
        const domsEl = document.getElementById('install-max-domains');
        const badge = document.getElementById('install-plan-badge');
        if (sitesEl) sitesEl.textContent = maxSites;
        if (domsEl) domsEl.textContent = maxDomains;
        if (badge) badge.textContent = `Trial · ${trialDaysLeft}d left`;

        goToStep(3);
    } catch (e) {
        showError('err-2', e.message === 'Failed to fetch' ? 'Could not reach our servers. Check your connection and try again.' : `${e.message} Please try again.`);
        next2.textContent = 'Create my chatbot';
        next2.disabled = false;
    }
});

back2.addEventListener('click', () => goToStep(1));

// Step 3 → 4 (More Settings)
document.getElementById('btn-more-settings').addEventListener('click', () => goToStep(4));

// Step 4 — pill pickers
document.getElementById('auto-approve-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('.tone-option');
    if (!btn) return;
    document.getElementById('auto-approve-picker').querySelectorAll('.tone-option').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('selected');
    btn.setAttribute('aria-pressed', 'true');
});
document.getElementById('branding-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('.tone-option');
    if (!btn || btn.dataset.locked) return; // badge mandatory during trial
    document.getElementById('branding-picker').querySelectorAll('.tone-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
});

document.getElementById('btn-back-4').addEventListener('click', () => goToStep(3));

document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-settings');
    const status = document.getElementById('settings-status');
    btn.textContent = 'Saving…';
    btn.disabled = true;

    const systemPrompt = document.getElementById('settings-prompt').value.trim();
    const autoApprove = document.getElementById('auto-approve-picker').querySelector('.tone-option.selected')?.dataset.value === '1';
    const showBranding = true; // badge mandatory during 7-day trial; enforced by backend

    try {
        const res = await fetch(`${API_BASE}/api/register-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setupToken, settings: { systemPrompt, autoApproveCampaigns: autoApprove, showBranding } })
        });

        if (res.ok) {
            status.style.color = '#34d399';
            status.textContent = `✓ Saved. Taking you to your dashboard — sign in with the Google, Facebook or LinkedIn account for ${registrationData.email}.`;
            status.style.opacity = '1';
            setTimeout(() => { window.location.href = '/dashboard/'; }, 2500);
        } else {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Save failed');
        }
    } catch (e) {
        status.textContent = e.message === 'Setup session expired.'
            ? 'This setup link expired. Your chatbot is created — sign in to your dashboard to change these settings.'
            : (e.message === 'Failed to fetch' ? 'Could not reach our servers. Check your connection and try again.' : e.message);
        status.style.color = '#f87171';
        status.style.opacity = '1';
        btn.textContent = 'Save & Finish';
        btn.disabled = false;
    }
});

// Copy — falls back to selecting the code when the Clipboard API is unavailable (http, old browsers)
copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(embedCode.textContent);
        copyBtn.textContent = 'Copied ✓';
    } catch {
        const range = document.createRange();
        range.selectNodeContents(embedCode);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        copyBtn.textContent = 'Press Ctrl/⌘ + C to copy';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy Embed Code'; }, 2500);
});

// Email to developer — opens the visitor's own email app with the code and install steps
document.getElementById('btn-email-dev').addEventListener('click', () => {
    const subject = `Please add our ${registrationData.company || 'BytesAI'} chatbot to the website`;
    const body = `Hi,\n\nPlease add our BytesAI chatbot to every page of the website. Paste this code just before the closing </body> tag:\n\n`
        + `${embedCode.textContent}\n\n`
        + `WordPress: footer.php before </body>, or a "header and footer scripts" plugin.\n`
        + `Shopify: Online Store > Themes > Edit code > theme.liquid, before </body>.\n`
        + `Wix: Settings > Custom code > Body - end, all pages.\n`
        + `Squarespace: Settings > Advanced > Code injection > Footer.\n`
        + `Webflow: Site settings > Custom code > Footer code, then publish.\n\n`
        + `The chat bubble should appear in the bottom corner once it's live. Thanks!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
