const API_BASE = "https://crm-api.bmorris0565.workers.dev";
const CHATBOT_API = "https://ai.bytesfx.com";

// apiFetch: always sends credentials (cookies) AND the stored JWT as Authorization header.
// The Authorization header is the primary auth mechanism on mobile (iOS Safari ITP blocks
// cross-site cookies from crm-api.bmorris0565.workers.dev when fetched from web.bytesfx.com).
function apiFetch(url, opts = {}) {
    const jwt = localStorage.getItem('bytes_session_jwt');
    return fetch(url, {
        ...opts,
        credentials: 'include',
        headers: {
            ...(opts.headers || {}),
            ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
        },
    });
}

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
        const errMap = { invalid_state: 'Security check failed. Please try again.', auth_failed: 'Authentication failed. Please try again.', no_code: 'Login was cancelled.', not_authorized: 'This account is not authorized to access the dashboard.' };
        loginError.innerText = errMap[params.get('social_error')] || 'Social login failed. Please try again.';
        history.replaceState(null, '', window.location.pathname);
        return;
    }

    // Redeem session grant from OAuth redirect (mobile-safe cookie establishment).
    // The grant token is exchanged via JS fetch so the cookie is set in response to an
    // active request — iOS Safari ITP does not discard these, unlike redirect-planted cookies.
    const sessionGrant = params.get('session_grant');
    if (sessionGrant) {
        history.replaceState(null, '', window.location.pathname);
        try {
            const res = await fetch(`${API_BASE}/api/auth/redeem-grant?token=${encodeURIComponent(sessionGrant)}`, { credentials: 'include' });
            if (res.ok) {
                const grantData = await res.json();
                // Store JWT in localStorage so apiFetch can send it as Authorization header.
                // This is the cross-domain mobile fix: iOS Safari ITP blocks third-party cookies
                // but cannot block Authorization headers on fetch requests.
                if (grantData.sessionToken) localStorage.setItem('bytes_session_jwt', grantData.sessionToken);
                const meRes = await apiFetch(`${API_BASE}/api/auth/me`);
                if (meRes.ok) {
                    const data = await meRes.json();
                    userRole = data.role || 'sales_rep';
                    localStorage.setItem('agency_user_role', userRole);
                    showDashboard();
                    return;
                }
            }
        } catch (_) {}
        loginError.innerText = 'Login session could not be established. Please try again.';
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
        const res = await apiFetch(`${API_BASE}/api/auth/me`);
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
                if (data.deviceTrustToken) localStorage.setItem('bytes_device_trust', data.deviceTrustToken);
                if (data.sessionToken) localStorage.setItem('bytes_session_jwt', data.sessionToken);
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
                if (data.deviceTrustToken) localStorage.setItem('bytes_device_trust', data.deviceTrustToken);
                if (data.sessionToken) localStorage.setItem('bytes_session_jwt', data.sessionToken);
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
    const key = document.getElementById('admin-key-input').value;
    const code = document.getElementById('totp-input').value.trim();
    if (!key) { loginError.innerText = 'Admin key required.'; return; }
    loginError.innerText = '';
    try {
        // Step 1: the admin key starts a pending login
        const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) { loginError.innerText = loginData.error || 'Invalid key.'; return; }

        let data = loginData;
        if (loginData.step === 'totp') {
            // Step 2: the authenticator code completes it
            if (!code) { loginError.innerText = 'Enter the 6-digit code.'; return; }
            const res = await fetch(`${API_BASE}/api/auth/totp`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, pendingId: loginData.pendingId })
            });
            data = await res.json();
            if (!res.ok) { loginError.innerText = data.error || 'Invalid code.'; return; }
        }
        userRole = data.role;
        localStorage.setItem('agency_user_role', data.role);
        if (data.sessionToken) localStorage.setItem('bytes_session_jwt', data.sessionToken);
        showDashboard();
    } catch {
        loginError.innerText = 'Connection error. Please try again.';
    }
});

document.getElementById('totp-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('totp-btn').click(); });

// Social login buttons — redirect to OAuth with redirect=dashboard
document.querySelectorAll('.btn-social').forEach(btn => {
    btn.addEventListener('click', async () => {
        const provider = btn.getAttribute('data-provider');
        // Preserve ?view= param across the OAuth round-trip
        const view = new URLSearchParams(window.location.search).get('view');
        if (view) sessionStorage.setItem('pendingView', view);
        // Pre-fetch device bypass token before OAuth redirect.
        // Passes localStorage trust token as query param (avoids cross-site cookie blocking).
        // Falls back to httpOnly cookie check on the server side.
        let bypassParam = '';
        try {
            const trustToken = localStorage.getItem('bytes_device_trust') || '';
            const bypassUrl = trustToken
                ? `${API_BASE}/api/auth/device-bypass?trust_token=${encodeURIComponent(trustToken)}`
                : `${API_BASE}/api/auth/device-bypass`;
            const res = await fetch(bypassUrl, { credentials: 'include' });
            if (res.ok) {
                const { token } = await res.json();
                if (token) bypassParam = `&bypass=${encodeURIComponent(token)}`;
            }
        } catch (_) {}
        window.location.href = `${API_BASE}/api/auth/${provider}?redirect=dashboard${bypassParam}`;
    });
});

logoutBtn.addEventListener('click', async () => {
    // H2: Clear the httpOnly session cookie server-side
    await apiFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' }).catch(() => {});
    localStorage.removeItem('agency_user_role');
    localStorage.removeItem('bytes_session_jwt');
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
            const res = await apiFetch(`${API_BASE}/api/auth/me`);
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
        const res = await apiFetch(`${API_BASE}/api/crm-settings`);
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
        const res = await apiFetch(`${API_BASE}/api/auth/me`);
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
    const showInitials = () => {
        if (avatarImg) avatarImg.style.display = 'none';
        if (!avatarInitials) return;
        avatarInitials.style.display = '';
        const words = userProfile.name ? userProfile.name.trim().split(/\s+/) : [];
        avatarInitials.textContent = words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : ((userProfile.name || '')[0] || '?').toUpperCase();
    };
    if (userProfile.picture && avatarImg) {
        avatarImg.referrerPolicy = 'no-referrer'; // Google avatar URLs can reject requests with a Referer
        avatarImg.onerror = showInitials;         // expired/blocked picture URL → fall back to initials
        avatarImg.src = userProfile.picture;
        avatarImg.style.display = 'block';
        if (avatarInitials) avatarInitials.style.display = 'none';
    } else {
        showInitials();
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
    window.open(`https://web.bytesfx.com/?upgrade=${plan}#pricing`, '_blank');
    document.getElementById('user-dropdown-menu').classList.remove('open');
});
// Settings live on the Chatbot page — jump to them and flash the card so the click is visibly answered
function openSettings() {
    switchView('chatbot');
    const card = document.getElementById('chatbot-settings-card');
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.style.outline = '2px solid var(--accent, #6366f1)';
    card.style.outlineOffset = '4px';
    setTimeout(() => { card.style.outline = ''; card.style.outlineOffset = ''; }, 1600);
}

document.getElementById('dd-profile-settings').addEventListener('click', () => {
    openSettings();
    document.getElementById('user-dropdown-menu').classList.remove('open');
});
document.getElementById('dd-dark-mode').addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    document.getElementById('dd-dark-mode').querySelector('svg').style.opacity = isLight ? '0.5' : '1';
    localStorage.setItem('dashboard_light_mode', isLight ? '1' : '0');
});

// Settings cog → chatbot/settings view
document.getElementById('settings-cog-btn').addEventListener('click', () => {
    openSettings();
    if (window.innerWidth <= 1000 && dashboardSidebar) dashboardSidebar.classList.remove('active');
});

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
    if (activeView === 'analytics') loadAnalytics(true);
});

// --- Data Fetching ---
async function loadLeads() {
    try {
        const res = await apiFetch(`${API_BASE}/api/leads`);

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
        const res = await apiFetch(`${API_BASE}/api/logs`);
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
    // Generated sequences land in 'campaign' (AI/rule generation) until approved → 'active'
    const draftedCount = leads.filter(l => ['campaign', 'drafting', 'sequence_generated'].includes(l.pipeline_stage)).length;
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
                card.dataset.fromStage = card.closest('[data-stage]')?.getAttribute('data-stage') || '';
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
            // Same column — nothing changed (and keeps 'active' campaigns from being reset to 'campaign')
            if (draggable.dataset.fromStage === newStage) return;
            
            // Optimistically update counts
            updateKanbanCounts();

            try {
                const res = await apiFetch(`${API_BASE}/api/leads/${leadId}/stage`, {
                    method: 'PUT',
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
        const res = await apiFetch(`${API_BASE}/api/config?clientId=${cid}`);

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
                // Not `disabled`: disabled inputs swallow clicks, so the upgrade prompt would never open
                configBranding.disabled = false;
                configBranding.setAttribute('aria-disabled', 'true');
                configBranding.onclick = (e) => { e.preventDefault(); showUpgradeModal('remove_branding'); };
                const lockNote = data.inTrial
                    ? ' 🔒 (Trial — Pro+ to remove)'
                    : data.plan === 'starter'
                        ? ' 🔒 (Starter — upgrade to Pro to remove)'
                        : ' 🔒 (Free — upgrade to Pro to remove)';
                configBranding.parentElement.querySelector('label').innerText = `Show "Powered by BytesAI"${lockNote}`;
            } else {
                configBranding.disabled = false;
                configBranding.removeAttribute('aria-disabled');
                configBranding.onclick = null;
                configBranding.parentElement.querySelector('label').innerText = "Show \"Powered by BytesAI\"";
            }
            configStatus.innerText = "Settings loaded!";
            configStatus.style.color = "var(--success)";

            // LOAD CRM SETTINGS (Mode/Auto-Approve)
            const crmRes = await apiFetch(`${API_BASE}/api/crm-settings?clientId=${cid}`);
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
        ...(mode ? { mode } : {}), // empty select = unknown stored value; keep it rather than resetting
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
        const res = await apiFetch(`${API_BASE}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: cid, settings })
        });

        if (res.ok) {
            // SAVE CRM SETTINGS
            const crmRes = await apiFetch(`${API_BASE}/api/crm-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: cid,
                    default_campaign_mode: configCampaignMode.value,
                    auto_approve_campaigns: configAutoApprove.checked
                })
            });
            configStatus.innerText = crmRes.ok ? "Settings saved successfully!" : "Chatbot settings saved, but campaign settings failed to save.";
            configStatus.style.color = crmRes.ok ? "var(--success)" : "var(--error)";
        } else {
            const err = await res.json().catch(() => ({}));
            configStatus.innerText = err.error || "Failed to save settings.";
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
        const res = await apiFetch(`${API_BASE}/api/test-lead`, {
            method: 'POST',
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
        const res = await apiFetch(`${API_BASE}/api/templates`);
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
    window.open(`https://web.bytesfx.com/?upgrade=${plan}#pricing`, '_blank');
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
    currentLeadId = Number(leadId); // API requires a numeric leadId
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
        const res = await apiFetch(`${API_BASE}/api/sequences?leadId=${leadId}`);
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
        const res = await apiFetch(`${API_BASE}/api/generate-sequence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: Number(leadId) })
        });
        if (res.ok) {
            const seqRes = await apiFetch(`${API_BASE}/api/sequences?leadId=${leadId}`);
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

// Returns true when every draft saved, so Approve can wait for it
async function saveDrafts() {
    sequenceStatus.innerText = 'Saving drafts...';
    sequenceStatus.style.color = 'white';

    try {
        for (let i = 0; i < currentSequences.length; i++) {
            const seq = currentSequences[i];
            const subject = document.getElementById(`seq-subject-${i}`).value;
            const body = document.getElementById(`seq-body-${i}`).value;

            const res = await apiFetch(`${API_BASE}/api/sequences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: seq.id,
                    leadId: currentLeadId,
                    email_number: seq.email_number,
                    subject,
                    body
                })
            });
            if (!res.ok) throw new Error('Save failed');
        }
        
        // Re-fetch to get any newly assigned IDs from manual insertion
        const seqRes = await apiFetch(`${API_BASE}/api/sequences?leadId=${currentLeadId}`);
        currentSequences = await seqRes.json();
        renderSequenceEditor();
        sequenceStatus.innerText = 'Drafts saved successfully.';
        sequenceStatus.style.color = 'var(--success)';
        return true;
    } catch (e) {
        sequenceStatus.innerText = 'Error saving drafts.';
        sequenceStatus.style.color = 'var(--error)';
        return false;
    }
}

saveSequenceBtn.addEventListener('click', saveDrafts);

approveSequenceBtn.addEventListener('click', async () => {
    if (isFreeLocked()) { showUpgradeModal('approve_deploy'); return; }
    if (!confirm('Are you sure you want to approve this sequence? It will be drip-fed to the lead automatically.')) return;

    // Save first so every step exists as a draft before approval
    if (!(await saveDrafts())) return;

    sequenceStatus.innerText = 'Approving Campaign...';
    try {
        const res = await apiFetch(`${API_BASE}/api/sequences/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: Number(currentLeadId) })
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
    loadModelCatalog();
    // Load installations first so we have clientId
    try {
        const res = await apiFetch(`${API_BASE}/api/installations`);
        if (res.ok) installationData = await res.json();
    } catch { /* use cached */ }
    renderChatbotView();

    const cid = installationData.clientId;
    if (!cid) return;

    // Fetch chatbot config, CRM settings, and mail settings in parallel
    const [configResult, crmResult, mailResult] = await Promise.allSettled([
        apiFetch(`${API_BASE}/api/config?clientId=${encodeURIComponent(cid)}`),
        apiFetch(`${API_BASE}/api/crm-settings`),
        apiFetch(`${API_BASE}/api/mail-settings`),
    ]);

    if (configResult.status === 'fulfilled' && configResult.value.ok) {
        populateChatbotSettings(await configResult.value.json());
    }
    if (crmResult.status === 'fulfilled' && crmResult.value.ok) {
        populateCampaignSettings(await crmResult.value.json());
    }
    if (mailResult.status === 'fulfilled' && mailResult.value.ok) {
        populateMailSettings(await mailResult.value.json());
    }
}

// ─── AI model picker (catalog + prices come from the chatbot service) ─────────
let modelCatalog = null;
let savedLlmModel = '';

const formatPrice = (n) => `$${Number(n) > 0 && Number(n) < 0.1 ? Number(n).toFixed(3) : Number(n).toFixed(2)}`;

async function loadModelCatalog() {
    const select = document.getElementById('settings-llm-model');
    if (!select || modelCatalog) return;
    try {
        const res = await fetch(`${CHATBOT_API}/public/models`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        modelCatalog = await res.json();
    } catch (e) {
        console.error('Model catalog load failed:', e);
        select.innerHTML = '<option value="">Default model (could not load the model list)</option>';
        return;
    }

    const def = modelCatalog.models.find(m => m.id === modelCatalog.defaultModel);
    select.innerHTML = '';
    select.appendChild(new Option(`Default — ${def ? def.name : modelCatalog.defaultModel}`, ''));

    // One group per provider, in catalog order
    const groups = new Map();
    for (const m of modelCatalog.models) {
        if (!groups.has(m.providerName)) {
            const og = document.createElement('optgroup');
            og.label = m.providerName;
            groups.set(m.providerName, og);
            select.appendChild(og);
        }
        const label = `${m.name} — ${formatPrice(m.inputPrice)} in / ${formatPrice(m.outputPrice)} out per 1M tokens${m.available ? '' : ' (no API key)'}`;
        const opt = new Option(label, m.id);
        opt.disabled = !m.available;
        groups.get(m.providerName).appendChild(opt);
    }
    select.value = savedLlmModel;
    if (select.value !== savedLlmModel) select.value = ''; // saved model no longer offered
    renderModelCost();
}

function renderModelCost() {
    const select = document.getElementById('settings-llm-model');
    const costEl = document.getElementById('settings-llm-cost');
    if (!select || !costEl || !modelCatalog) return;
    const id = select.value || modelCatalog.defaultModel;
    const m = modelCatalog.models.find(x => x.id === id);
    if (!m) { costEl.textContent = ''; return; }
    costEl.innerHTML = `Provider: <strong>${escapeHtml(m.providerName)}</strong> · Model: <code>${escapeHtml(m.id)}</code><br>`
        + `Cost: <strong>${formatPrice(m.inputPrice)}</strong> per 1M input tokens · <strong>${formatPrice(m.outputPrice)}</strong> per 1M output tokens`
        + (m.provider === 'openrouter' ? ' <span style="color:var(--text-secondary);">(live OpenRouter price)</span>' : '')
        + (m.available ? '' : `<br><span style="color:var(--warning, #f59e0b);">No ${escapeHtml(m.providerName)} API key is set on the chatbot server — replies will use the default model.</span>`);
}

document.getElementById('settings-llm-model')?.addEventListener('change', renderModelCost);

function populateChatbotSettings(data) {
    const nameEl   = document.getElementById('settings-company-name');
    const modeEl   = document.getElementById('settings-mode');
    const promptEl = document.getElementById('settings-prompt');
    const brandingEl = document.getElementById('settings-branding');
    const wlSection  = document.getElementById('settings-wl-section');

    if (nameEl)   nameEl.value   = data.companyName  || '';
    if (modeEl)   modeEl.value   = data.mode         || 'free';
    if (promptEl) promptEl.value = data.systemPrompt || '';

    savedLlmModel = data.llmModel || '';
    const llmSelect = document.getElementById('settings-llm-model');
    if (llmSelect && modelCatalog) { llmSelect.value = savedLlmModel; if (llmSelect.value !== savedLlmModel) llmSelect.value = ''; renderModelCost(); }
    const effortEl = document.getElementById('settings-llm-effort');
    if (effortEl) effortEl.value = ['low', 'medium', 'high'].includes(data.llmEffort) ? data.llmEffort : 'medium';

    if (brandingEl) {
        brandingEl.checked  = data.showBranding !== false;
        const locked = data.brandingMandatory ?? (data.inTrial || data.plan === 'free' || data.plan === 'starter');
        // Not `disabled`: disabled inputs swallow clicks, so the upgrade prompt would never open
        brandingEl.disabled = false;
        brandingEl.toggleAttribute('aria-disabled', locked);
        const noteEl = document.getElementById('settings-branding-note');
        if (noteEl) {
            if (locked) {
                noteEl.textContent = data.inTrial ? 'Required during your trial'
                    : data.plan === 'starter' ? 'Required on Starter — upgrade to Pro to remove'
                    : 'Required on Free — upgrade to Pro to remove';
                noteEl.style.color = '#f59e0b';
            } else {
                noteEl.textContent = 'Optional on your plan';
                noteEl.style.color = '';
            }
        }
        brandingEl.onclick = locked ? (e) => { e.preventDefault(); showUpgradeModal('remove_branding'); } : null;
    }

    if (wlSection) {
        wlSection.style.display = data.whiteLabelEnabled ? 'block' : 'none';
        if (data.whiteLabelEnabled) {
            const wlName  = document.getElementById('settings-wl-name');
            const wlColor = document.getElementById('settings-wl-color');
            const wlPicker = document.getElementById('settings-wl-color-picker');
            const wlAvatar = document.getElementById('settings-wl-avatar');
            if (wlName)   wlName.value   = data.widgetName        || '';
            if (wlAvatar) wlAvatar.value = data.widgetAvatar      || '';
            const color = data.widgetAccentColor || '#6366f1';
            if (wlColor)  wlColor.value  = color;
            if (wlPicker && /^#[0-9a-fA-F]{6}$/.test(color)) wlPicker.value = color;
        }
    }
}

function populateCampaignSettings(data) {
    const modeInput    = document.getElementById('settings-campaign-mode');
    const autoApprove  = document.getElementById('settings-auto-approve');
    const mode = data.default_campaign_mode || 'ai';
    if (modeInput)   modeInput.value   = mode;
    if (autoApprove) autoApprove.checked = data.auto_approve_campaigns === 1;
    updateCampaignModeUI(mode);
}

function updateCampaignModeUI(mode) {
    const descriptions = {
        ai:     'Gemini AI writes a personalised 5-email sequence based on each lead\'s chat history.',
        rule:   'A pre-configured template sequence is applied to each verified lead automatically.',
        manual: 'No sequence is generated — you write each campaign step manually.',
    };
    ['ai', 'rule', 'manual'].forEach(m => {
        document.getElementById(`settings-toggle-${m}`)?.classList.toggle('active', m === mode);
    });
    const desc = document.getElementById('settings-mode-description');
    if (desc) desc.textContent = descriptions[mode] || '';
}

function populateMailSettings(data) {
    const provider = data.provider || '';
    const providerEl = document.getElementById('settings-mail-provider');
    const fromName   = document.getElementById('settings-mail-from-name');
    const fromEmail  = document.getElementById('settings-mail-from-email');
    if (providerEl) providerEl.value = provider;
    if (fromName)   fromName.value   = data.fromName  || '';
    if (fromEmail)  fromEmail.value  = data.fromEmail || '';
    updateMailProviderUI(provider, data);
}

function updateMailProviderUI(provider, data = {}) {
    const apiSection   = document.getElementById('settings-mail-api-section');
    const smtpSection  = document.getElementById('settings-mail-smtp-section');
    const apiKeyLabel  = document.getElementById('settings-mail-api-key-label');
    const mgDomainGroup = document.getElementById('settings-mail-mailgun-domain-group');
    const apiKeyInput  = document.getElementById('settings-mail-api-key');

    if (provider === 'smtp') {
        if (apiSection)  apiSection.style.display  = 'none';
        if (smtpSection) smtpSection.style.display = 'block';
        const host     = document.getElementById('settings-mail-smtp-host');
        const port     = document.getElementById('settings-mail-smtp-port');
        const security = document.getElementById('settings-mail-smtp-security');
        const user     = document.getElementById('settings-mail-smtp-user');
        const pass     = document.getElementById('settings-mail-smtp-pass');
        if (host)     host.value     = data.smtpHost     || '';
        if (port)     port.value     = data.smtpPort     || '587';
        if (security) security.value = data.smtpSecurity || 'tls';
        if (user)     user.value     = data.smtpUser     || '';
        if (pass)     pass.value     = data.smtpPass     || '';
    } else if (provider) {
        if (apiSection)  apiSection.style.display  = 'block';
        if (smtpSection) smtpSection.style.display = 'none';
        if (apiKeyLabel) apiKeyLabel.textContent = provider === 'resend' ? 'API Key (re_...)'
            : provider === 'sendgrid' ? 'API Key (SG....)' : 'API Key';
        if (mgDomainGroup) mgDomainGroup.style.display = provider === 'mailgun' ? 'block' : 'none';
        if (apiKeyInput) apiKeyInput.value = data.apiKey || '';
        const mgDomain = document.getElementById('settings-mail-mailgun-domain');
        if (mgDomain) mgDomain.value = data.mailgunDomain || '';
    } else {
        if (apiSection)  apiSection.style.display  = 'none';
        if (smtpSection) smtpSection.style.display = 'none';
    }
}

function renderChatbotView() {
    const { clientId, maxInstalls, maxDomains, inTrial } = installationData;
    const allowedDomains = installationData.allowedDomains || [];
    const plan = installationData.plan || 'free';

    // Embed code
    const embedEl = document.getElementById('dash-embed-code');
    if (embedEl && clientId) {
        embedEl.textContent = `<!-- BytesAI Chatbot Widget Start -->\n<script src="https://web.bytesfx.com/widget.js"\n  data-client-id="${escapeHtml(clientId)}"></` + `script>\n<!-- BytesAI Chatbot Widget End -->`;
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
        const res = await apiFetch(`${API_BASE}/api/installations`, {
            method: 'POST',
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

// ─── Settings — Chatbot Behavior ─────────────────────────────────────────────

// White-label color picker sync
document.getElementById('settings-wl-color-picker')?.addEventListener('input', (e) => {
    const colorInput = document.getElementById('settings-wl-color');
    if (colorInput) colorInput.value = e.target.value;
});
document.getElementById('settings-wl-color')?.addEventListener('input', (e) => {
    const picker = document.getElementById('settings-wl-color-picker');
    if (picker && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) picker.value = e.target.value;
});

document.getElementById('settings-save-chatbot-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('settings-chatbot-status');
    const cid = installationData.clientId;
    if (!cid) { statusEl.textContent = 'Not connected.'; statusEl.style.color = 'var(--error)'; return; }

    const settings = {
        companyName:  document.getElementById('settings-company-name')?.value.trim() || '',
        systemPrompt: document.getElementById('settings-prompt')?.value.trim() || '',
        showBranding: document.getElementById('settings-branding')?.checked !== false,
    };
    const modeVal = document.getElementById('settings-mode')?.value;
    if (modeVal) settings.mode = modeVal;
    // Only send the model once the list loaded, so a failed load can't wipe the saved choice
    if (modelCatalog) settings.llmModel = document.getElementById('settings-llm-model')?.value || '';
    settings.llmEffort = document.getElementById('settings-llm-effort')?.value || 'medium';

    const wlSection = document.getElementById('settings-wl-section');
    if (wlSection && wlSection.style.display !== 'none') {
        const name   = document.getElementById('settings-wl-name')?.value.trim();
        const color  = document.getElementById('settings-wl-color')?.value.trim();
        const avatar = document.getElementById('settings-wl-avatar')?.value.trim();
        if (name)   settings.widgetName         = name;
        if (color)  settings.widgetAccentColor  = color;
        if (avatar) settings.widgetAvatar       = avatar;
    }

    statusEl.textContent = 'Saving…'; statusEl.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: cid, settings }),
        });
        if (res.ok) {
            statusEl.textContent = '✓ Saved!'; statusEl.style.color = 'var(--success)';
            setTimeout(() => { if (statusEl.textContent.startsWith('✓')) statusEl.textContent = ''; }, 3000);
        } else {
            const err = await res.json().catch(() => ({}));
            statusEl.textContent = err.error || 'Save failed.'; statusEl.style.color = 'var(--error)';
        }
    } catch { statusEl.textContent = 'Network error.'; statusEl.style.color = 'var(--error)'; }
});

// ─── Settings — Campaign Automation ──────────────────────────────────────────

['ai', 'rule', 'manual'].forEach(mode => {
    document.getElementById(`settings-toggle-${mode}`)?.addEventListener('click', () => {
        const modeInput = document.getElementById('settings-campaign-mode');
        if (modeInput) modeInput.value = mode;
        updateCampaignModeUI(mode);
    });
});

document.getElementById('settings-save-campaign-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('settings-campaign-status');
    const cid = installationData.clientId;
    if (!cid) { statusEl.textContent = 'Not connected.'; statusEl.style.color = 'var(--error)'; return; }

    const mode = document.getElementById('settings-campaign-mode')?.value || 'ai';
    const autoApprove = document.getElementById('settings-auto-approve')?.checked || false;

    statusEl.textContent = 'Saving…'; statusEl.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/crm-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: cid, default_campaign_mode: mode, auto_approve_campaigns: autoApprove }),
        });
        if (res.ok) {
            statusEl.textContent = '✓ Saved!'; statusEl.style.color = 'var(--success)';
            setTimeout(() => { if (statusEl.textContent.startsWith('✓')) statusEl.textContent = ''; }, 3000);
        } else {
            statusEl.textContent = 'Save failed.'; statusEl.style.color = 'var(--error)';
        }
    } catch { statusEl.textContent = 'Network error.'; statusEl.style.color = 'var(--error)'; }
});

// ─── Settings — Email Sender ──────────────────────────────────────────────────

document.getElementById('settings-mail-provider').addEventListener('change', (e) => {
    updateMailProviderUI(e.target.value);
});

document.getElementById('settings-save-mail-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('settings-mail-status');
    const provider  = document.getElementById('settings-mail-provider')?.value || '';
    const fromName  = document.getElementById('settings-mail-from-name')?.value.trim() || '';
    const fromEmail = document.getElementById('settings-mail-from-email')?.value.trim() || '';

    const body = { provider, fromName, fromEmail };

    if (provider === 'smtp') {
        body.smtpHost     = document.getElementById('settings-mail-smtp-host')?.value.trim() || '';
        body.smtpPort     = document.getElementById('settings-mail-smtp-port')?.value.trim() || '587';
        body.smtpSecurity = document.getElementById('settings-mail-smtp-security')?.value || 'tls';
        body.smtpUser     = document.getElementById('settings-mail-smtp-user')?.value.trim() || '';
        const smtpPass    = document.getElementById('settings-mail-smtp-pass')?.value;
        if (smtpPass && smtpPass !== '••••••••') body.smtpPass = smtpPass;
    } else if (provider) {
        const apiKey = document.getElementById('settings-mail-api-key')?.value;
        if (apiKey && !apiKey.startsWith('••••')) body.apiKey = apiKey;
        if (provider === 'mailgun') {
            body.mailgunDomain = document.getElementById('settings-mail-mailgun-domain')?.value.trim() || '';
        }
    }

    statusEl.textContent = 'Saving…'; statusEl.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/mail-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            statusEl.textContent = '✓ Saved!'; statusEl.style.color = 'var(--success)';
            setTimeout(() => { if (statusEl.textContent.startsWith('✓')) statusEl.textContent = ''; }, 3000);
        } else {
            const err = await res.json().catch(() => ({}));
            statusEl.textContent = err.error || 'Save failed.'; statusEl.style.color = 'var(--error)';
        }
    } catch { statusEl.textContent = 'Network error.'; statusEl.style.color = 'var(--error)'; }
});

document.getElementById('settings-test-mail-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('settings-mail-status');
    statusEl.textContent = 'Sending test email…'; statusEl.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/mail-settings/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            statusEl.textContent = `✓ Test sent to ${escapeHtml(data.sentTo || 'your email')}!`;
            statusEl.style.color = 'var(--success)';
            setTimeout(() => { statusEl.textContent = ''; }, 6000);
        } else {
            statusEl.textContent = data.error || 'Test failed.'; statusEl.style.color = 'var(--error)';
        }
    } catch { statusEl.textContent = 'Network error.'; statusEl.style.color = 'var(--error)'; }
});

// ─── Analytics & Reports ──────────────────────────────────────────────────────
// Server computes the numbers (/api/analytics); this file only draws them.
// Palette: one validated blue (sequential/ordinal) + fixed status colours for deltas, each with an arrow + text.

let analyticsDays = 30;
let analyticsMetric = 'leads';
let analyticsData = null;
let analyticsListenersAttached = false;

const HEAT_DARK = ['#184f95', '#1c5cab', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'];
const HEAT_LIGHT = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'];
const MIN_SAMPLE = 30; // below this a rate is shown with a low-sample note

async function loadAnalytics(force = false) {
    if (!analyticsListenersAttached) {
        analyticsListenersAttached = true;
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.days, 10) === analyticsDays);
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                analyticsDays = parseInt(btn.dataset.days, 10);
                loadAnalytics(true);
            });
        });
        document.querySelectorAll('.viz-seg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                analyticsMetric = btn.dataset.metric;
                document.querySelectorAll('.viz-seg-btn').forEach(b => {
                    b.classList.toggle('active', b === btn);
                    b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
                });
                if (analyticsData) renderTrend(analyticsData);
            });
        });
        window.addEventListener('resize', () => { if (analyticsData && !document.getElementById('analytics-view').classList.contains('hidden')) renderTrend(analyticsData); });
    }
    if (analyticsData && !force) { renderAnalytics(analyticsData); return; }

    const kpis = document.getElementById('viz-kpis');
    if (kpis && !analyticsData) kpis.innerHTML = '<div class="viz-kpi"><span class="viz-kpi-label">Loading…</span></div>';
    try {
        const res = await apiFetch(`${API_BASE}/api/analytics?days=${analyticsDays}&tz=${new Date().getTimezoneOffset()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        analyticsData = await res.json();
        renderAnalytics(analyticsData);
    } catch (err) {
        console.error('[Analytics]', err);
        if (kpis) kpis.innerHTML = '<div class="viz-kpi"><span class="viz-kpi-label">Could not load analytics</span><span class="viz-kpi-help">Check your connection and try again.</span></div>';
    }
}

const fmtInt = (n) => (n ?? 0).toLocaleString('en-GB');
const fmtPct = (r) => (r == null ? '—' : `${(r * 100).toFixed(r < 0.1 && r > 0 ? 1 : 0)}%`);
function fmtMoney(n) {
    if (!n) return '£0';
    if (n >= 1e6) return `£${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e4) return `£${Math.round(n / 1e3)}K`;
    return `£${n.toLocaleString('en-GB')}`;
}
function periodName(days) { return days ? `prev ${days}d` : ''; }

function deltaHtml(cur, prev, { isRate = false, days }) {
    if (!days) return '<span>All time</span>';
    if (cur == null || prev == null) return `<span>no ${periodName(days)} data</span>`;
    if (isRate) {
        const pts = (cur - prev) * 100;
        if (Math.abs(pts) < 0.05) return `<span>no change vs ${periodName(days)}</span>`;
        const cls = pts > 0 ? 'up' : 'down';
        return `<span class="${cls}">${pts > 0 ? '▲' : '▼'} ${Math.abs(pts).toFixed(1)} pts</span> vs ${periodName(days)}`;
    }
    if (prev === 0) return cur === 0 ? `<span>no change vs ${periodName(days)}</span>` : `<span class="up">▲ new</span> vs ${periodName(days)} (0)`;
    const pct = ((cur - prev) / prev) * 100;
    if (Math.abs(pct) < 0.5) return `<span>no change vs ${periodName(days)}</span>`;
    const cls = pct > 0 ? 'up' : 'down';
    return `<span class="${cls}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%</span> vs ${periodName(days)}`;
}

function renderAnalytics(d) {
    const c = d.current, p = d.previous || {};
    const scope = document.getElementById('viz-scope');
    if (scope) scope.textContent = d.days
        ? `Last ${d.days} days, compared with the ${d.days} days before. Conversations are estimated (a new one starts after 30 min of inactivity).`
        : 'All time. Conversations are estimated (a new one starts after 30 min of inactivity).';

    const low = (n) => n > 0 && n < MIN_SAMPLE ? `<span class="viz-kpi-warn">n=${n}: too few for a reliable rate</span>` : '';
    const tiles = [
        { label: 'Conversations', value: fmtInt(c.conversations), delta: deltaHtml(c.conversations, p.conversations, d), help: 'Chats started on your sites' },
        { label: 'Leads', value: fmtInt(c.leads), delta: deltaHtml(c.leads, p.leads, d), help: 'Contacts captured by the bot' },
        { label: 'Chat → lead', value: fmtPct(c.chatToLead), delta: deltaHtml(c.chatToLead, p.chatToLead, { ...d, isRate: true }), help: 'Leads ÷ conversations', extra: low(c.conversations) },
        { label: 'Verified email', value: fmtPct(c.verifiedRate), delta: deltaHtml(c.verifiedRate, p.verifiedRate, { ...d, isRate: true }), help: 'Leads who confirmed their email', extra: low(c.leads) },
        { label: 'Lead → opportunity', value: fmtPct(c.qualifiedRate), delta: deltaHtml(c.qualifiedRate, p.qualifiedRate, { ...d, isRate: true }), help: 'Moved to Opportunity or later', extra: low(c.leads) },
        { label: 'Pipeline value', value: fmtMoney(c.pipelineValue), delta: deltaHtml(c.pipelineValue, p.pipelineValue, d), help: `Stated budgets, ${c.withBudget} of ${c.leads} leads` },
    ];
    document.getElementById('viz-kpis').innerHTML = tiles.map(t => `
        <div class="viz-kpi">
            <span class="viz-kpi-label">${t.label}</span>
            <span class="viz-kpi-num">${t.value}</span>
            <span class="viz-kpi-delta">${t.delta}</span>
            <span class="viz-kpi-help">${t.help}</span>
            ${t.extra || ''}
        </div>`).join('');

    renderTrend(d);
    renderFunnel(d);
    renderHeatmap(d);
    renderServices(d);
    renderWaiting(d);
}

// ── Tooltip helpers
function showTip(html, x, y) {
    const tip = document.getElementById('viz-tooltip');
    if (!tip) return;
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(window.innerWidth - r.width - 8, x + 12)}px`;
    tip.style.top = `${Math.max(8, y - r.height - 12)}px`;
}
function hideTip() { const tip = document.getElementById('viz-tooltip'); if (tip) tip.hidden = true; }

function bucketLabel(t, bucket, long = false) {
    const d = new Date(t);
    const s = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return bucket === 'week' && long ? `Week of ${s}` : s;
}

// ── Trend: single-series area chart with crosshair tooltip
function renderTrend(d) {
    const el = document.getElementById('viz-trend');
    const tableEl = document.getElementById('viz-trend-table');
    const title = document.getElementById('viz-trend-title');
    if (!el) return;
    const m = analyticsMetric;
    const names = { leads: 'Leads', conversations: 'Conversations', rate: 'Chat → lead rate' };
    if (title) title.textContent = `${names[m]} per ${d.bucket}`;
    const pts = d.series.map(s => ({ t: s.t, v: m === 'rate' ? (s.conversations ? s.leads / s.conversations : null) : s[m], s }));
    const fmtV = (v) => v == null ? '—' : m === 'rate' ? fmtPct(v) : fmtInt(v);

    if (tableEl) tableEl.innerHTML = `<div class="viz-table-scroll"><table><thead><tr><th>${d.bucket === 'week' ? 'Week of' : 'Day'}</th><th>Conversations</th><th>Leads</th><th>Chat → lead</th></tr></thead><tbody>${
        d.series.map(s => `<tr><td>${bucketLabel(s.t, d.bucket)}</td><td>${s.conversations}</td><td>${s.leads}</td><td>${fmtPct(s.conversations ? s.leads / s.conversations : null)}</td></tr>`).join('')
    }</tbody></table></div>`;

    if (!pts.some(p => p.v)) { el.innerHTML = `<div class="viz-empty">No ${names[m].toLowerCase()} in this period yet.</div>`; return; }

    const W = el.clientWidth || 600, H = el.clientHeight || 220;
    const pad = { l: 34, r: 8, t: 12, b: 22 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const rawMax = Math.max(...pts.map(p => p.v || 0));
    const max = m === 'rate' ? Math.min(1, Math.max(0.05, Math.ceil(rawMax * 10) / 10)) : Math.max(1, niceMax(rawMax));
    const x = (i) => pad.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
    const y = (v) => pad.t + ih - (v / max) * ih;
    const ticks = [0, max / 2, max];

    let line = '', area = '', started = false;
    pts.forEach((p, i) => {
        if (p.v == null) { started = false; return; }
        line += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`;
        started = true;
    });
    const valid = pts.map((p, i) => ({ ...p, i })).filter(p => p.v != null);
    if (valid.length) area = `M${x(valid[0].i)},${y(0)} ` + valid.map(p => `L${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ') + ` L${x(valid[valid.length - 1].i)},${y(0)} Z`;

    const step = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(iw / 70))));
    const xlabels = pts.map((p, i) => (i % step === 0 || i === pts.length - 1) && !(i !== pts.length - 1 && pts.length - 1 - i < step / 2)
        ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${bucketLabel(p.t, d.bucket)}</text>` : '').join('');
    const peak = valid.reduce((a, b) => (b.v > a.v ? b : a), valid[0]);

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${names[m]} per ${d.bucket}, peak ${fmtV(peak.v)} on ${bucketLabel(peak.t, d.bucket)}">
        <defs><linearGradient id="viz-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--viz-1)" stop-opacity="0.28"/><stop offset="1" stop-color="var(--viz-1)" stop-opacity="0"/></linearGradient></defs>
        <g class="viz-axis">${ticks.map(t => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${m === 'rate' ? fmtPct(t) : fmtInt(Math.round(t))}</text>`).join('')}${xlabels}</g>
        <path d="${area}" fill="url(#viz-area)"/>
        <path d="${line}" fill="none" stroke="var(--viz-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${x(peak.i)}" cy="${y(peak.v)}" r="4" fill="var(--viz-1)" stroke="var(--bg-secondary)" stroke-width="2"/>
        <text x="${Math.min(W - pad.r - 4, Math.max(pad.l + 4, x(peak.i)))}" y="${Math.max(10, y(peak.v) - 9)}" text-anchor="middle" font-size="10" fill="var(--text-primary)">${fmtV(peak.v)}</text>
        <line id="viz-cross" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--text-secondary)" stroke-dasharray="3 3" visibility="hidden"/>
        <circle id="viz-dot" r="5" fill="var(--viz-1)" stroke="var(--bg-secondary)" stroke-width="2" visibility="hidden"/>
        <rect x="${pad.l}" y="0" width="${iw}" height="${H}" fill="transparent" id="viz-hit"/>
    </svg>`;

    const hit = el.querySelector('#viz-hit'), cross = el.querySelector('#viz-cross'), dot = el.querySelector('#viz-dot');
    const svg = el.querySelector('svg');
    hit.addEventListener('pointermove', (e) => {
        const box = svg.getBoundingClientRect();
        const px = (e.clientX - box.left) * (W / box.width);
        const i = Math.max(0, Math.min(pts.length - 1, Math.round(pts.length === 1 ? 0 : ((px - pad.l) / iw) * (pts.length - 1))));
        const p = pts[i];
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
        if (p.v != null) { dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.v)); dot.setAttribute('visibility', 'visible'); } else dot.setAttribute('visibility', 'hidden');
        showTip(`<b>${bucketLabel(p.t, d.bucket, true)}</b><br>${names[m]}: <b>${fmtV(p.v)}</b><br><span style="color:var(--text-secondary)">${p.s.conversations} conversations · ${p.s.leads} leads</span>`, e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); });
}

function niceMax(v) {
    if (v <= 5) return Math.max(2, Math.ceil(v));
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    return Math.ceil(v / (mag / 2)) * (mag / 2);
}

// ── Funnel: nested stages only (each is a subset of the one above), one hue, step conversion beneath each bar.
// Email verification is not a prerequisite for Opportunity, so it stays a KPI rather than a funnel step.
function renderFunnel(d) {
    const el = document.getElementById('viz-funnel');
    if (!el) return;
    const c = d.current;
    const steps = [
        { label: 'Conversations', n: c.conversations },
        { label: 'Leads captured', n: c.leads },
        { label: 'Opportunity', n: c.qualified },
        { label: 'In campaign', n: c.campaigns },
    ];
    const top = Math.max(1, ...steps.map(s => s.n));
    el.innerHTML = steps.map((s, i) => {
        const prev = steps[i - 1];
        const conv = prev ? (prev.n ? `${fmtPct(s.n / prev.n)} of ${prev.label.toLowerCase()}` : '—') : 'Start of funnel';
        return `<div>
            <div class="viz-fstep-top"><span>${s.label}</span><b>${fmtInt(s.n)}</b></div>
            <div class="viz-ftrack" role="img" aria-label="${s.label}: ${s.n}"><div class="viz-fbar" style="width:${s.n ? Math.max(2, (s.n / top) * 100) : 0}%;animation-delay:${i * 60}ms"></div></div>
            <div class="viz-fconv">${conv}</div>
        </div>`;
    }).join('');
}

// ── Heatmap: weekday × hour, sequential blue
function renderHeatmap(d) {
    const el = document.getElementById('viz-heatmap');
    if (!el) return;
    const max = Math.max(0, ...d.heatmap.flat());
    if (!max) { el.style.display = 'block'; el.innerHTML = '<div class="viz-empty">No conversations in this period yet.</div>'; return; }
    el.style.display = '';
    const ramp = document.body.classList.contains('light-mode') ? HEAT_LIGHT : HEAT_DARK;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const colour = (v) => v ? ramp[Math.min(ramp.length - 1, Math.floor((v / max) * (ramp.length - 1e-9)))] : '';
    let html = '<span></span>' + Array.from({ length: 24 }, (_, h) => `<span class="viz-hhour">${h % 6 === 0 ? h : ''}</span>`).join('');
    d.heatmap.forEach((row, di) => {
        html += `<span class="viz-hlabel">${days[di]}</span>` + row.map((v, h) =>
            `<span class="viz-hcell" ${v ? `data-v="${v}" style="background:${colour(v)}"` : ''} data-d="${days[di]}" data-h="${h}"></span>`).join('');
    });
    // Busiest slot as a direct label for screen readers + summary
    let best = { v: 0 };
    d.heatmap.forEach((row, di) => row.forEach((v, h) => { if (v > best.v) best = { v, di, h }; }));
    el.innerHTML = html;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `Busiest: ${days[best.di]} ${String(best.h).padStart(2, '0')}:00 with ${best.v} conversations`);
    let legend = el.nextElementSibling;
    if (!legend || !legend.classList.contains('viz-hlegend')) { legend = document.createElement('div'); legend.className = 'viz-hlegend'; el.after(legend); }
    legend.innerHTML = `Fewer ${ramp.map(c => `<i style="background:${c}"></i>`).join('')} More · busiest ${days[best.di]} ${String(best.h).padStart(2, '0')}:00`;
    el.onpointerover = (e) => {
        const cell = e.target.closest('.viz-hcell');
        if (!cell) return hideTip();
        const h = +cell.dataset.h;
        showTip(`<b>${cell.dataset.d} ${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00</b><br>${cell.dataset.v || 0} conversations`, e.clientX, e.clientY);
    };
    el.onpointerleave = hideTip;
}

// ── Leads by service: horizontal bars, sorted, one hue, direct labels
function renderServices(d) {
    const el = document.getElementById('viz-services');
    if (!el) return;
    if (!d.services.length) { el.innerHTML = '<div class="viz-empty">No leads in this period yet.</div>'; return; }
    const top = d.services[0].count, total = d.services.reduce((s, x) => s + x.count, 0);
    el.innerHTML = d.services.map((s, i) => `<div>
        <div class="viz-hbar-top"><span title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span><span>${s.count} · ${fmtPct(s.count / total)}</span></div>
        <div class="viz-ftrack"><div class="viz-fbar" style="width:${(s.count / top) * 100}%;animation-delay:${i * 50}ms"></div></div>
    </div>`).join('');
}

// ── Speed-to-lead: open leads waiting more than a day
function renderWaiting(d) {
    const el = document.getElementById('viz-waiting');
    if (!el) return;
    const w = d.waiting;
    if (!w.count) { el.innerHTML = '<div class="viz-wait-head"><b>0</b><span>leads waiting. Nice work.</span></div><p class="viz-wait-note">Replying within an hour makes a lead far more likely to convert than replying the next day.</p>'; return; }
    const age = (ts) => { const h = Math.floor((Date.now() - ts) / 3600000); return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`; };
    el.innerHTML = `<div class="viz-wait-head"><b>${w.count}</b><span>lead${w.count === 1 ? '' : 's'} still in Inbox/Priority after 24h</span></div>` +
        w.oldest.map(l => `<button type="button" class="viz-wait-item" data-goto-leads><span>${escapeHtml(l.name || 'Unknown')}${l.service ? ` · <span style="color:var(--text-secondary)">${escapeHtml(l.service)}</span>` : ''}</span><span>${age(l.timestamp)} waiting</span></button>`).join('') +
        '<p class="viz-wait-note">Replying within an hour makes a lead far more likely to convert than replying the next day.</p>';
    el.querySelectorAll('[data-goto-leads]').forEach(b => b.addEventListener('click', () => switchView('leads')));
}
