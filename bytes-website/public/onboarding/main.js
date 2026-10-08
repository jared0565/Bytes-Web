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
    tonePicker.querySelectorAll('.tone-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
});
const next2 = document.getElementById('btn-next-2');
const back2 = document.getElementById('btn-back-2');

// Step 3 Elements
const embedCode = document.getElementById('embed-code');
const copyBtn = document.getElementById('btn-copy');

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
            const res = await fetch(`https://crm-api.bmorris0565.workers.dev/api/auth/exchange?token=${encodeURIComponent(socialToken)}`);
            if (!res.ok) throw new Error('Exchange failed');

            const userData = await res.json();
            const { name, email } = userData;

            // If this email already has a chatbot, send them to the dashboard
            if (email) {
                try {
                    const setupRes = await fetch(`${API_BASE}/api/check-setup?email=${encodeURIComponent(email)}`);
                    if (setupRes.ok) {
                        const { hasSetup } = await setupRes.json();
                        if (hasSetup) {
                            window.location.href = '/dashboard/';
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
                span.textContent = (name.split(' ')[0] || '') + '!';
                formTitle.appendChild(span);
            }

            if (name && email) {
                setTimeout(() => { next1.click(); }, 1000);
            }
        } catch {
            alert("Social login failed. Please try again or use email registration.");
        }

        // Remove token from URL so it can't be reused via browser history
        window.history.replaceState({}, '', window.location.pathname);

    } else if (params.get('social_error')) {
        alert("Social login failed. Please try again or use email registration.");
    }
});

// Social button click handlers
document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
        const provider = btn.getAttribute('data-provider');
        // Redirect to backend auth endpoint
        window.location.href = `https://crm-api.bmorris0565.workers.dev/api/auth/${provider}`;
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
}

// --- Event Listeners ---

// Step 1 -> 2
next1.addEventListener('click', () => {
    if (!inputName.value || !inputEmail.value) {
        alert("Please provide your name and email.");
        return;
    }

    // Strict Email Format Validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(inputEmail.value.trim())) {
        alert("Please enter a valid business email address (e.g. name@company.com).");
        inputEmail.focus();
        return;
    }

    /* 
     * TODO (Verification Placeholder): 
     * Before proceeding to Step 2, we will eventually trigger an OTP (One Time Password) 
     * flow here via API (e.g., POST /api/verify-email). 
     * If unverified, show a modal to enter the 6-digit code sent to `inputEmail.value`.
     * proceedToStep2() will only be called upon successful OTP validation.
     */

    registrationData.name = inputName.value.trim();
    registrationData.email = inputEmail.value.trim().toLowerCase();

    // M2: Use crypto.randomUUID() for an unguessable client ID
    const namePart = inputName.value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    registrationData.clientId = `${namePart}-${crypto.randomUUID().split('-')[0]}`;
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
    if (!inputCompany.value) {
        alert("Please provide your company name.");
        return;
    }
    registrationData.company = inputCompany.value;
    registrationData.tone = tonePicker.querySelector('.tone-option.selected')?.dataset.value || 'Professional & Authoritative';

    next2.textContent = "Initializing System...";
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
                    systemPrompt: `You are the helpful AI assistant for ${registrationData.company}. Your tone should be ${registrationData.tone}. Follow the PAS marketing framework strictly.`,
                }
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to provision bot.");
        }

        const resData = await res.json();
        setupToken = resData.setupToken || '';

        // Pre-fill the system prompt in step 4
        document.getElementById('settings-prompt').value =
            `You are the helpful AI assistant for ${registrationData.company}. Your tone should be ${registrationData.tone}. Follow the PAS marketing framework strictly.`;

        // Generate the Embed Code
        const snippet = `
<!-- BytesAI Chatbot Widget Start -->
<script src="https://web.bytesfx.com/widget.js" 
  data-client-id="${registrationData.clientId}"></scr` + `ipt>
<!-- BytesAI Chatbot Widget End -->`;

        embedCode.textContent = snippet.trim();

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
        alert("Provisioning Error: " + e.message);
        next2.textContent = "Initialize My Bot";
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
    document.getElementById('auto-approve-picker').querySelectorAll('.tone-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
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
            status.textContent = '✓ Settings saved!';
            status.style.opacity = '1';
            setTimeout(() => { window.location.href = '../dashboard/'; }, 1500);
        } else {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Save failed');
        }
    } catch (e) {
        status.textContent = e.message;
        status.style.color = '#f87171';
        status.style.opacity = '1';
        btn.textContent = 'Save & Finish';
        btn.disabled = false;
    }
});

// Copy Functionality
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(embedCode.textContent);
    copyBtn.textContent = "Copied! ✅";
    setTimeout(() => copyBtn.textContent = "Copy Embed Code", 2000);
});
// Email to Developer Simulator
const emailDevBtn = document.getElementById('btn-email-dev');
emailDevBtn.addEventListener('click', () => {
    emailDevBtn.textContent = "Email Sent! ✉️";
    emailDevBtn.style.color = "#10b981";
    emailDevBtn.style.borderColor = "#10b981";
    setTimeout(() => {
        emailDevBtn.textContent = "Send to Developer";
        emailDevBtn.style.color = "";
        emailDevBtn.style.borderColor = "";
    }, 3000);
});
