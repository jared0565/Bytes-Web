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
const configPrompt = document.getElementById('config-prompt');
const saveConfigBtn = document.getElementById('save-config-btn');
const configStatus = document.getElementById('config-status');

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
            const err = await res.json();
            return { success: false, error: err.error || 'Request failed' };
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
        <tr>
            <td>${new Date(l.timestamp).toLocaleString()}</td>
            <td><code>${l.client_id}</code></td>
            <td>${l.name}</td>
            <td>${l.email}</td>
            <td>${l.service}</td>
            <td>${l.budget}</td>
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
saveConfigBtn.addEventListener('click', async () => {
    const cid = configClientId.value.trim();
    const prompt = configPrompt.value.trim();

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
                settings: { systemPrompt: prompt }
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
