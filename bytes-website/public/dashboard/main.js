const API_BASE = "https://crm-api.bmorris0565.workers.dev";

// --- Plan / Trial state ---
let planStatus = { plan: 'free', inTrial: true, trialDaysLeft: 7 };

// C3: HTML-escape user data before rendering to prevent XSS
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// --- State ---
// H2: Auth key no longer stored in localStorage — session managed via httpOnly cookie
let userRole = localStorage.getItem('agency_user_role') || 'sales_rep';
let userProfile = { name: '', email: '', picture: '', companyName: '' };

// Restore light mode preference
if (localStorage.getItem('dashboard_light_mode') === '1') document.body.classList.add('light-mode');

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
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const dashboardSidebar = document.getElementById('dashboard-sidebar');

const colLead = document.getElementById('col-lead');
const colPriority = document.getElementById('col-priority');
const colOpportunity = document.getElementById('col-opportunity');
const colCampaign = document.getElementById('col-campaign');

const logsBody = document.getElementById('logs-body');

const configClientId = document.getElementById('config-client-id');
const configMode = document.getElementById('config-mode');
const configBranding = document.getElementById('config-branding');
const configReferral = document.getElementById('config-referral');
const configPrompt = document.getElementById('config-prompt');
const configCompanyName = document.getElementById('config-company-name');
const configCampaignMode = document.getElementById('config-campaign-mode');
const configAutoApprove = document.getElementById('config-auto-approve');
const saveConfigBtn = document.getElementById('save-config-btn');
const loadConfigBtn = document.getElementById('load-config-btn');
const configStatus = document.getElementById('config-status');
const whiteLabelSection = document.getElementById('white-label-section');
const configWidgetName = document.getElementById('config-widget-name');
const configWidgetColor = document.getElementById('config-widget-color');
const configWidgetColorPicker = document.getElementById('config-widget-color-picker');
const configWidgetAvatar = document.getElementById('config-widget-avatar');

// Keep color text input and color picker in sync
if (configWidgetColorPicker) {
    configWidgetColorPicker.addEventListener('input', () => { configWidgetColor.value = configWidgetColorPicker.value; });
    configWidgetColor.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(configWidgetColor.value)) configWidgetColorPicker.value = configWidgetColor.value;
    });
}

// Simulator Elements
const simClientId = document.getElementById('sim-client-id');
const simName = document.getElementById('sim-name');
const simEmail = document.getElementById('sim-email');
const simulateBtn = document.getElementById('simulate-lead-btn');
const simStatus = document.getElementById('sim-status');

// --- Initialization ---
(async () => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    const pid  = params.get('pid');

    if (params.has('social_error')) {
        const errMap = { invalid_state: 'Security check failed. Please try again.', auth_failed: 'Authentication failed. Please try again.', no_code: 'Login was cancelled.' };
        loginError.innerText = errMap[params.get('social_error')] || 'Social login failed. Please try again.';
        history.replaceState(null, '', window.location.pathname);
        return;
    }

    // Post-OAuth 2FA steps
    if (step === 'verify-2fa' && pid) {
        history.replaceState(null, '', window.location.pathname);
        show2faVerify(pid);
        return;
    }
    if (step === 'setup-2fa' && pid) {
        history.replaceState(null, '', window.location.pathname);
        show2faSetup(pid);
        return;
    }

    // Check for existing session
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            userRole = data.role || 'sales_rep';
            localStorage.setItem('agency_user_role', userRole);
            showDashboard();
            return;
        }
        if (res.status === 401) {
            const data = await res.json().catch(() => ({}));
            if (data.kicked) {
                loginError.style.color = '#f59e0b';
                loginError.innerText = 'You were signed out because your account was accessed from another device.';
            }
        }
    } catch (_) {}

    // Show login overlay; ?key=1 reveals legacy admin TOTP fallback
    if (params.get('key') === '1') {
        document.getElementById('admin-key-section').style.display = 'block';
    }
})();

// --- 2FA: Verify existing TOTP (returning member) ---
function show2faVerify(pid) {
    document.getElementById('social-login-section').style.display = 'none';
    document.getElementById('verify-2fa-section').style.display = 'block';

    const counterEl = document.getElementById('attempt-counter');

    async function submitVerify() {
        const code = document.getElementById('totp-verify-input').value.trim();
        if (!code) return;
        loginError.innerText = '';
        const rememberDevice = document.getElementById('remember-device-verify').checked;

        try {
            const res = await fetch(`${API_BASE}/api/auth/totp/user-verify`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pid, code, rememberDevice })
            });
            const data = await res.json();

            if (res.ok) {
                userRole = data.role;
                localStorage.setItem('agency_user_role', data.role);
                showDashboard();
                return;
            }

            if (data.locked) {
                document.getElementById('verify-2fa-section').innerHTML = `
                    <h2 style="color:#f87171">Account Locked</h2>
                    <p style="opacity:0.7;font-size:0.9rem;">Too many failed attempts. Your account is locked for 24 hours.<br>Please try again later.</p>`;
                return;
            }

            loginError.style.color = '#f87171';
            loginError.innerText = data.error || 'Invalid code.';

            // Show remaining attempts counter
            const match = data.error?.match(/(\d+) attempt/);
            if (match) {
                counterEl.style.display = 'block';
                counterEl.innerText = `${match[1]} attempt${match[1] !== '1' ? 's' : ''} remaining`;
            }
        } catch {
            loginError.innerText = 'Connection error. Please try again.';
        }
    }

    document.getElementById('totp-verify-btn').addEventListener('click', submitVerify);
    document.getElementById('totp-verify-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitVerify(); });
}

// --- 2FA: Setup TOTP (new user) ---
async function show2faSetup(pid) {
    document.getElementById('social-login-section').style.display = 'none';
    document.getElementById('setup-2fa-section').style.display = 'block';

    try {
        const res = await fetch(`${API_BASE}/api/auth/totp/user-setup?pid=${encodeURIComponent(pid)}`, { credentials: 'include' });
        if (!res.ok) {
            loginError.innerText = 'Session expired. Please log in again.';
            document.getElementById('setup-2fa-section').style.display = 'none';
            document.getElementById('social-login-section').style.display = 'block';
            return;
        }
        const data = await res.json();
        document.getElementById('setup-qr-img').src = data.qrUrl;
        document.getElementById('setup-secret').textContent = data.secret;
    } catch {
        loginError.innerText = 'Connection error. Please try again.';
        return;
    }

    async function submitSetup() {
        const code = document.getElementById('totp-setup-input').value.trim();
        if (!code) return;
        loginError.innerText = '';
        const rememberDevice = document.getElementById('remember-device-setup').checked;

        try {
            const res = await fetch(`${API_BASE}/api/auth/totp/user-enable`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pid, code, rememberDevice })
            });
            const data = await res.json();

            if (res.ok) {
                userRole = data.role;
                localStorage.setItem('agency_user_role', data.role);
                showDashboard();
                return;
            }

            loginError.style.color = '#f87171';
            loginError.innerText = data.error || 'Invalid code. Try again.';
        } catch {
            loginError.innerText = 'Connection error. Please try again.';
        }
    }

    document.getElementById('totp-setup-btn').addEventListener('click', submitSetup);
    document.getElementById('totp-setup-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitSetup(); });
}

// --- Legacy admin TOTP fallback (?key=1) ---
document.getElementById('totp-btn').addEventListener('click', async () => {
    const code = document.getElementById('totp-input').value.trim();
    if (!code) return;
    loginError.innerText = '';
    try {
        const res = await fetch(`${API_BASE}/api/auth/totp`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (!res.ok) { loginError.innerText = data.error || 'Invalid code.'; return; }
        userRole = data.role;
        localStorage.setItem('agency_user_role', data.role);
        showDashboard();
    } catch {
        loginError.innerText = 'Connection error. Please try again.';
    }
});

document.getElementById('totp-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('totp-btn').click(); });

// Social login buttons — redirect to OAuth with redirect=dashboard
document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', () => {
        const provider = btn.getAttribute('data-provider');
        // Preserve ?view= param across the OAuth round-trip
        const view = new URLSearchParams(window.location.search).get('view');
        if (view) sessionStorage.setItem('pendingView', view);
        window.location.href = `${API_BASE}/api/auth/${provider}?redirect=dashboard`;
    });
});

logoutBtn.addEventListener('click', async () => {
    // H2: Clear the httpOnly session cookie server-side
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem('agency_user_role');
    location.reload();
});

function showDashboard() {
    loginOverlay.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    document.body.classList.remove('login-page'); // remove login background styles

    // RBAC: Hide admin tabs if not admin
    if (userRole !== 'admin') {
        const logsNav = document.querySelector('.nav-item[data-view="logs"]');
        const clientsNav = document.querySelector('.nav-item[data-view="clients"]');
        if (logsNav) logsNav.style.display = 'none';
        if (clientsNav) clientsNav.style.display = 'none';
        document.getElementById('logs-view')?.remove();
        document.getElementById('clients-view')?.remove();
    }

    // Load plan/trial status and render banner
    loadPlanStatus();
    loadUserProfile();

    // Navigate to a requested view (?view= param or saved from pre-OAuth redirect)
    const requestedView = new URLSearchParams(window.location.search).get('view')
        || sessionStorage.getItem('pendingView');
    sessionStorage.removeItem('pendingView');
    switchView(requestedView || 'leads');

    // Single-session enforcement: re-check session whenever the tab regains focus
    startSessionWatcher();
}

let sessionWatcherStarted = false;
function startSessionWatcher() {
    if (sessionWatcherStarted) return;
    sessionWatcherStarted = true;

    async function checkSession() {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
            if (res.status === 401) {
                const data = await res.json().catch(() => ({}));
                const msg = data.kicked
                    ? 'You were signed out because your account was accessed from another device.'
                    : 'Your session has expired. Please log in again.';
                showKickedBanner(msg);
            }
        } catch { /* network error — ignore */ }
    }

    // Check on tab focus
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkSession();
    });
}

function showKickedBanner(message) {
    const existing = document.getElementById('kicked-banner');
    if (existing) return; // already shown
    const banner = document.createElement('div');
    banner.id = 'kicked-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;text-align:center;padding:0.85rem 1rem;font-size:0.9rem;font-weight:500;display:flex;align-items:center;justify-content:center;gap:1rem;';
    banner.innerHTML = `<span>${message}</span><button onclick="location.reload()" style="background:#fff;color:#b45309;border:none;border-radius:6px;padding:0.3rem 0.9rem;font-weight:600;cursor:pointer;">Log In Again</button>`;
    document.body.prepend(banner);
}

async function loadPlanStatus() {
    try {
        const res = await fetch(`${API_BASE}/api/crm-settings`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        planStatus = { plan: data.plan || 'free', inTrial: data.inTrial || false, trialDaysLeft: data.trialDaysLeft || 0, trialEndsAt: data.trialEndsAt || 0 };
        renderPlanBanner();
    } catch (_) {}
}

function renderPlanBanner() {
    const banner = document.getElementById('trial-banner');
    if (!banner) return;
    if (planStatus.inTrial) {
        banner.style.display = 'block';
        banner.style.background = 'linear-gradient(90deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)';
        banner.style.color = '#f59e0b';
        const days = planStatus.trialDaysLeft;
        banner.innerHTML = `⚡ <strong>Free Trial Active</strong> — ${days} day${days !== 1 ? 's' : ''} remaining. Enjoy full access to all features including AI campaign generation.`;
    } else if (planStatus.plan === 'free') {
        banner.style.display = 'block';
        banner.style.background = 'linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)';
        banner.style.color = '#f87171';
        banner.innerHTML = `🔒 <strong>Free Plan</strong> — AI features are disabled. Max 10 leads/day · 50 contacts. <a href="/onboarding/" style="color:#fb923c;text-decoration:underline;margin-left:8px;">Upgrade your plan →</a>`;
    }
}

// --- User Profile ---
async function loadUserProfile() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        userProfile = { name: data.name || '', email: data.email || '', picture: data.picture || '', companyName: data.companyName || '' };
        renderUserProfile();
    } catch {}
}

function renderUserProfile() {
    // Company name in sidebar
    const companyDisplay = document.getElementById('company-name-display');
    if (companyDisplay) companyDisplay.textContent = userProfile.companyName || 'My Dashboard';

    // Avatar — show profile picture or initials
    const avatarImg = document.getElementById('user-avatar-img');
    const avatarInitials = document.getElementById('user-avatar-initials');
    if (userProfile.picture && avatarImg) {
        avatarImg.src = userProfile.picture;
        avatarImg.style.display = 'block';
        if (avatarInitials) avatarInitials.style.display = 'none';
    } else if (avatarInitials) {
        const words = userProfile.name ? userProfile.name.trim().split(/\s+/) : [];
        avatarInitials.textContent = words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : (userProfile.name[0] || '?').toUpperCase();
    }

    // Dropdown header
    const ddName = document.getElementById('dd-user-name');
    const ddEmail = document.getElementById('dd-user-email');
    if (ddName) ddName.textContent = userProfile.name || 'User';
    if (ddEmail) ddEmail.textContent = userProfile.email || '';
}

// Avatar dropdown toggle
document.getElementById('user-avatar-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('user-dropdown-menu').classList.toggle('open');
});
document.addEventListener('click', () => {
    document.getElementById('user-dropdown-menu')?.classList.remove('open');
});

// Dropdown actions
document.getElementById('dd-upgrade').addEventListener('click', () => {
    const plan = planStatus.plan || 'free';
    window.open(`https://web.bytesai.com/?upgrade=${plan}#pricing`, '_blank');
    document.getElementById('user-dropdown-menu').classList.remove('open');
});
document.getElementById('dd-profile-settings').addEventListener('click', () => {
    switchView('clients');
    document.getElementById('user-dropdown-menu').classList.remove('open');
});
document.getElementById('dd-dark-mode').addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    document.getElementById('dd-dark-mode').querySelector('svg').style.opacity = isLight ? '0.5' : '1';
    localStorage.setItem('dashboard_light_mode', isLight ? '1' : '0');
});

// Settings cog → settings view
document.getElementById('settings-cog-btn').addEventListener('click', () => switchView('clients'));

// --- Navigation ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-view');
        switchView(viewName);
        
        // Auto-close sidebar on mobile
        if (window.innerWidth <= 1000 && dashboardSidebar) {
            dashboardSidebar.classList.remove('active');
        }
    });
});

if (mobileMenuBtn && dashboardSidebar) {
    mobileMenuBtn.addEventListener('click', () => {
        dashboardSidebar.classList.add('active');
    });
}

if (closeSidebarBtn && dashboardSidebar) {
    closeSidebarBtn.addEventListener('click', () => {
        dashboardSidebar.classList.remove('active');
    });
}

function switchView(viewName) {
    navItems.forEach(nav => nav.classList.toggle('active', nav.getAttribute('data-view') === viewName));
    views.forEach(view => view.classList.toggle('hidden', view.id !== `${viewName}-view`));

    const titles = { leads: 'Captured Leads', logs: 'Chat Logs', clients: 'Manage Clients', chatbot: 'Chatbot & Installations', analytics: 'Analytics & Reports' };
    viewTitle.innerText = titles[viewName] || (viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (viewName === 'leads') loadLeads();
    if (viewName === 'logs') loadLogs();
    if (viewName === 'chatbot') loadChatbotView();
    if (viewName === 'analytics') loadAnalytics();
}

refreshBtn.addEventListener('click', () => {
    const activeView = document.querySelector('.nav-item.active').getAttribute('data-view');
    if (activeView === 'leads') loadLeads();
    if (activeView === 'logs') loadLogs();
    if (activeView === 'analytics') loadAnalytics();
});

// --- Data Fetching ---
async function loadLeads() {
    try {
        const res = await fetch(`${API_BASE}/api/leads`, {
            credentials: 'include'
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
            credentials: 'include'
        });
        if (!res.ok) return;

        const data = await res.json();
        renderLogs(data);
    } catch (e) { console.error(e); }
}

// --- Rendering ---
window.allLeads = [];

function renderLeads(leads) {
    window.allLeads = leads;
    // Pipeline Metrics Gamification (CRM logic)
    const pipelineCount = leads.filter(l => ['lead', 'opportunity', 'priority'].includes(l.pipeline_stage)).length;
    const draftedCount = leads.filter(l => l.pipeline_stage === 'drafting').length;
    const activeCount = leads.filter(l => l.pipeline_stage === 'active').length;

    document.getElementById('metric-captured').innerText = pipelineCount;
    document.getElementById('metric-drafted').innerText = draftedCount;
    document.getElementById('metric-active').innerText = activeCount;

    // Clear columns
    colLead.innerHTML = '';
    colPriority.innerHTML = '';
    colOpportunity.innerHTML = '';
    colCampaign.innerHTML = '';

    const counts = { lead: 0, priority: 0, opportunity: 0, campaign: 0 };

    leads.forEach(l => {
        let stage = l.pipeline_stage || 'lead';
        // Group sequencing sub-stages into the 'campaign' column for layout simplicity
        if (stage === 'drafting' || stage === 'active' || stage === 'sequence_generated') {
            stage = 'campaign';
        }

        counts[stage] = (counts[stage] || 0) + 1;

        const card = document.createElement('div');
        card.className = `lead-card ${l.locked ? 'lead-locked' : ''}`;
        card.draggable = !l.locked;
        card.dataset.id = l.id;
        
        card.innerHTML = `
            <div class="lead-card-header">
                <div class="lead-card-title">${escapeHtml(l.name)}</div>
                <div class="lead-card-budget">${escapeHtml(l.budget)}</div>
            </div>
            <div class="lead-card-email">${escapeHtml(l.email)}</div>
            <div class="lead-card-summary" title="${escapeHtml(l.summary)}">${escapeHtml(l.summary) || 'No summary provided.'}</div>
            ${l.next_best_action ? `
            <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem;">
                <strong style="color: var(--accent-color); display: block; margin-bottom: 0.25rem;">✨ Copilot Insight:</strong>
                <span style="color: var(--text-primary);">${escapeHtml(l.next_best_action)}</span>
            </div>` : ''}
            <div class="lead-card-footer">
                <div class="lead-card-time">${new Date(l.timestamp).toLocaleDateString()}</div>
                ${!l.locked ? `<button class="btn btn-outline manage-campaign-btn" data-id="${escapeHtml(String(l.id))}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">${isFreeLocked() ? '🔒 ' : ''}Campaign</button>` : ''}
            </div>
            <div style="margin-top: 0.5rem;">
                ${l.has_lightning_badge ? '<span class="badge" title="Lightning Response" style="background: rgba(234, 179, 8, 0.2); color: #eab308; border-color: #eab308; font-size: 0.7rem; display: inline-block; margin-right: 0.25rem;">⚡ Fast Action</span>' : ''}
                ${l.is_verified === 1 ? '<span class="badge" style="background: rgba(76, 175, 80, 0.2); color: #4CAF50; border-color: #4CAF50; font-size: 0.7rem; display: inline-block;">✅ Verified</span>' : '<span class="badge" style="background: rgba(244, 67, 54, 0.2); color: #F44336; border-color: #F44336; font-size: 0.7rem; display: inline-block;">⚠️ Unverified</span>'}
            </div>
        `;

        if (card.draggable) {
            card.addEventListener('dragstart', () => {
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        }

        if (stage === 'priority') colPriority.appendChild(card);
        else if (stage === 'opportunity') colOpportunity.appendChild(card);
        else if (stage === 'campaign') colCampaign.appendChild(card);
        else colLead.appendChild(card);
    });

    document.getElementById('count-lead').innerText = counts.lead;
    document.getElementById('count-priority').innerText = counts.priority;
    document.getElementById('count-opportunity').innerText = counts.opportunity;
    document.getElementById('count-campaign').innerText = counts.campaign;

    // Add event listeners for the Campaign buttons
    document.querySelectorAll('.manage-campaign-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const leadId = e.target.getAttribute('data-id');
            openSequenceModal(leadId);
        });
    });
}

// --- Drag and Drop Logic ---
[colLead, colPriority, colOpportunity, colCampaign].forEach(container => {
    container.addEventListener('dragover', e => {
        e.preventDefault();
        const draggable = document.querySelector('.dragging');
        if (draggable) {
            container.appendChild(draggable);
        }
    });

    container.addEventListener('drop', async e => {
        e.preventDefault();
        const draggable = document.querySelector('.dragging');
        if (draggable) {
            const newStage = container.getAttribute('data-stage');
            const leadId = draggable.dataset.id;
            
            // Optimistically update counts
            updateKanbanCounts();

            try {
                const res = await fetch(`${API_BASE}/api/leads/${leadId}/stage`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stage: newStage })
                });

                if (!res.ok) {
                    console.error('Failed to update stage');
                    loadLeads(); // revert
                }
            } catch (err) {
                console.error(err);
                loadLeads(); // revert
            }
        }
    });
});

function updateKanbanCounts() {
    document.getElementById('count-lead').innerText = colLead.querySelectorAll('.lead-card').length;
    document.getElementById('count-priority').innerText = colPriority.querySelectorAll('.lead-card').length;
    document.getElementById('count-opportunity').innerText = colOpportunity.querySelectorAll('.lead-card').length;
    document.getElementById('count-campaign').innerText = colCampaign.querySelectorAll('.lead-card').length;
}

function renderLogs(logs) {
    logsBody.innerHTML = logs.map(l => `
        <tr>
            <td>${new Date(l.timestamp).toLocaleString()}</td>
            <td><code>${escapeHtml(l.client_id)}</code></td>
            <td style="max-width: 300px;">${escapeHtml(l.user_message)}</td>
            <td style="max-width: 300px;">${escapeHtml(l.bot_response)}</td>
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
            credentials: 'include'
        });

        if (res.ok) {
            const data = await res.json();
            configPrompt.value = data.systemPrompt || '';
            configMode.value = data.mode || 'free';
            configCompanyName.value = data.companyName || '';
            configBranding.checked = data.showBranding !== false;
            configReferral.value = data.referralId || '';

            // White-label section visibility
            if (whiteLabelSection) {
                if (data.whiteLabelEnabled) {
                    whiteLabelSection.style.display = 'block';
                    configWidgetName.value = data.widgetName || '';
                    const color = data.widgetAccentColor || '#6366f1';
                    configWidgetColor.value = color;
                    configWidgetColorPicker.value = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6366f1';
                    configWidgetAvatar.value = data.widgetAvatar || '';
                } else {
                    whiteLabelSection.style.display = 'none';
                }
            }

            // Badge mandatory on free (lifetime), trial, and starter — removable on pro+
            const brandingLocked = data.brandingMandatory ?? (data.inTrial || data.plan === 'free' || data.plan === 'starter');
            if (brandingLocked) {
                configBranding.checked = true;
                configBranding.disabled = true;
                configBranding.onclick = (e) => { e.preventDefault(); showUpgradeModal('remove_branding'); };
                const lockNote = data.inTrial
                    ? ' 🔒 (Trial — Pro+ to remove)'
                    : data.plan === 'starter'
                        ? ' 🔒 (Starter — upgrade to Pro to remove)'
                        : ' 🔒 (Free — upgrade to Pro to remove)';
                configBranding.parentElement.querySelector('label').innerText = `Show "Powered by BytesAI"${lockNote}`;
            } else {
                configBranding.disabled = false;
                configBranding.onclick = null;
                configBranding.parentElement.querySelector('label').innerText = "Show \"Powered by BytesAI\"";
            }
            configStatus.innerText = "Settings loaded!";
            configStatus.style.color = "var(--success)";

            // LOAD CRM SETTINGS (Mode/Auto-Approve)
            const crmRes = await fetch(`${API_BASE}/api/crm-settings?clientId=${cid}`, {
                credentials: 'include'
            });
            if (crmRes.ok) {
                const crmData = await crmRes.json();
                configCampaignMode.value = crmData.default_campaign_mode || 'ai';
                configAutoApprove.checked = crmData.auto_approve_campaigns === 1;
            }
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

    const settings = {
        systemPrompt: prompt,
        mode: mode,
        companyName: configCompanyName.value,
        showBranding: branding,
        referralId: referral
    };

    // Include white-label fields if the section is visible
    if (whiteLabelSection && whiteLabelSection.style.display !== 'none') {
        if (configWidgetName.value.trim()) settings.widgetName = configWidgetName.value.trim();
        if (configWidgetColor.value.trim()) settings.widgetAccentColor = configWidgetColor.value.trim();
        if (configWidgetAvatar.value.trim()) settings.widgetAvatar = configWidgetAvatar.value.trim();
    }

    configStatus.innerText = "Saving...";
    try {
        const res = await fetch(`${API_BASE}/api/config`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: cid, settings })
        });

        if (res.ok) {
            configStatus.innerText = "Settings saved successfully!";
            configStatus.style.color = "var(--success)";

            // SAVE CRM SETTINGS
            await fetch(`${API_BASE}/api/crm-settings`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: cid,
                    default_campaign_mode: configCampaignMode.value,
                    auto_approve_campaigns: configAutoApprove.checked
                })
            });
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
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
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

const toggleAiBtn = document.getElementById('toggle-ai');
const toggleManualBtn = document.getElementById('toggle-manual');
const toggleRuleBtn = document.getElementById('toggle-rule');
const addManualStepBtn = document.getElementById('add-manual-step-btn');
const templateSelectorContainer = document.getElementById('template-selector-container');
const templateSelect = document.getElementById('template-select');

let currentLeadId = null;
let currentSequences = [];
let campaignMode = 'ai';
let availableTemplates = [];

function updateModeUI(mode) {
    if (toggleAiBtn) {
        toggleAiBtn.style.background = mode === 'ai' ? 'var(--accent-color)' : 'transparent';
        toggleAiBtn.style.color = mode === 'ai' ? 'white' : 'var(--text-secondary)';
    }
    if (toggleManualBtn) {
        toggleManualBtn.style.background = mode === 'manual' ? 'var(--accent-color)' : 'transparent';
        toggleManualBtn.style.color = mode === 'manual' ? 'white' : 'var(--text-secondary)';
    }
    if (toggleRuleBtn) {
        toggleRuleBtn.style.background = mode === 'rule' ? 'var(--accent-color)' : 'transparent';
        toggleRuleBtn.style.color = mode === 'rule' ? 'white' : 'var(--text-secondary)';
    }

    if (addManualStepBtn) {
        if (mode === 'manual') addManualStepBtn.classList.remove('hidden');
        else addManualStepBtn.classList.add('hidden');
    }

    if (templateSelectorContainer) {
        if (mode === 'rule') templateSelectorContainer.classList.remove('hidden');
        else templateSelectorContainer.classList.add('hidden');
    }
}

async function loadTemplates() {
    if (availableTemplates.length > 0) return;
    try {
        const res = await fetch(`${API_BASE}/api/templates`, { credentials: 'include' });
        availableTemplates = await res.json();
        
        if (templateSelect) {
            templateSelect.innerHTML = '<option value="">-- Choose a predefined sequence --</option>' +
                availableTemplates.map(t => `<option value="${Number(t.id)}">${escapeHtml(t.name)}</option>`).join('');
        }
    } catch (e) { console.error('Error loading templates', e); }
}

if (templateSelect) {
    templateSelect.addEventListener('change', (e) => {
        const tId = e.target.value;
        if (!tId) return;
        const template = availableTemplates.find(t => t.id == tId);
        if (template) {
            currentSequences = JSON.parse(template.steps_json).map(s => ({...s, status: 'draft'}));
            renderSequenceEditor();
        }
    });
}

// ─── Upgrade Gate Modal ───────────────────────────────────────────────────────

// Helper — true when user is on post-trial free plan
function isFreeLocked() {
    return !planStatus.inTrial && planStatus.plan === 'free';
}

const UPGRADE_FEATURES = {
    ai_campaigns: {
        title: 'AI Campaign Generation',
        subtitle: 'Let Gemini AI write personalised email sequences based on each lead\'s chat history — automatically.',
        features: [
            '✨ AI-written email sequences per lead',
            '🚀 Auto-approve and deploy campaigns',
            '📈 Unlimited campaigns per month',
            '🎯 PAS framework optimised copy',
        ],
        plan: 'Starter',
    },
    approve_deploy: {
        title: 'Approve & Deploy Campaigns',
        subtitle: 'Instantly deploy email sequences to start the drip campaign to your lead.',
        features: [
            '📤 One-click campaign deployment',
            '⏱️ Automated drip scheduling',
            '📊 Campaign performance tracking',
        ],
        plan: 'Starter',
    },
    remove_branding: {
        title: 'Remove "Powered by BytesAI" Badge',
        subtitle: 'White-label the chatbot widget — no BytesAI attribution visible to your visitors.',
        features: [
            '🏷️ Full white-label widget',
            '🎨 Your brand, your identity',
            '💼 Professional client deployments',
            '📎 Free & Starter plans keep the badge as a referral link',
        ],
        plan: 'Pro',
    },
    more_domains: {
        title: 'More Installation Domains',
        subtitle: 'Install your chatbot on multiple websites and subdomains simultaneously.',
        features: [
            '🌐 3 domains on Starter, 10 on Pro, 50 on Business',
            '✱ Wildcard subdomain support (*.yoursite.com)',
            '🔄 Manage all installations from one dashboard',
        ],
        plan: 'Starter',
    },
};

function showUpgradeModal(featureKey) {
    const feature = UPGRADE_FEATURES[featureKey] || UPGRADE_FEATURES.ai_campaigns;
    const modal = document.getElementById('upgrade-modal');
    if (!modal) return;

    document.getElementById('upgrade-modal-title').textContent = `Unlock: ${feature.title}`;
    document.getElementById('upgrade-modal-subtitle').textContent = feature.subtitle;
    document.getElementById('upgrade-modal-plan-badge').textContent = `Requires ${feature.plan} plan or above`;

    const featureList = document.getElementById('upgrade-modal-features');
    featureList.innerHTML = feature.features.map(f =>
        `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.75rem;background:rgba(255,255,255,0.04);border-radius:8px;font-size:0.83rem;color:#cbd5e1;">${escapeHtml(f)}</div>`
    ).join('');

    modal.style.display = 'flex';
    // Animate in
    const box = modal.querySelector('div');
    if (box) { box.style.transform = 'scale(0.93)'; box.style.opacity = '0'; requestAnimationFrame(() => { box.style.transition = 'transform 0.2s ease, opacity 0.2s ease'; box.style.transform = 'scale(1)'; box.style.opacity = '1'; }); }
}

function hideUpgradeModal() {
    const modal = document.getElementById('upgrade-modal');
    if (modal) modal.style.display = 'none';
}

// Modal controls
document.getElementById('upgrade-modal-close')?.addEventListener('click', hideUpgradeModal);
document.getElementById('upgrade-modal-dismiss')?.addEventListener('click', hideUpgradeModal);
document.getElementById('upgrade-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('upgrade-modal')) hideUpgradeModal();
});
document.getElementById('upgrade-modal-cta')?.addEventListener('click', () => {
    const plan = planStatus.plan || 'free';
    window.open(`https://web.bytesai.com/?upgrade=${plan}#pricing`, '_blank');
    hideUpgradeModal();
});
// Remove the old inline banner button
document.getElementById('modal-upgrade-btn')?.addEventListener('click', () => {
    showUpgradeModal('ai_campaigns');
});

function applyModalPlanState() {
    const locked = isFreeLocked();
    const lockIcon = document.getElementById('toggle-ai-lock');
    const upgradeBanner = document.getElementById('upgrade-prompt-banner');
    if (lockIcon) lockIcon.style.display = locked ? 'inline' : 'none';
    if (upgradeBanner) upgradeBanner.style.display = locked ? 'block' : 'none';
    if (locked && toggleAiBtn) {
        toggleAiBtn.style.opacity = '0.45';
        toggleAiBtn.title = 'AI generation requires a paid plan';
    } else if (toggleAiBtn) {
        toggleAiBtn.style.opacity = '';
        toggleAiBtn.title = '';
    }
}

if (toggleAiBtn) {
    toggleAiBtn.addEventListener('click', () => {
        if (isFreeLocked()) {
            showUpgradeModal('ai_campaigns');
            return;
        }
        campaignMode = 'ai';
        updateModeUI('ai');
        if (!currentSequences || currentSequences.length === 0 || (currentSequences.length > 0 && !currentSequences[0].id)) {
            if (currentLeadId) openSequenceModal(currentLeadId);
        }
    });
}

if (toggleManualBtn) {
    toggleManualBtn.addEventListener('click', () => {
        campaignMode = 'manual';
        updateModeUI('manual');
        if (!currentSequences || currentSequences.length === 0) {
            currentSequences = [{ email_number: 1, subject: '', body: '', status: 'draft' }];
            renderSequenceEditor();
        }
    });
}

if (toggleRuleBtn) {
    toggleRuleBtn.addEventListener('click', async () => {
        campaignMode = 'rule';
        updateModeUI('rule');
        await loadTemplates();
        
        if (!currentSequences[0]?.id) {
            currentSequences = [];
            renderSequenceEditor();
        }
    });
}

if (addManualStepBtn) {
    addManualStepBtn.addEventListener('click', () => {
        const nextNum = currentSequences.length + 1;
        // make sure to preserve any changes user already typed in
        for (let i = 0; i < currentSequences.length; i++) {
            const subjEl = document.getElementById(`seq-subject-${i}`);
            const bodyEl = document.getElementById(`seq-body-${i}`);
            if (subjEl) currentSequences[i].subject = subjEl.value;
            if (bodyEl) currentSequences[i].body = bodyEl.value;
        }
        currentSequences.push({ email_number: nextNum, subject: '', body: '', status: 'draft' });
        renderSequenceEditor();
    });
}

closeSequenceModalBtn.addEventListener('click', () => {
    sequenceModal.classList.add('hidden');
});

async function openSequenceModal(leadId) {
    currentLeadId = leadId;
    // Free plan (post-trial): default to manual mode — AI is locked
    const startMode = isFreeLocked() ? 'manual' : 'ai';
    campaignMode = startMode;
    updateModeUI(startMode);

    sequenceModal.classList.remove('hidden');
    sequenceEditorContainer.innerHTML = '';
    saveSequenceBtn.classList.add('hidden');
    approveSequenceBtn.classList.add('hidden');
    sequenceStatus.innerText = '';

    // Apply lock state for the plan
    applyModalPlanState();

    // Get context on the current lead
    const lead = window.allLeads?.find(l => l.id == leadId);
    if (lead && lead.is_verified === 0) {
        sequenceStatus.innerText = '⚠️ Lead Email Unverified. You can draft sequences, but you cannot approve/send them yet.';
        sequenceStatus.style.color = '#F44336';
        approveSequenceBtn.disabled = true;
        approveSequenceBtn.style.opacity = '0.5';
        approveSequenceBtn.style.cursor = 'not-allowed';
    } else {
        approveSequenceBtn.disabled = false;
        approveSequenceBtn.style.opacity = '1';
        approveSequenceBtn.style.cursor = 'pointer';
    }

    // Fetch existing sequences
    sequenceLoading.classList.remove('hidden');
    try {
        const res = await fetch(`${API_BASE}/api/sequences?leadId=${leadId}`, {
            credentials: 'include'
        });
        const data = await res.json();

        if (data && data.length > 0) {
            currentSequences = data;

            if (addManualStepBtn && campaignMode === 'manual') {
                addManualStepBtn.classList.remove('hidden');
            }

            renderSequenceEditor();
        } else {
            if (campaignMode === 'ai') {
                await generateSequence(leadId);
            } else {
                currentSequences = [{ email_number: 1, subject: '', body: '', status: 'draft' }];
                renderSequenceEditor();
            }
        }
    } catch (e) {
        sequenceStatus.innerText = 'Error loading sequence.';
    } finally {
        sequenceLoading.classList.add('hidden');
    }
}

async function generateSequence(leadId) {
    sequenceStatus.innerText = '';

    // Block AI generation for post-trial free accounts
    if (!planStatus.inTrial && planStatus.plan === 'free') {
        sequenceStatus.innerText = '🔒 AI generation is not available on the Free plan. Upgrade to unlock this feature.';
        sequenceStatus.style.color = 'var(--warning, #f59e0b)';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/generate-sequence`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId })
        });
        if (res.ok) {
            const seqRes = await fetch(`${API_BASE}/api/sequences?leadId=${leadId}`, {
                credentials: 'include'
            });
            currentSequences = await seqRes.json();
            renderSequenceEditor();
        } else {
            const errData = await res.json().catch(() => ({}));
            sequenceStatus.innerText = errData.planLimited
                ? '🔒 AI generation is not available on the Free plan. Upgrade to unlock this feature.'
                : 'Failed to generate sequence via AI.';
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
            <h4 style="margin-top: 0; margin-bottom: 1rem; color: var(--accent-color); font-size: 1.1rem;">Email ${Number(seq.email_number)} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-secondary);">(Sends approx ${Number(seq.email_number)} day${seq.email_number > 1 ? 's' : ''} after approval)</span></h4>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">Subject Line</label>
                <input type="text" id="seq-subject-${index}" value="${escapeHtml(seq.subject)}" ${isApproved ? 'disabled' : ''} style="width: 100%; padding: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); color: white; border-radius: 4px;">
            </div>
            <div class="form-group">
                <label style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">Body</label>
                <textarea id="seq-body-${index}" style="width: 100%; min-height: 200px; padding: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); color: white; border-radius: 4px; resize: vertical;" ${isApproved ? 'disabled' : ''}>${escapeHtml(seq.body)}</textarea>
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
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: seq.id, 
                    leadId: currentLeadId,
                    email_number: seq.email_number,
                    subject, 
                    body 
                })
            });
        }
        
        // Re-fetch to get any newly assigned IDs from manual insertion
        const seqRes = await fetch(`${API_BASE}/api/sequences?leadId=${currentLeadId}`, {
            credentials: 'include'
        });
        currentSequences = await seqRes.json();
        renderSequenceEditor();
        sequenceStatus.innerText = 'Drafts saved successfully.';
        sequenceStatus.style.color = 'var(--success)';
    } catch (e) {
        sequenceStatus.innerText = 'Error saving drafts.';
        sequenceStatus.style.color = 'var(--error)';
    }
});

approveSequenceBtn.addEventListener('click', async () => {
    if (isFreeLocked()) { showUpgradeModal('approve_deploy'); return; }
    if (!confirm('Are you sure you want to approve this sequence? It will be drip-fed to the lead automatically.')) return;

    // Save first just in case
    await saveSequenceBtn.click();

    sequenceStatus.innerText = 'Approving Campaign...';
    try {
        const res = await fetch(`${API_BASE}/api/sequences/approve`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
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

// ─── Chatbot & Installations View ────────────────────────────────────────────

const PLAN_INSTALL_LIMITS = {
    free:       { maxInstalls: 1,  maxDomains: 1  },
    starter:    { maxInstalls: 3,  maxDomains: 3  },
    pro:        { maxInstalls: 10, maxDomains: 10 },
    business:   { maxInstalls: 50, maxDomains: 50 },
    enterprise: { maxInstalls: -1, maxDomains: -1 },
};

let installationData = { clientId: '', allowedDomains: [], maxInstalls: 1, maxDomains: 1, plan: 'free', inTrial: true };

async function loadChatbotView() {
    try {
        const res = await fetch(`${API_BASE}/api/installations`, { credentials: 'include' });
        if (!res.ok) return;
        installationData = await res.json();
    } catch { /* use cached */ }
    renderChatbotView();
}

function renderChatbotView() {
    const { clientId, allowedDomains, maxInstalls, maxDomains, plan, inTrial } = installationData;

    // Embed code
    const embedEl = document.getElementById('dash-embed-code');
    if (embedEl && clientId) {
        embedEl.textContent = `<!-- BytesAI Chatbot Widget Start -->\n<script src="https://ai.bytesfx.com/widget.js"\n  data-client-id="${escapeHtml(clientId)}"></` + `script>\n<!-- BytesAI Chatbot Widget End -->`;
    }

    // Plan badge
    const planBadge = document.getElementById('dash-install-plan-badge');
    if (planBadge) planBadge.textContent = inTrial ? `Trial · ${planStatus.trialDaysLeft || 0}d left` : (plan.charAt(0).toUpperCase() + plan.slice(1));

    // Limits
    const maxInstallsEl = document.getElementById('dash-max-installs');
    const maxDomainsEl = document.getElementById('dash-max-domains');
    if (maxInstallsEl) maxInstallsEl.textContent = maxInstalls === -1 ? '∞' : maxInstalls;
    if (maxDomainsEl) maxDomainsEl.textContent = maxDomains === -1 ? '∞' : maxDomains;

    const noteEl = document.getElementById('dash-install-limit-note');
    if (noteEl) {
        const domLabel = maxDomains === -1 ? 'unlimited domains' : `<strong style="color:#e2e8f0;">${maxDomains} domain${maxDomains !== 1 ? 's' : ''}</strong>`;
        noteEl.innerHTML = inTrial
            ? `Your 7-day trial runs on Free plan limits — ${domLabel}. Choose a paid plan when your trial ends to expand.`
            : plan === 'free'
                ? `Your <strong style="color:#e2e8f0;">Free</strong> plan includes ${domLabel} — this is a permanent tier. Upgrade anytime to add more.`
                : `Your <strong style="color:#e2e8f0;">${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong> plan allows ${domLabel}.`;
    }

    // Upgrade button
    const upgBtn = document.getElementById('dash-upgrade-install-btn');
    if (upgBtn) {
        upgBtn.style.display = (maxDomains === -1) ? 'none' : 'block';
        upgBtn.onclick = () => showUpgradeModal('more_domains');
    }

    // Domain list
    renderDomainList(allowedDomains, maxDomains);
}

function renderDomainList(domains, maxDomains) {
    const list = document.getElementById('dash-domain-list');
    const countEl = document.getElementById('dash-domain-count');
    const limitEl = document.getElementById('dash-domain-limit');
    if (!list) return;

    if (countEl) countEl.textContent = domains.length;
    if (limitEl) limitEl.textContent = maxDomains === -1 ? '∞' : maxDomains;

    list.innerHTML = '';
    if (domains.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary);font-size:0.82rem;font-style:italic;margin:0;">No domains added yet. Add your first domain below.</p>';
        return;
    }
    domains.forEach((domain, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:0.75rem;background:rgba(0,0,0,0.25);border-radius:10px;padding:0.55rem 1rem;';
        row.innerHTML = `<span style="flex:1;font-size:0.85rem;color:#e2e8f0;">${escapeHtml(domain)}</span>
            <button data-index="${i}" class="domain-remove-btn" style="background:none;border:none;color:#f87171;cursor:pointer;font-size:0.8rem;padding:0.15rem 0.4rem;border-radius:4px;" title="Remove">✕</button>`;
        list.appendChild(row);
    });
    list.querySelectorAll('.domain-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            installationData.allowedDomains.splice(idx, 1);
            renderDomainList(installationData.allowedDomains, installationData.maxDomains);
        });
    });
}

document.getElementById('dash-add-domain-btn').addEventListener('click', () => {
    const input = document.getElementById('dash-new-domain');
    const val = input.value.trim().toLowerCase();
    if (!val) return;
    const domainRe = /^(\*\.)?[a-zA-Z0-9][a-zA-Z0-9\-\.]{0,252}[a-zA-Z0-9]$/;
    if (!domainRe.test(val)) {
        document.getElementById('dash-domains-status').textContent = 'Invalid domain format.';
        document.getElementById('dash-domains-status').style.color = '#f87171';
        return;
    }
    const { maxDomains, allowedDomains } = installationData;
    if (maxDomains !== -1 && allowedDomains.length >= maxDomains) {
        showUpgradeModal('more_domains');
        return;
    }
    if (allowedDomains.includes(val)) {
        document.getElementById('dash-domains-status').textContent = 'Domain already in list.';
        document.getElementById('dash-domains-status').style.color = '#f59e0b';
        return;
    }
    installationData.allowedDomains.push(val);
    input.value = '';
    document.getElementById('dash-domains-status').textContent = '';
    renderDomainList(installationData.allowedDomains, installationData.maxDomains);
});

document.getElementById('dash-new-domain').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('dash-add-domain-btn').click(); }
});

document.getElementById('dash-save-domains-btn').addEventListener('click', async () => {
    const btn = document.getElementById('dash-save-domains-btn');
    const status = document.getElementById('dash-domains-status');
    btn.textContent = 'Saving…';
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/installations`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowedDomains: installationData.allowedDomains }),
        });
        const data = await res.json();
        if (res.ok) {
            installationData.allowedDomains = data.allowedDomains;
            status.textContent = '✓ Domains saved!';
            status.style.color = '#34d399';
            renderDomainList(installationData.allowedDomains, installationData.maxDomains);
        } else {
            status.textContent = data.error || 'Save failed.';
            status.style.color = '#f87171';
        }
    } catch {
        status.textContent = 'Network error.';
        status.style.color = '#f87171';
    } finally {
        btn.textContent = 'Save Domains';
        btn.disabled = false;
        setTimeout(() => { if (status.textContent.startsWith('✓')) status.textContent = ''; }, 3000);
    }
});

document.getElementById('dash-copy-embed-btn').addEventListener('click', () => {
    const code = document.getElementById('dash-embed-code')?.textContent;
    if (!code) return;
    navigator.clipboard.writeText(code);
    const btn = document.getElementById('dash-copy-embed-btn');
    btn.textContent = 'Copied! ✅';
    setTimeout(() => { btn.textContent = 'Copy Code'; }, 2000);
});

// ─── Analytics & Reports ──────────────────────────────────────────────────────

let analyticsDays = 7;
let analyticsListenersAttached = false;

async function loadAnalytics() {
    if (!window.allLeads || window.allLeads.length === 0) {
        await loadLeads();
    }
    renderAnalytics(window.allLeads || []);

    if (!analyticsListenersAttached) {
        analyticsListenersAttached = true;
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                analyticsDays = parseInt(btn.dataset.days, 10);
                renderAnalytics(window.allLeads || []);
            });
        });
    }
}

function renderAnalytics(leads) {
    const now = Date.now();
    const cutoff = analyticsDays > 0 ? now - analyticsDays * 86400000 : 0;
    const filtered = analyticsDays > 0
        ? leads.filter(l => new Date(l.timestamp).getTime() > cutoff)
        : leads;

    const total = filtered.length;
    const todayCount = leads.filter(l => new Date(l.timestamp).getTime() > now - 86400000).length;

    const totalLeadsEl = document.getElementById('kpi-total-leads');
    const leadsDeltaEl = document.getElementById('kpi-leads-delta');
    if (totalLeadsEl) totalLeadsEl.textContent = total;
    if (leadsDeltaEl) {
        leadsDeltaEl.textContent = `+${todayCount} today`;
        leadsDeltaEl.style.color = todayCount > 0 ? '#34d399' : 'var(--text-secondary)';
    }

    // Pipeline value
    let totalValue = 0, hasValue = false;
    filtered.forEach(l => {
        const n = parseBudgetValue(l.budget);
        if (n > 0) { totalValue += n; hasValue = true; }
    });
    const pipelineEl = document.getElementById('kpi-pipeline-value');
    const valueNoteEl = document.getElementById('kpi-value-note');
    if (pipelineEl) pipelineEl.textContent = hasValue ? formatCurrencyShort(totalValue) : 'N/A';
    if (valueNoteEl) valueNoteEl.textContent = hasValue ? `across ${total} lead${total !== 1 ? 's' : ''}` : 'no budget data';

    // Conversion rate: leads that reached opportunity or further
    const converted = filtered.filter(l =>
        ['opportunity', 'priority', 'campaign', 'active', 'drafting', 'sequence_generated'].includes(l.pipeline_stage)
    ).length;
    const rate = total > 0 ? Math.round((converted / total) * 100) : 0;
    const convEl = document.getElementById('kpi-conversion-rate');
    if (convEl) convEl.textContent = `${rate}%`;

    // Active campaigns
    const activeCampaigns = filtered.filter(l => l.pipeline_stage === 'active').length;
    const activeCampEl = document.getElementById('kpi-active-campaigns');
    if (activeCampEl) activeCampEl.textContent = activeCampaigns;

    // Charts
    renderLeadVolumeChart(leads, analyticsDays);
    renderFunnelChart(filtered);
    renderStageDonut(filtered);
    renderActivityFeed(leads);
}

function parseBudgetValue(str) {
    if (!str) return 0;
    const s = String(str).replace(/[£€$,\s]/g, '').toLowerCase();
    const m = s.match(/([\d.]+)([km]?)/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2] === 'k') n *= 1000;
    if (m[2] === 'm') n *= 1000000;
    return Math.round(n);
}

function formatCurrencyShort(n) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return `$${n}`;
}

function renderLeadVolumeChart(allLeadsData, days) {
    const chartEl = document.getElementById('lead-volume-chart');
    const labelsEl = document.getElementById('lead-volume-labels');
    const periodLabel = document.getElementById('volume-period-label');
    if (!chartEl || !labelsEl) return;

    if (periodLabel) {
        periodLabel.textContent = days === 0 ? 'All time' : `Last ${days} days`;
    }

    const effectiveDays = days === 0 ? 14 : Math.min(days, 30);
    const buckets = [];
    const now = new Date();
    for (let i = effectiveDays - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        buckets.push({ date: d, count: 0 });
    }

    (days === 0 ? allLeadsData : allLeadsData.filter(l => new Date(l.timestamp).getTime() > Date.now() - effectiveDays * 86400000))
        .forEach(l => {
            const ts = new Date(l.timestamp);
            ts.setHours(0, 0, 0, 0);
            const bucket = buckets.find(b => b.date.getTime() === ts.getTime());
            if (bucket) bucket.count++;
        });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);

    chartEl.innerHTML = buckets.map(b => {
        const pct = Math.max((b.count / maxCount) * 100, 2);
        return `<div class="bar-col">
            <div class="bar-fill" style="height:${pct}%;" title="${b.count} lead${b.count !== 1 ? 's' : ''}">
                ${b.count > 0 ? `<span class="bar-val">${b.count}</span>` : ''}
            </div>
        </div>`;
    }).join('');

    const step = effectiveDays > 14 ? 7 : effectiveDays > 7 ? 2 : 1;
    labelsEl.innerHTML = buckets.map((b, i) => {
        const show = (i % step === 0) || i === buckets.length - 1;
        return `<span class="bar-label" style="visibility:${show ? 'visible' : 'hidden'}">${b.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</span>`;
    }).join('');
}

function renderFunnelChart(leads) {
    const el = document.getElementById('pipeline-funnel-chart');
    if (!el) return;

    const stageGroups = [
        { label: 'Inbox',       keys: ['lead'],                                color: '#6366f1' },
        { label: 'Priority',    keys: ['priority'],                            color: '#f59e0b' },
        { label: 'Opportunity', keys: ['opportunity'],                         color: '#60a5fa' },
        { label: 'Campaign',    keys: ['drafting', 'sequence_generated', 'active', 'campaign'], color: '#34d399' },
    ];

    const counts = stageGroups.map(s => ({
        ...s,
        count: leads.filter(l => s.keys.includes(l.pipeline_stage)).length,
    }));

    const maxCount = Math.max(...counts.map(c => c.count), 1);

    el.innerHTML = counts.map((s, i) => {
        const pct = Math.max((s.count / maxCount) * 100, 3);
        const prev = counts[i - 1];
        const dropPct = prev && prev.count > 0
            ? Math.round((s.count / prev.count) * 100)
            : null;
        return `<div class="funnel-row">
            <span class="funnel-label">${escapeHtml(s.label)}</span>
            <div class="funnel-bar-wrap">
                <div class="funnel-bar" style="width:${pct}%;background:${s.color};"></div>
                <span class="funnel-count">${s.count}</span>
            </div>
            <span class="funnel-conv">${dropPct !== null ? `↓ ${dropPct}%` : ''}</span>
        </div>`;
    }).join('');
}

function renderStageDonut(leads) {
    const el = document.getElementById('stage-distribution-chart');
    if (!el) return;

    const stageConfig = [
        { key: 'lead',               label: 'Inbox',         color: '#6366f1' },
        { key: 'priority',           label: 'Priority',      color: '#f59e0b' },
        { key: 'opportunity',        label: 'Opportunity',   color: '#60a5fa' },
        { key: 'drafting',           label: 'Drafting',      color: '#a78bfa' },
        { key: 'sequence_generated', label: 'Seq. Ready',    color: '#818cf8' },
        { key: 'active',             label: 'Active',        color: '#34d399' },
    ];

    const total = leads.length;
    if (total === 0) {
        el.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;padding:1.5rem 0;text-align:center;">No data for period.</p>';
        return;
    }

    const slices = stageConfig
        .map(s => ({ ...s, count: leads.filter(l => l.pipeline_stage === s.key).length }))
        .filter(s => s.count > 0);

    const r = 54, cx = 68, cy = 68, sw = 22;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const circles = slices.map(s => {
        const dash = (s.count / total) * circ;
        const c = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" />`;
        offset += dash;
        return c;
    }).join('');

    const legend = slices.map(s => `
        <div class="legend-row">
            <span class="legend-dot" style="background:${s.color}"></span>
            <span class="legend-label">${escapeHtml(s.label)}</span>
            <span class="legend-count">${s.count}</span>
            <span class="legend-pct">${Math.round((s.count / total) * 100)}%</span>
        </div>`).join('');

    el.innerHTML = `<div class="donut-layout">
        <svg width="136" height="136" viewBox="0 0 136 136" style="transform:rotate(-90deg);flex-shrink:0;">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${sw}"/>
            ${circles}
        </svg>
        <div class="donut-legend">${legend}</div>
    </div>`;
}

function renderActivityFeed(leads) {
    const el = document.getElementById('activity-feed');
    if (!el) return;

    const sorted = [...leads]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 15);

    if (sorted.length === 0) {
        el.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem;padding:0.5rem 0;">No activity yet.</p>';
        return;
    }

    const stageIcon  = { lead: '👤', priority: '🔥', opportunity: '💡', drafting: '✍️', sequence_generated: '✨', active: '🚀', campaign: '✉️' };
    const stageEvent = { lead: 'Lead captured', priority: 'Marked priority', opportunity: 'Moved to opportunity', drafting: 'Campaign drafting', sequence_generated: 'AI sequence ready', active: 'Campaign activated', campaign: 'In campaign' };

    el.innerHTML = sorted.map(l => {
        const stage = l.pipeline_stage || 'lead';
        const icon  = stageIcon[stage]  || '📋';
        const event = stageEvent[stage] || stage;

        const age = Date.now() - new Date(l.timestamp).getTime();
        const rel = age < 60000       ? 'just now'
                  : age < 3600000     ? `${Math.floor(age / 60000)}m ago`
                  : age < 86400000    ? `${Math.floor(age / 3600000)}h ago`
                  : age < 604800000   ? `${Math.floor(age / 86400000)}d ago`
                  : new Date(l.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        return `<div class="activity-item">
            <span class="activity-icon">${icon}</span>
            <div class="activity-body">
                <span class="activity-name">${escapeHtml(l.name || 'Unknown')}</span>
                <span class="activity-event">${escapeHtml(event)}</span>
            </div>
            <span class="activity-time">${rel}</span>
        </div>`;
    }).join('');
}
