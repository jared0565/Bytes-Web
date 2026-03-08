const ADMIN_KEY = "DEV_BYPASS"; // In a real app, this would be a session token

// UI Elements
const slides = document.querySelectorAll('.slide');
const steps = document.querySelectorAll('.step');
const progressBar = document.getElementById('progress');

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

// --- Navigation Logic ---
function goToStep(step) {
    slides.forEach(s => s.classList.remove('active'));
    steps.forEach(s => s.classList.remove('active'));

    document.getElementById(`step-${step}`).classList.add('active');

    // Update Progress UI
    for (let i = 1; i <= step; i++) {
        document.querySelector(`.step[data-step="${i}"]`).classList.add('active');
    }
    progressBar.style.width = `${(step - 1) * 50}%`;
    currentStep = step;
}

// --- Event Listeners ---

// Step 1 -> 2
next1.addEventListener('click', () => {
    if (!inputName.value || !inputEmail.value) {
        alert("Please provide your name and email.");
        return;
    }
    registrationData.name = inputName.value;
    registrationData.email = inputEmail.value;
    // Generate a trial client ID: lowercase-name-random
    registrationData.clientId = inputName.value.toLowerCase().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000);
    goToStep(2);
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
        const res = await fetch('https://chatbot-api.bmorris0565.workers.dev/api/save-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': 'DEV_BYPASS' // For simulation, the API handles this bypass or we'd use a real key
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
<!-- BytesFX Chatbot Widget Start -->
<script src="https://ai.bytesfx.com/widget.js" 
  data-client-id="${registrationData.clientId}"></scr` + `ipt>
<!-- BytesFX Chatbot Widget End -->`;

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
