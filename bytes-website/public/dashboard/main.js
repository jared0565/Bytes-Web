// --- Configuration ---
const API_BASE = "https://ai.bytesfx.com"; // Your live domain

// --- State ---
let adminKey = localStorage.getItem('agency_admin_key') || '';

// --- Elements ---
const loginOverlay = document.getElementById('login-overlay');
const dashboardContainer = document.getElementById('dashboard-container');
const loginBtn = document.getElementById('login-btn');
const adminKeyInput = document.getElementById('admin-key-input');
const loginError = document.getElementById('login-error');

const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const viewTitle = document.getElementById('view-title');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');

const leadsBody = document.getElementById('leads-body');
const logsBody = document.getElementById('logs-body');

const configClientId = document.getElementById('config-client-id');
const configMode = document.getElementById('config-mode');
const configBranding = document.getElementById('config-branding');
const configReferral = document.getElementById('config-referral');
const configPrompt = document.getElementById('config-prompt');
const configCompanyName = document.getElementById('config-company-name');
const saveConfigBtn = document.getElementById('save-config-btn');
const loadConfigBtn = document.getElementById('load-config-btn');
const configStatus = document.getElementById('config-status');

// Simulator Elements
const simClientId = document.getElementById('sim-client-id');
const simName = document.getElementById('sim-name');
const simEmail = document.getElementById('sim-email');
const simulateBtn = document.getElementById('simulate-lead-btn');
const simStatus = document.getElementById('sim-status');

// --- Initialization ---
if (adminKey) {
    showDashboard();
}

// --- Auth logic ---
loginBtn.addEventListener('click', async () => {
    const key = adminKeyInput.value.trim();
    if (!key) return;

    // Test the key by fetching leads
    const result = await loadLeads(key);
    if (result.success) {
        adminKey = key;
        localStorage.setItem('agency_admin_key', key);
        showDashboard();
    } else {
        loginError.innerText = result.error || "Connection error. Check console.";
    }
});

adminKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('agency_admin_key');
    location.reload();
});

function showDashboard() {
    loginOverlay.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    switchView('leads');
}

// --- Navigation ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-view');
        switchView(viewName);
    });
});

function switchView(viewName) {
    navItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-view') === viewName));
    views.forEach(view => view.classList.toggle('hidden', view.id !== `${viewName}-view`));

    viewTitle.innerText = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    if (viewName === 'leads') loadLeads();
    if (viewName === 'logs') loadLogs();
}

refreshBtn.addEventListener('click', () => {
    const activeView = document.querySelector('.nav-item.active').getAttribute('data-view');
    if (activeView === 'leads') loadLeads();
    if (activeView === 'logs') loadLogs();
});

// --- Data Fetching ---
async function loadLeads(testKey = null) {
    const key = testKey || adminKey;
    try {
        const res = await fetch(`${API_BASE}/api/leads`, {
            headers: { 'x-admin-key': key }
        });

        if (!res.ok) {
            let errorMsg = 'Access Denied';
            try {
                const err = await res.json();
                errorMsg = err.error || errorMsg;
            } catch (jsonErr) {
                // Not JSON, maybe a 500 crash text
                errorMsg = `Server Error (${res.status})`;
            }
            return { success: false, error: errorMsg };
        }

        const data = await res.json();
        renderLeads(data);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Network or CORS error.' };
    }
}

async function loadLogs() {
    try {
        const res = await fetch(`${API_BASE}/api/logs`, {
            headers: { 'x-admin-key': adminKey }
        });
        if (!res.ok) return;

        const data = await res.json();
        renderLogs(data);
    } catch (e) { console.error(e); }
}

// --- Rendering ---
function renderLeads(leads) {
    leadsBody.innerHTML = leads.map(l => `
        <tr class="${l.locked ? 'lead-locked' : ''}">
            <td>${new Date(l.timestamp).toLocaleString()}</td>
            <td><code>${l.client_id}</code> ${l.locked ? '<span class="badge badge-locked">Locked</span>' : ''}</td>
            <td class="${l.locked ? 'blurred' : ''}">${l.name}</td>
            <td class="${l.locked ? 'blurred' : ''}">${l.email}</td>
            <td>${l.service}</td>
            <td class="${l.locked ? 'blurred' : ''}">${l.budget}</td>
            <td title="${l.summary}">${l.summary ? l.summary.substring(0, 50) + '...' : '-'}</td>
        </tr>
    `).join('');
}

function renderLogs(logs) {
    logsBody.innerHTML = logs.map(l => `
        <tr>
            <td>${new Date(l.timestamp).toLocaleString()}</td>
            <td><code>${l.client_id}</code></td>
            <td style="max-width: 300px;">${l.user_message}</td>
            <td style="max-width: 300px;">${l.bot_response}</td>
        </tr>
    `).join('');
}

// --- Client Management ---
loadConfigBtn.addEventListener('click', async () => {
    const cid = configClientId.value.trim();
    if (!cid) return;

    configStatus.innerText = "Loading...";
    configStatus.style.color = "white";

    try {
        const res = await fetch(`${API_BASE}/api/config?clientId=${cid}`, {
            headers: { 'x-admin-key': adminKey }
        });

        if (res.ok) {
            const data = await res.json();
            configPrompt.value = data.systemPrompt || '';
            configMode.value = data.mode || 'free';
            configCompanyName.value = data.companyName || '';
            configBranding.checked = data.showBranding !== false;
            configReferral.value = data.referralId || '';

            // Branding is mandatory for Free Tier
            if (configMode.value === 'free') {
                configBranding.checked = true;
                configBranding.disabled = true;
                configBranding.parentElement.querySelector('label').innerText += " (Mandatory for Free)";
            } else {
                configBranding.disabled = false;
                configBranding.parentElement.querySelector('label').innerText = "Show \"Powered by BytesAI\"";
            }
            configStatus.innerText = "Settings loaded!";
            configStatus.style.color = "var(--success)";
        } else {
            configStatus.innerText = "Settings not found (using defaults).";
            configMode.value = 'ai';
            configPrompt.value = '';
        }
    } catch (e) {
        configStatus.innerText = "Error loading settings.";
    }
});

saveConfigBtn.addEventListener('click', async () => {
    const cid = configClientId.value.trim();
    const prompt = configPrompt.value.trim();
    const mode = configMode.value;
    const branding = configBranding.checked;
    const referral = configReferral.value.trim();

    if (!cid) {
        configStatus.innerText = "Client ID is required";
        return;
    }

    configStatus.innerText = "Saving...";
    try {
        const res = await fetch(`${API_BASE}/api/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify({
                clientId: cid,
                settings: {
                    systemPrompt: prompt,
                    mode: mode,
                    companyName: configCompanyName.value,
                    showBranding: branding,
                    referralId: referral
                }
            })
        });

        if (res.ok) {
            configStatus.innerText = "Settings saved successfully!";
            configStatus.style.color = "var(--success)";
        } else {
            configStatus.innerText = "Failed to save settings.";
            configStatus.style.color = "var(--error)";
        }
    } catch (e) {
        configStatus.innerText = "Network error.";
    }
});

// --- Lead Simulator Logic ---
simulateBtn.addEventListener('click', async () => {
    const cid = simClientId.value.trim();
    const name = simName.value.trim();
    const email = simEmail.value.trim();

    if (!cid || !email) {
        simStatus.innerText = "Client ID and Email are required.";
        simStatus.style.color = "var(--error)";
        return;
    }

    simStatus.innerText = "Simulating...";
    simStatus.style.color = "var(--text-secondary)";

    try {
        const res = await fetch(`${API_BASE}/api/test-lead`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey
            },
            body: JSON.stringify({ clientId: cid, name, email })
        });

        if (res.ok) {
            simStatus.innerText = "Lead simulated successfully!";
            simStatus.style.color = "var(--success)";
            // Refresh leads if we are on the leads view
            if (activeView === 'leads') fetchLeads();
        } else {
            const err = await res.json();
            simStatus.innerText = `Error: ${err.error || 'Failed'}`;
            simStatus.style.color = "var(--error)";
        }
    } catch (e) {
        simStatus.innerText = "Network error while simulating.";
        simStatus.style.color = "var(--error)";
    }
});
