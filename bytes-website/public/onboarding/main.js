// UI Elements
const slides = document.querySelectorAll('.slide');
const steps = document.querySelectorAll('.step-circle');

// Step 1 Inputs
const inputName = document.getElementById('client-name');
const inputEmail = document.getElementById('client-email');
const next1 = document.getElementById('btn-next-1');

// Step 2 Inputs
const inputCompany = document.getElementById('company-name');
const inputTone = document.getElementById('bot-tone');
const next2 = document.getElementById('btn-next-2');
const back2 = document.getElementById('btn-back-2');

// Step 3 Elements
const embedCode = document.getElementById('embed-code');
const copyBtn = document.getElementById('btn-copy');

let currentStep = 1;
let registrationData = {
    clientId: '',
    name: '',
    email: '',
    company: '',
    tone: ''
};

// --- Social Login Logic ---

// Check for social login success on page load
window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const socialToken = params.get('social_token');

    if (socialToken) {
        try {
            // H3: Exchange the opaque token for user info — PII never travels in URL params
            const res = await fetch(`https://crm-api.bmorris0565.workers.dev/api/auth/exchange?token=${encodeURIComponent(socialToken)}`);
            if (!res.ok) throw new Error('Exchange failed');

            const userData = await res.json();
            const { name, email } = userData;

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
    registrationData.tone = inputTone.value;

    next2.textContent = "Initializing System...";
    next2.disabled = true;

    try {
        // PROVISIONING CALL
        // TODO: Route this provisioning call through the CRM API server instead of calling
        // the Cloudflare Worker directly with a shared key. The CRM API should act as a proxy
        // that authenticates this request server-side with its own credentials.
        const res = await fetch('https://chatbot-api.bmorris0565.workers.dev/api/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'REPLACE_WITH_PROVISIONING_TOKEN'
            },
            body: JSON.stringify({
                clientId: registrationData.clientId,
                settings: {
                    mode: 'free', // Start on Free Tier
                    companyName: registrationData.company,
                    systemPrompt: `You are the helpful AI assistant for ${registrationData.company}. Your tone should be ${registrationData.tone}. Follow the PAS marketing framework strictly.`,
                    showBranding: true
                }
            })
        });

        if (!res.ok) throw new Error("Failed to provision bot.");

        // Generate the Embed Code
        const snippet = `
<!-- BytesAI Chatbot Widget Start -->
<script src="https://ai.bytesfx.com/widget.js" 
  data-client-id="${registrationData.clientId}"></scr` + `ipt>
<!-- BytesAI Chatbot Widget End -->`;

        embedCode.textContent = snippet.trim();
        goToStep(3);
    } catch (e) {
        alert("Provisioning Error: " + e.message);
        next2.textContent = "Initialize My Bot";
        next2.disabled = false;
    }
});

back2.addEventListener('click', () => goToStep(1));

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
