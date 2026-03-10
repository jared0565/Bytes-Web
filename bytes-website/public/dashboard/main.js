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
            <td>
                <span class="badge" style="background: var(--bg-hover); color: var(--text-primary);">
                    ${l.status ? l.status.replace(/_/g, ' ').toUpperCase() : 'NEW'}
                </span>
            </td>
            <td>
                ${!l.locked ? `<button class="btn btn-outline manage-campaign-btn" data-id="${l.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Campaign</button>` : ''}
            </td>
        </tr>
    `).join('');

    // Add event listeners for the Campaign buttons
    document.querySelectorAll('.manage-campaign-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const leadId = e.target.getAttribute('data-id');
            openSequenceModal(leadId);
        });
    });
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

            // Re-fetch leads if we are on the leads view (since 'activeView' variable doesn't exist globally, we check DOM)
            if (!document.getElementById('leads-view').classList.contains('hidden')) {
                loadLeads();
            }
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

// --- Modal Logic ---
const sequenceModal = document.getElementById('sequence-modal');
const closeSequenceModalBtn = document.getElementById('close-sequence-modal');
const sequenceLoading = document.getElementById('sequence-loading');
const sequenceEditorContainer = document.getElementById('sequence-editor-container');
const saveSequenceBtn = document.getElementById('save-sequence-btn');
const approveSequenceBtn = document.getElementById('approve-sequence-btn');
const sequenceStatus = document.getElementById('sequence-status');

let currentLeadId = null;
let currentSequences = [];

closeSequenceModalBtn.addEventListener('click', () => {
    sequenceModal.classList.add('hidden');
});

async function openSequenceModal(leadId) {
    currentLeadId = leadId;
    sequenceModal.classList.remove('hidden');
    sequenceEditorContainer.innerHTML = '';
    saveSequenceBtn.classList.add('hidden');
    approveSequenceBtn.classList.add('hidden');
    sequenceStatus.innerText = '';

    // Fetch existing sequences
    sequenceLoading.classList.remove('hidden');
    try {
        const res = await fetch(`${API_BASE}/api/sequences?leadId=${leadId}`, {
            headers: { 'x-admin-key': adminKey }
        });
        const data = await res.json();

        if (data && data.length > 0) {
            currentSequences = data;
            renderSequenceEditor();
        } else {
            // Need to generate
            await generateSequence(leadId);
        }
    } catch (e) {
        sequenceStatus.innerText = 'Error loading sequence.';
    } finally {
        sequenceLoading.classList.add('hidden');
    }
}

async function generateSequence(leadId) {
    sequenceStatus.innerText = '';
    try {
        const res = await fetch(`${API_BASE}/api/generate-sequence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
            body: JSON.stringify({ leadId })
        });
        if (res.ok) {
            // Re-fetch the newly generated sequences
            const seqRes = await fetch(`${API_BASE}/api/sequences?leadId=${leadId}`, {
                headers: { 'x-admin-key': adminKey }
            });
            currentSequences = await seqRes.json();
            renderSequenceEditor();
        } else {
            sequenceStatus.innerText = 'Failed to generate sequence via AI.';
            sequenceStatus.style.color = 'var(--error)';
        }
    } catch (e) {
        sequenceStatus.innerText = 'Network error generating sequence.';
        sequenceStatus.style.color = 'var(--error)';
    }
}

function renderSequenceEditor() {
    if (!currentSequences || currentSequences.length === 0) return;

    // Check global status of this lead's sequence
    const isApproved = currentSequences.some(s => s.status !== 'draft');

    sequenceEditorContainer.innerHTML = currentSequences.map((seq, index) => `
        <div class="sequence-step" style="margin-bottom: 2rem; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 8px; background: rgba(0,0,0,0.2);">
            <h4 style="margin-top: 0; margin-bottom: 1rem; color: var(--accent-color); font-size: 1.1rem;">Email ${seq.email_number} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-secondary);">(Sends approx ${seq.email_number} day${seq.email_number > 1 ? 's' : ''} after approval)</span></h4>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">Subject Line</label>
                <input type="text" id="seq-subject-${index}" value="${seq.subject.replace(/"/g, '&quot;')}" ${isApproved ? 'disabled' : ''} style="width: 100%; padding: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
            </div>
            <div class="form-group">
                <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">Body</label>
                <textarea id="seq-body-${index}" style="width: 100%; min-height: 200px; padding: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); color: white; border-radius: 4px; resize: vertical;" ${isApproved ? 'disabled' : ''}>${seq.body}</textarea>
            </div>
        </div>
    `).join('');

    if (!isApproved) {
        saveSequenceBtn.classList.remove('hidden');
        approveSequenceBtn.classList.remove('hidden');
    } else {
        sequenceStatus.innerText = 'Campaign is already Approved/Active and cannot be edited.';
        sequenceStatus.style.color = 'var(--text-secondary)';
    }
}

saveSequenceBtn.addEventListener('click', async () => {
    sequenceStatus.innerText = 'Saving drafts...';
    sequenceStatus.style.color = 'white';

    try {
        for (let i = 0; i < currentSequences.length; i++) {
            const seq = currentSequences[i];
            const subject = document.getElementById(`seq-subject-${i}`).value;
            const body = document.getElementById(`seq-body-${i}`).value;

            await fetch(`${API_BASE}/api/sequences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                body: JSON.stringify({ id: seq.id, subject, body })
            });
        }
        sequenceStatus.innerText = 'Drafts saved successfully.';
        sequenceStatus.style.color = 'var(--success)';
    } catch (e) {
        sequenceStatus.innerText = 'Error saving drafts.';
        sequenceStatus.style.color = 'var(--error)';
    }
});

approveSequenceBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to approve this sequence? It will be drip-fed to the lead automatically.')) return;

    // Save first just in case
    await saveSequenceBtn.click();

    sequenceStatus.innerText = 'Approving Campaign...';
    try {
        const res = await fetch(`${API_BASE}/api/sequences/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
            body: JSON.stringify({ leadId: currentLeadId })
        });

        if (res.ok) {
            sequenceStatus.innerText = 'Campaign Approved & Deployed! 🚀';
            sequenceStatus.style.color = 'var(--success)';
            saveSequenceBtn.classList.add('hidden');
            approveSequenceBtn.classList.add('hidden');

            // disable inputs
            document.querySelectorAll('input[id^="seq-subject-"], textarea[id^="seq-body-"]').forEach(el => el.disabled = true);

            // Refresh underlying leads table
            loadLeads();
        } else {
            sequenceStatus.innerText = 'Failed to approve campaign.';
            sequenceStatus.style.color = 'var(--error)';
        }
    } catch (e) {
        sequenceStatus.innerText = 'Network error approving campaign.';
        sequenceStatus.style.color = 'var(--error)';
    }
});
