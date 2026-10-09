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
// Login nonce: made when a sign-in starts in this tab and checked by the server when the login is
// completed, so a sign-in link someone else started can't log this browser into their account.
function loginNonce(fresh = false) {
    let n = '';
    try { n = sessionStorage.getItem('login_nonce') || ''; } catch (_) {}
    if (fresh || !n) {
        n = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
        try { sessionStorage.setItem('login_nonce', n); } catch (_) {}
    }
    return n;
}

(async () => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    const pid  = params.get('pid');

    if (params.has('social_error')) {
        const errMap = { invalid_state: 'Security check failed. Please try again.', auth_failed: 'Authentication failed. Please try again.', no_code: 'Login was cancelled.', not_authorized: 'No chatbot is linked to this account. Sign in with the account you signed up with, or start for free below.' };
        loginError.innerText = errMap[params.get('social_error')] || 'Social login failed. Please try again.';
        history.replaceState(null, '', window.location.pathname);
        return;
    }
    if (params.get('signin') === 'existing') {
        // Sent here from onboarding: this email already has a chatbot
        loginError.innerText = 'You already have a chatbot. Sign in with the same account you signed up with.';
        history.replaceState(null, '', window.location.pathname);
    }

    // Redeem session grant from OAuth redirect (mobile-safe cookie establishment).
    // The grant token is exchanged via JS fetch so the cookie is set in response to an
    // active request — iOS Safari ITP does not discard these, unlike redirect-planted cookies.
    const sessionGrant = params.get('session_grant');
    if (sessionGrant) {
        history.replaceState(null, '', window.location.pathname);
        try {
            const res = await fetch(`${API_BASE}/api/auth/redeem-grant?token=${encodeURIComponent(sessionGrant)}&nonce=${encodeURIComponent(loginNonce())}`, { credentials: 'include' });
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
                body: JSON.stringify({ pid, code, rememberDevice, nonce: loginNonce() })
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
        const res = await fetch(`${API_BASE}/api/auth/totp/user-setup?pid=${encodeURIComponent(pid)}&nonce=${encodeURIComponent(loginNonce())}`, { credentials: 'include' });
        if (!res.ok) {
            loginError.innerText = 'Session expired. Please log in again.';
            document.getElementById('setup-2fa-section').style.display = 'none';
            document.getElementById('social-login-section').style.display = 'block';
            return;
        }
        const data = await res.json();
        // Drawn here from the otpauth link: the secret never goes to a third-party QR service
        try {
            const mod = await import('/vendor/qrcode.mjs');
            const qrcode = mod.default || mod.qrcode;
            const qr = qrcode(0, 'M'); qr.addData(data.uri); qr.make();
            const n = qr.getModuleCount(), q = 2; let d = '';
            for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
            document.getElementById('setup-qr-img').src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        } catch (e) { console.error('[2FA] QR render failed', e); }
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
                body: JSON.stringify({ pid, code, rememberDevice, nonce: loginNonce() })
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
        window.location.href = `${API_BASE}/api/auth/${encodeURIComponent(provider)}?redirect=dashboard${bypassParam}&n=${loginNonce(true)}`;
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
        const clientsNav = document.querySelector('.nav-item[data-view="clients"]');
        if (clientsNav) clientsNav.style.display = 'none';
        document.getElementById('clients-view')?.remove();
        document.getElementById('site-settings-view')?.remove();
        // Settings is reserved for the Bytes website; clients use Profile Settings / the Chatbot page
        const cog = document.getElementById('settings-cog-btn');
        if (cog) cog.style.display = 'none';
    }

    startLogsBadge();

    // Load plan/trial status and render banner
    loadPlanStatus();
    loadUserProfile();

    // Navigate to a requested view (?view= param or saved from pre-OAuth redirect)
    const requestedView = new URLSearchParams(window.location.search).get('view')
        || sessionStorage.getItem('pendingView');
    sessionStorage.removeItem('pendingView');
    switchView(requestedView === 'site-settings' && userRole !== 'admin' ? 'leads' : (requestedView || 'leads'));

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
    banner.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" style="background:#fff;color:#b45309;border:none;border-radius:6px;padding:0.3rem 0.9rem;font-weight:600;cursor:pointer;">Log In Again</button>`;
    banner.querySelector('button').addEventListener('click', () => location.reload());
    // This session is over: don't keep its token around
    localStorage.removeItem('bytes_session_jwt');
    document.body.prepend(banner);
}

async function loadPlanStatus() {
    // Agency admins aren't on a client plan: no trial banner, no Free-plan locks
    if (userRole === 'admin') { planStatus = { plan: 'agency', inTrial: false, trialDaysLeft: 0, trialEndsAt: 0 }; return; }
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
        banner.innerHTML = `🔒 <strong>Free Plan</strong> — AI features are disabled. Max 10 leads/day · 50 contacts. <a href="/?upgrade=free#pricing" style="color:#fb923c;text-decoration:underline;margin-left:8px;">Upgrade your plan →</a>`;
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
// Settings (sidebar cog) is the Bytes website's own chatbot, separate from every client. Admin only;
// the cog is hidden for clients, who reach their own settings via Profile Settings.
function openSettings() {
    if (userRole === 'admin') switchView('site-settings');
    else openChatbotSettings();
}

// Your own account's chatbot settings live on the Chatbot page — jump there and flash the card

function openChatbotSettings() {
    switchView('chatbot');
    const card = document.getElementById('chatbot-settings-card');
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.style.outline = '2px solid var(--accent, #6366f1)';
    card.style.outlineOffset = '4px';
    setTimeout(() => { card.style.outline = ''; card.style.outlineOffset = ''; }, 1600);
}

document.getElementById('dd-profile-settings').addEventListener('click', () => {
    openChatbotSettings(); // your own account's chatbot, for admins too
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

    const titles = { 'site-settings': 'Bytes Website Settings', leads: 'Captured Leads', logs: 'Chat Logs', clients: 'Manage Clients', chatbot: 'Chatbot & Installations', analytics: 'Analytics & Reports' };
    viewTitle.innerText = titles[viewName] || (viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (viewName === 'leads') loadLeads();
    if (viewName === 'logs') loadLogs();
    if (viewName === 'chatbot') loadChatbotView();
    if (viewName === 'analytics') loadAnalytics();
    if (viewName === 'site-settings') loadSiteSettings();
    if (viewName === 'clients') loadClients();
    document.getElementById('settings-cog-btn')?.classList.toggle('active', viewName === 'site-settings');
}

refreshBtn.addEventListener('click', () => {
    const activeView = document.querySelector('.nav-item.active')?.getAttribute('data-view');
    if (!document.getElementById('site-settings-view')?.classList.contains('hidden')) loadSiteSettings();
    if (activeView === 'leads') loadLeads();
    if (activeView === 'logs') loadLogs();
    if (activeView === 'clients') loadClients(true);
    if (activeView === 'analytics') loadAnalytics(true);
});

// --- Data Fetching ---
async function loadLeads() {
    const result = await fetchLeads();
    ldShowError(result.success ? '' : result.error);
    return result;
}

// Load failure banner with Retry — otherwise a failed load looks like "no leads"
function ldShowError(msg) {
    let el = document.getElementById('ld-error');
    if (!msg) { if (el) el.hidden = true; return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'ld-error';
        el.className = 'ld-error';
        el.setAttribute('role', 'alert');
        document.getElementById('ld-stats').before(el);
    }
    el.innerHTML = `<span>Couldn't load leads: ${escapeHtml(msg)}</span><button type="button" class="cl-btn">Retry</button>`;
    el.querySelector('button').addEventListener('click', loadLeads);
    el.hidden = false;
}

async function fetchLeads() {
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
        ldMarkNew(data);
        renderLeads(data);
        // Arrived from Chat Logs "Open in Leads": show that lead's details
        if (window.ldOpenAfterLoad) {
            const id = window.ldOpenAfterLoad; window.ldOpenAfterLoad = null;
            const card = document.querySelector(`.lead-card[data-id="${CSS.escape(String(id))}"]`);
            if (window.allLeads.some(l => String(l.id) === String(id))) { if (card) ldLastFocus = card; openLeadDrawer(id, true); document.getElementById('ld-d-close').focus(); }
        }
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Network or CORS error.' };
    }
}

async function loadLogs() { return loadConversations(); }

// --- Rendering ---
window.allLeads = [];

// ─── Leads board ──────────────────────────────────────────────────────────────
const LD_STAGES = ['lead', 'priority', 'opportunity', 'campaign'];
const LD_STAGE_NAMES = { lead: 'Inbox', priority: 'Priority', opportunity: 'Opportunity', campaign: 'Campaigns' };
const LD_SUB = { drafting: 'Drafting', sequence_generated: 'Sequence ready', active: 'Campaign live', campaign: 'Sequence drafted' };
const ldCol = (stage) => (['drafting', 'active', 'sequence_generated', 'campaign'].includes(stage) ? 'campaign' : (LD_STAGES.includes(stage) ? stage : 'lead'));

function ldBudget(str) {
    if (!str) return 0;
    const m = String(str).replace(/[£€$,\s]/g, '').toLowerCase().match(/(\d+(?:\.\d+)?)([km]?)/);
    return m ? Math.round(parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1)) : 0;
}
const ldCur = (str) => { const m = String(str || '').match(/[£$€]|\b(usd|eur|gbp)\b/i); return m ? ({ usd: '$', eur: '€', gbp: '£' })[m[0].toLowerCase()] || m[0] : '£'; };
const ldMoney = (n, cur = '£') => (n >= 1e6 ? `${cur}${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${cur}${Math.round(n / 1e3)}K` : `${cur}${n.toLocaleString('en-GB')}`);
// Budgets in different currencies are never added together: "£41K + $20K"
function ldMoneyMix(list) {
    const by = {};
    list.forEach(l => { const v = ldBudget(l.budget); if (v) { const c = ldCur(l.budget); by[c] = (by[c] || 0) + v; } });
    return Object.entries(by).sort((a, b) => (b[0] === '£') - (a[0] === '£') || b[1] - a[1]).map(([c, v]) => ldMoney(v, c)).join(' + ');
}

// "New" marker: leads captured since this browser last opened the board
let ldSeenBefore = null;
function ldMarkNew(leads) {
    let seen = 0;
    try { seen = Number(localStorage.getItem('ld_seen_at')) || 0; } catch (_) {}
    if (ldSeenBefore === null) ldSeenBefore = seen || Date.now();
    const newest = Math.max(0, ...leads.map(l => l.timestamp || 0));
    try { if (newest > seen) localStorage.setItem('ld_seen_at', String(newest)); } catch (_) {}
}
const ldIsNew = (l) => ldSeenBefore !== null && l.timestamp > ldSeenBefore;
function ldAge(ts) {
    const h = (Date.now() - ts) / 3600000;
    if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
    if (h < 48) return `${Math.round(h)}h`;
    return `${Math.round(h / 24)}d`;
}
const ldIsWaiting = (l) => ['lead', 'priority'].includes(l.pipeline_stage || 'lead') && Date.now() - l.timestamp > 86400000;

let ldListeners = false;
function ldAttach() {
    if (ldListeners) return;
    ldListeners = true;
    let t;
    document.getElementById('ld-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => renderLeads(window.allLeads), 150); });
    ['ld-date', 'ld-verified', 'ld-client', 'ld-sort'].forEach(id => document.getElementById(id).addEventListener('change', () => renderLeads(window.allLeads)));
    document.getElementById('ld-clear').addEventListener('click', () => {
        document.getElementById('ld-q').value = '';
        ['ld-date', 'ld-verified', 'ld-client'].forEach(id => { document.getElementById(id).selectedIndex = 0; });
        renderLeads(window.allLeads);
    });
    document.getElementById('ld-export').addEventListener('click', ldExport);
    document.getElementById('leads-kanban').addEventListener('click', (e) => {
        if (e.target.closest('select, .manage-campaign-btn, a, [data-copy]')) return;
        const card = e.target.closest('.lead-card');
        if (card) openLeadDrawer(card.dataset.id);
    });
    document.getElementById('leads-kanban').addEventListener('keydown', (e) => {
        const card = e.target.closest('.lead-card');
        if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLeadDrawer(card.dataset.id); }
    });
    document.getElementById('leads-kanban').addEventListener('change', (e) => {
        const sel = e.target.closest('select[data-move]');
        if (sel && sel.value) moveLead(sel.dataset.move, sel.value);
    });
    document.getElementById('ld-d-close').addEventListener('click', closeLeadDrawer);
    document.getElementById('ld-backdrop').addEventListener('click', closeLeadDrawer);
    document.addEventListener('keydown', (e) => {
        const drawer = document.getElementById('ld-drawer');
        if (drawer.hidden) return;
        if (e.key === 'Escape') return closeLeadDrawer();
        if (e.key !== 'Tab') return;
        // Keep focus inside the open drawer (it's a modal dialog)
        const f = [...drawer.querySelectorAll('a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
}

function ldFiltered(leads) {
    const q = document.getElementById('ld-q').value.trim().toLowerCase();
    const days = parseInt(document.getElementById('ld-date').value, 10);
    const ver = document.getElementById('ld-verified').value;
    const client = document.getElementById('ld-client').value;
    const sort = document.getElementById('ld-sort').value;
    let from = 0;
    if (days) { const d = new Date(); d.setHours(0, 0, 0, 0); from = d.getTime() - (days - 1) * 86400000; }
    const out = leads.filter(l =>
        (!q || [l.name, l.email, l.service, l.summary, l.budget].some(v => String(v || '').toLowerCase().includes(q))) &&
        (!from || l.timestamp >= from) &&
        (ver === '' || (ver === '1' ? l.is_verified === 1 : l.is_verified !== 1)) &&
        (!client || l.client_id === client));
    out.sort((a, b) => sort === 'old' ? a.timestamp - b.timestamp : sort === 'budget' ? ldBudget(b.budget) - ldBudget(a.budget) || b.timestamp - a.timestamp : b.timestamp - a.timestamp);
    document.getElementById('ld-clear').hidden = !(q || days || ver !== '' || client);
    return out;
}

function renderLeads(leads) {
    window.allLeads = leads || [];
    ldAttach();
    const isAdmin = userRole === 'admin';

    const clientSel = document.getElementById('ld-client');
    const clients = [...new Set(window.allLeads.map(l => l.client_id).filter(Boolean))].sort();
    if (isAdmin && clients.length > 1) {
        const cur = clientSel.value;
        clientSel.hidden = false;
        clientSel.innerHTML = '<option value="">All clients</option>' + clients.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c === 'default' ? 'Bytes website' : c)}</option>`).join('');
        clientSel.value = cur;
    }

    const shown = ldFiltered(window.allLeads);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const waiting = shown.filter(ldIsWaiting).length;
    const verified = shown.filter(l => l.is_verified === 1).length;
    const value = ldMoneyMix(shown);
    const filtered = shown.length !== window.allLeads.length;
    const tiles = [
        { label: 'Leads', value: shown.length, help: filtered ? `of ${window.allLeads.length} total` : 'all time' },
        { label: 'New today', value: shown.filter(l => l.timestamp >= today.getTime()).length, help: 'captured since midnight' },
        { label: 'Waiting 24h+', value: waiting, help: 'in Inbox or Priority', warn: waiting > 0 },
        { label: 'Verified email', value: shown.length ? `${Math.round((verified / shown.length) * 100)}%` : '—', help: `${verified} of ${shown.length}` },
        { label: 'Pipeline value', value: value ? value.split(' + ')[0] : '—', help: value.includes(' + ') ? `+ ${value.split(' + ').slice(1).join(' + ')} · stated budgets` : 'from stated budgets' },
    ];
    document.getElementById('ld-stats').innerHTML = tiles.map(t => `<div class="cl-stat${t.warn ? ' ld-stat-warn' : ''}"><span class="cl-stat-label">${t.label}</span><span class="cl-stat-num">${t.value}</span><span class="cl-stat-help">${t.help}</span></div>`).join('');

    const cols = { lead: colLead, priority: colPriority, opportunity: colOpportunity, campaign: colCampaign };
    Object.values(cols).forEach(c => { c.innerHTML = ''; });
    const counts = { lead: 0, priority: 0, opportunity: 0, campaign: 0 }, values = { lead: [], priority: [], opportunity: [], campaign: [] };
    const locked = isFreeLocked();

    shown.forEach(l => {
        const stage = l.pipeline_stage || 'lead';
        const col = ldCol(stage);
        counts[col]++; values[col].push(l);
        const wait = ldIsWaiting(l);
        const card = document.createElement('div');
        card.className = `lead-card${wait ? ' ld-waiting' : ''}`;
        card.draggable = true;
        card.tabIndex = 0;
        card.dataset.id = l.id;
        card.setAttribute('aria-label', `${l.name || 'Lead'}, ${LD_STAGE_NAMES[col]}. Press Enter for details.`);
        card.innerHTML = `
            <div class="ld-card-top">
                <span class="ld-name">${ldIsNew(l) ? '<span class="ld-new">New</span>' : ''}${escapeHtml(l.name || 'Unnamed lead')}</span>
                <span class="ld-age${wait ? ' ld-age-warn' : ''}" title="Captured ${new Date(l.timestamp).toLocaleString('en-GB')}">${wait ? 'Waiting ' : ''}${ldAge(l.timestamp)}</span>
            </div>
            <div class="ld-email">${escapeHtml(l.email || 'No email')}</div>
            <div class="ld-chips">
                ${l.budget ? `<span class="ld-chip ld-chip-budget">${escapeHtml(l.budget)}</span>` : ''}
                ${l.service ? `<span class="ld-chip">${escapeHtml(l.service)}</span>` : ''}
                ${l.is_verified === 1 ? '<span class="ld-chip ld-chip-ok">✓ Verified</span>' : '<span class="ld-chip ld-chip-muted">Unverified</span>'}
                ${col === 'campaign' && LD_SUB[stage] ? `<span class="ld-chip ld-chip-info">${LD_SUB[stage]}</span>` : ''}
                ${isAdmin && clients.length > 1 ? `<span class="ld-chip ld-chip-muted">${escapeHtml(l.client_id === 'default' ? 'Bytes website' : l.client_id)}</span>` : ''}
            </div>
            ${l.summary ? `<p class="ld-summary">${escapeHtml(l.summary)}</p>` : ''}
            ${l.next_best_action ? `<p class="ld-nba"><strong>Next step:</strong> ${escapeHtml(l.next_best_action)}</p>` : ''}
            <div class="ld-card-foot">
                <select data-move="${l.id}" aria-label="Move ${escapeHtml(l.name || 'lead')} to stage">
                    <option value="">Move to…</option>
                    ${LD_STAGES.filter(s2 => s2 !== col).map(s2 => `<option value="${s2}">${LD_STAGE_NAMES[s2]}</option>`).join('')}
                </select>
                <button type="button" class="cl-btn manage-campaign-btn" data-id="${escapeHtml(String(l.id))}">${locked ? '🔒 ' : ''}Campaign</button>
            </div>`;
        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(l.id));
        });
        card.addEventListener('dragend', () => { card.classList.remove('dragging'); document.querySelectorAll('.kanban-column-body.drop-target').forEach(c => c.classList.remove('drop-target')); });
        cols[col].appendChild(card);
    });

    LD_STAGES.forEach(st => {
        document.getElementById(`count-${st}`).innerText = counts[st];
        const mix = ldMoneyMix(values[st]);
        document.getElementById(`value-${st}`).textContent = mix ? `${mix} in budgets` : ({ lead: 'New leads land here', priority: 'High-budget leads', opportunity: 'Qualified and in talks', campaign: 'Email sequences' })[st];
        if (!counts[st]) cols[st].innerHTML = `<div class="ld-empty">${window.allLeads.length ? (filtered ? 'No leads match the filters.' : 'Drag a lead here or use “Move to…”.') : (st === 'lead' ? 'No leads yet. They appear here when your chatbot captures a contact.' : '')}</div>`;
    });

    document.querySelectorAll('.manage-campaign-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); openSequenceModal(btn.getAttribute('data-id')); }));
    const open = document.getElementById('ld-drawer').dataset.leadId;
    if (open && !document.getElementById('ld-drawer').hidden) openLeadDrawer(open, true);
}

async function moveLead(id, toStage) {
    const lead = window.allLeads.find(l => String(l.id) === String(id));
    if (!lead || ldCol(lead.pipeline_stage) === toStage) return renderLeads(window.allLeads);
    const prev = lead.pipeline_stage;
    lead.pipeline_stage = toStage; // optimistic
    renderLeads(window.allLeads);
    try {
        const res = await apiFetch(`${API_BASE}/api/leads/${id}/stage`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: toStage }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    } catch (err) {
        console.error('[Leads] Move failed:', err);
        lead.pipeline_stage = prev;
        renderLeads(window.allLeads);
        alert(`Could not move the lead: ${err.message}`);
    }
}

// --- Drag and Drop (drop target highlights; the card moves on drop, not on every dragover) ---
[colLead, colPriority, colOpportunity, colCampaign].forEach(container => {
    container.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; container.classList.add('drop-target'); });
    container.addEventListener('dragleave', e => { if (!container.contains(e.relatedTarget)) container.classList.remove('drop-target'); });
    container.addEventListener('drop', e => {
        e.preventDefault();
        container.classList.remove('drop-target');
        const id = e.dataTransfer.getData('text/plain') || document.querySelector('.lead-card.dragging')?.dataset.id;
        if (id) moveLead(id, container.getAttribute('data-stage'));
    });
});

function updateKanbanCounts() {
    LD_STAGES.forEach(st => { document.getElementById(`count-${st}`).innerText = document.getElementById(`col-${st}`).querySelectorAll('.lead-card').length; });
}

// ─── Lead detail drawer ───────────────────────────────────────────────────────
let ldLastFocus = null;
function openLeadDrawer(id, keepFocus = false) {
    const l = window.allLeads.find(x => String(x.id) === String(id));
    const drawer = document.getElementById('ld-drawer');
    if (!l) return closeLeadDrawer();
    if (!keepFocus) ldLastFocus = document.activeElement;
    drawer.dataset.leadId = l.id;
    const col = ldCol(l.pipeline_stage || 'lead');
    document.getElementById('ld-d-name').textContent = l.name || 'Unnamed lead';
    document.getElementById('ld-d-sub').textContent = `${LD_STAGE_NAMES[col]}${LD_SUB[l.pipeline_stage] && col === 'campaign' ? ` · ${LD_SUB[l.pipeline_stage]}` : ''} · captured ${new Date(l.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    const row = (k, v) => v ? `<div class="ld-row"><dt>${k}</dt><dd>${v}</dd></div>` : '';
    document.getElementById('ld-d-body').innerHTML = `
        ${ldIsWaiting(l) ? `<div class="ld-alert">Waiting ${ldAge(l.timestamp)} without follow-up. Leads answered within an hour are far more likely to convert.</div>` : ''}
        <dl class="ld-dl">
            ${row('Email', l.email ? `<a href="mailto:${encodeURIComponent(l.email)}">${escapeHtml(l.email)}</a> <button type="button" class="ld-copy" data-copy="${escapeHtml(l.email)}">Copy</button>` : '')}
            ${row('Email status', l.is_verified === 1 ? '✓ Verified' : 'Not verified yet: they haven\'t clicked the link in our verification email')}
            ${row('Service', escapeHtml(l.service || ''))}
            ${row('Budget', escapeHtml(l.budget || ''))}
            ${userRole === 'admin' ? row('Client', `<code>${escapeHtml(l.client_id || '')}</code>`) : ''}
            ${row('Last updated', l.updated_at ? new Date(l.updated_at).toLocaleString('en-GB') : '')}
        </dl>
        ${l.summary ? `<h4>Conversation summary</h4><p class="ld-d-summary">${escapeHtml(l.summary)}</p>` : ''}
        ${l.next_best_action ? `<h4>Suggested next step</h4><p class="ld-d-summary">${escapeHtml(l.next_best_action)}</p>` : ''}
        <h4>Stage</h4>
        <div class="ld-stage-pick" role="group" aria-label="Stage">
            ${LD_STAGES.map(st => `<button type="button" class="cl-seg-btn${st === col ? ' active' : ''}" data-stage-pick="${st}" aria-pressed="${st === col}">${LD_STAGE_NAMES[st]}</button>`).join('')}
        </div>
        <div class="ld-actions">
            ${l.email ? `<a class="cl-btn ld-primary" href="mailto:${encodeURIComponent(l.email)}?subject=${encodeURIComponent(`Following up on your enquiry${l.service ? ` about ${l.service}` : ''}`)}">Email ${escapeHtml((l.name || '').split(' ')[0] || 'lead')}</a>` : ''}
            <button type="button" class="cl-btn" data-d-chat>View chat</button>
            <button type="button" class="cl-btn" data-d-campaign>Campaign</button>
            <button type="button" class="cl-btn ld-danger" data-d-delete>Delete lead</button>
        </div>`;
    const body = document.getElementById('ld-d-body');
    body.querySelectorAll('[data-stage-pick]').forEach(b => b.addEventListener('click', () => moveLead(l.id, b.dataset.stagePick)));
    body.querySelector('[data-copy]')?.addEventListener('click', (e) => { navigator.clipboard?.writeText(e.target.dataset.copy).then(() => { e.target.textContent = 'Copied'; setTimeout(() => (e.target.textContent = 'Copy'), 1200); }); });
    body.querySelector('[data-d-chat]').addEventListener('click', () => {
        closeLeadDrawer();
        const q = document.getElementById('cl-q');
        if (q) q.value = l.email || l.name || '';
        const range = document.querySelector('.cl-seg-btn[data-range="90"]');
        if (range) { document.querySelectorAll('.cl-seg-btn[data-range]').forEach(b => b.classList.toggle('active', b === range)); if (typeof CL !== 'undefined') { CL.range = '90'; CL.offset = 0; CL.selected = null; } }
        switchView('logs');
    });
    body.querySelector('[data-d-campaign]').addEventListener('click', () => { closeLeadDrawer(); openSequenceModal(String(l.id)); });
    body.querySelector('[data-d-delete]').addEventListener('click', async (e) => {
        if (!confirm(`Delete ${l.name || 'this lead'} and their email sequence? This can't be undone.`)) return;
        e.target.disabled = true;
        try {
            const res = await apiFetch(`${API_BASE}/api/leads/${l.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
            window.allLeads = window.allLeads.filter(x => x.id !== l.id);
            closeLeadDrawer();
            renderLeads(window.allLeads);
        } catch (err) { e.target.disabled = false; alert(`Could not delete: ${err.message}`); }
    });
    document.getElementById('ld-backdrop').hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('open'));
    if (!keepFocus) document.getElementById('ld-d-close').focus();
}

function closeLeadDrawer() {
    const drawer = document.getElementById('ld-drawer');
    drawer.classList.remove('open');
    drawer.hidden = true;
    drawer.dataset.leadId = '';
    document.getElementById('ld-backdrop').hidden = true;
    if (ldLastFocus && document.contains(ldLastFocus)) ldLastFocus.focus();
}

// CSV cell, quoted. Visitor-typed text starting with = + - @ would run as a formula in
// Excel/Sheets (CSV injection), so it's prefixed with an apostrophe.
function csvCell(v) {
    let t = String(v ?? '');
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
}

function ldExport() {
    const rows = [['id', 'name', 'email', 'service', 'budget', 'stage', 'verified', 'captured', 'client_id', 'summary', 'next_step']];
    ldFiltered(window.allLeads || []).forEach(l => rows.push([l.id, l.name, l.email, l.service, l.budget, LD_STAGE_NAMES[ldCol(l.pipeline_stage || 'lead')], l.is_verified === 1 ? 'yes' : 'no', new Date(l.timestamp).toISOString(), l.client_id, l.summary, l.next_best_action]));
    const cell = csvCell;
    const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// --- Client Management: chatbot settings in the client drawer ---
// Same building blocks as Settings (Bytes website): health strip, mode guidance, model + cost,
// effort, prompt helper, domains with plan limits, one save, unsaved-change guard.
const MCB = { cid: '', plan: 'free', inTrial: false, loaded: false };
const MCB_CAMPAIGN_NOTES = {
    ai: 'AI writes up to 5 personalised emails from the lead\'s own conversation, signed with the company name. On the Free plan this falls back to the simple sequence.',
    rule: 'A simple 3-email follow-up (thanks, any questions, checking in) using the company name and the service the lead asked about.',
    manual: 'Nothing is generated. Follow-ups are written by hand from the lead\'s Campaign button.',
};
const mcbEl = (id) => document.getElementById(id);
const domainListOf = (text) => [...new Set(String(text || '').split(/[\n,]+/)
    .map(d => d.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#\s]/)[0].replace(/:\d+$/, '').replace(/\.$/, ''))
    .filter(Boolean))];

function mcbSetDirty(on) {
    mcbEl('mc-bot')?.classList.toggle('cb-dirty', on);
    const tag = mcbEl('mc-dirty'); if (tag) tag.hidden = !on;
}
const mcbIsDirty = () => !!mcbEl('mc-bot')?.classList.contains('cb-dirty');

function mcbStatus(text, kind = 'info') {
    const st = mcbEl('config-status');
    st.textContent = text;
    st.style.color = kind === 'ok' ? 'var(--success)' : kind === 'bad' ? 'var(--error)' : 'var(--text-secondary)';
}

function mcbRefreshUI() {
    const mode = configMode.value;
    mcbEl('config-mode-note').textContent = (typeof CB_MODE_NOTES !== 'undefined' && CB_MODE_NOTES[mode]) || '';
    const scripted = ['free', 'standard'].includes(mode);
    document.querySelectorAll('#mc-bot .mc-ai-only').forEach(g => { g.classList.toggle('cb-muted', scripted); g.querySelectorAll('select').forEach(x => { x.disabled = scripted; }); });
    mcbEl('config-llm-cost').innerHTML = modelCatalog ? modelCostHtml(mcbEl('config-llm-model').value) : '';
    const len = configPrompt.value.length;
    mcbEl('config-prompt-count').textContent = `${len.toLocaleString('en-GB')} / 20,000 characters${len ? '' : ' · empty uses the built-in sales prompt'}`;
    mcbEl('config-campaign-note').textContent = MCB_CAMPAIGN_NOTES[configCampaignMode.value] || '';
    // Domains against the plan's limit (trials use Free limits)
    const list = domainListOf(mcbEl('config-domains').value);
    const lim = (PLAN_INSTALL_LIMITS[MCB.inTrial ? 'free' : MCB.plan] || PLAN_INSTALL_LIMITS.free).maxDomains;
    const note = mcbEl('config-domains-note');
    note.classList.toggle('cb-warn', lim !== -1 && list.length > lim);
    note.textContent = !list.length
        ? 'No list: the chatbot answers on any website that has the install code.'
        : `${list.length} domain${list.length === 1 ? '' : 's'}${lim === -1 ? '' : ` of ${lim} on this plan`}. Only these sites can use the bot${lim !== -1 && list.length > lim ? '. Over the plan limit: the client won\'t be able to add more until they upgrade.' : '.'}`;
    // Install code + test link
    const safeId = (MCB.cid || '').replace(/[^a-z0-9_\-]/gi, '');
    mcbEl('config-embed').textContent = safeId ? `<script src="https://web.bytesfx.com/widget.js"\n  data-client-id="${safeId}"></` + 'script>' : '';
    mcbEl('config-test-chat').href = safeId ? `/preview.html?client=${encodeURIComponent(safeId)}` : '#';
}

async function mcbHealth(cid) {
    const el = mcbEl('mc-health');
    el.innerHTML = '';
    if (!cid) return;
    let d = null;
    try { const res = await apiFetch(`${API_BASE}/api/chatbot/status?clientId=${encodeURIComponent(cid)}`); if (res.ok) d = await res.json(); } catch (_) {}
    if (!d || MCB.cid !== cid) return;
    const fresh = d.lastChatAt && Date.now() - d.lastChatAt < 7 * 86400000;
    const ai = ['ai', 'pro', 'elite'].includes(d.mode);
    const item = (state, title, text) => `<div class="cb-stat cb-${state}"><span class="cb-stat-dot" aria-hidden="true"></span><span class="cb-stat-text"><strong>${title}</strong><span>${text}</span></span></div>`;
    el.innerHTML = [
        d.lastChatAt ? item(fresh ? 'ok' : 'warn', fresh ? 'Widget live' : 'Widget quiet', `Last chat ${cbAgo(d.lastChatAt)} · ${d.messages7d} message${d.messages7d === 1 ? '' : 's'} this week`)
            : item('warn', 'Not detected yet', 'No conversations yet. Is the install code on their site?'),
        item(ai ? 'ok' : 'info', ai ? 'AI replies on' : 'Scripted replies', ai ? `${escapeHtml(d.mode)} · ${d.llmModel ? escapeHtml(d.llmModel.replace(/^openrouter:/, '')) : 'default model'}` : `Mode: ${escapeHtml(d.mode)}`),
        item(d.mailReady ? 'ok' : 'bad', d.mailReady ? 'Emails sending' : 'Emails not sending', d.mailReady ? `${d.leads7d} lead${d.leads7d === 1 ? '' : 's'} this week` : escapeHtml(d.mailIssue || 'No email sender set up')),
    ].join('');
}

async function mcbLoad(cid) {
    MCB.cid = cid; MCB.loaded = false;
    mcbSetDirty(false);
    mcbStatus('Loading…');
    mcbRefreshUI();
    mcbHealth(cid);
    try {
        const [res, crmRes] = await Promise.all([
            apiFetch(`${API_BASE}/api/config?clientId=${encodeURIComponent(cid)}`),
            apiFetch(`${API_BASE}/api/crm-settings?clientId=${encodeURIComponent(cid)}`),
            ensureModelCatalog().catch(e => console.error('Model catalog load failed:', e)),
        ]);
        if (MCB.cid !== cid) return; // another client was opened meanwhile
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        const data = await res.json();
        const crm = crmRes.ok ? await crmRes.json() : {};
        MCB.plan = data.plan || crm.plan || 'free';
        MCB.inTrial = !!(data.inTrial ?? crm.inTrial);

        configCompanyName.value = data.companyName || '';
        // Post-trial Free clients can only run the Free bot (the API refuses anything else)
        const locked = !MCB.inTrial && MCB.plan === 'free';
        [...configMode.options].forEach(o => {
            const base = o.dataset.label || (o.dataset.label = o.textContent);
            o.disabled = locked && o.value !== 'free';
            o.textContent = o.disabled ? `${base} (paid plan)` : base;
        });
        configMode.value = data.mode || 'free';
        const modelSel = mcbEl('config-llm-model');
        if (modelCatalog) populateModelSelect(modelSel, data.llmModel || '');
        else { modelSel.innerHTML = '<option value="">Default model (could not load the model list)</option>'; delete modelSel.dataset.filled; }
        mcbEl('config-llm-effort').value = ['low', 'medium', 'high'].includes(data.llmEffort) ? data.llmEffort : 'medium';
        configPrompt.value = data.systemPrompt || '';
        mcbEl('config-domains').value = (data.allowedDomains || []).join('\n');
        configReferral.value = data.referralId || '';

        // Badge: required on Free, Trial and Starter (the API enforces it too)
        const brandingLocked = data.brandingMandatory ?? (MCB.inTrial || MCB.plan === 'free' || MCB.plan === 'starter');
        configBranding.checked = brandingLocked ? true : data.showBranding !== false;
        configBranding.disabled = !!brandingLocked;
        mcbEl('config-branding-note').textContent = brandingLocked
            ? (MCB.inTrial ? 'Required during the trial' : `Required on the ${mcPlanName(MCB.plan).replace(/<[^>]*>/g, '')} plan; Pro and above can hide it`)
            : 'Optional on this plan';

        // White label: Business and Enterprise
        whiteLabelSection.style.display = data.whiteLabelEnabled ? 'block' : 'none';
        mcbEl('config-wl-locked').textContent = data.whiteLabelEnabled ? '' : 'Custom bot name, colour and avatar are available on the Business and Enterprise plans.';
        if (data.whiteLabelEnabled) {
            configWidgetName.value = data.widgetName || '';
            const color = data.widgetAccentColor || '#6366f1';
            configWidgetColor.value = color;
            configWidgetColorPicker.value = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6366f1';
            configWidgetAvatar.value = data.widgetAvatar || '';
        }

        configCampaignMode.value = ['ai', 'rule', 'manual'].includes(crm.default_campaign_mode) ? crm.default_campaign_mode : 'ai';
        configAutoApprove.checked = crm.auto_approve_campaigns === 1;

        MCB.loaded = true;
        mcbRefreshUI();
        mcbSetDirty(false);
        mcbStatus('');
    } catch (e) {
        mcbStatus(`Could not load this client's settings: ${e.message}`, 'bad');
    }
}

loadConfigBtn.addEventListener('click', () => {
    const cid = configClientId.value.trim();
    if (cid) mcbLoad(cid);
});

saveConfigBtn.addEventListener('click', async () => {
    const cid = MCB.cid || configClientId.value.trim();
    if (!cid) { mcbStatus('Open a client first.', 'bad'); return; }
    const avatar = configWidgetAvatar.value.trim();
    if (whiteLabelSection.style.display !== 'none') {
        if (configWidgetColor.value.trim() && !/^#[0-9a-fA-F]{6}$/.test(configWidgetColor.value.trim())) { mcbStatus('Accent colour must be a hex value like #6366f1.', 'bad'); configWidgetColor.focus(); return; }
        if (avatar && !/^https:\/\//i.test(avatar)) { mcbStatus('The avatar must be an https:// image address.', 'bad'); configWidgetAvatar.focus(); return; }
    }
    const settings = {
        companyName: configCompanyName.value.trim(),
        mode: configMode.value,
        llmEffort: mcbEl('config-llm-effort').value,
        systemPrompt: configPrompt.value.trim(),
        allowedDomains: domainListOf(mcbEl('config-domains').value),
        referralId: configReferral.value.trim(),
    };
    if (!configBranding.disabled) settings.showBranding = configBranding.checked;
    // Only send the model once the list loaded, so a failed load can't wipe the saved choice
    if (mcbEl('config-llm-model').dataset.filled) settings.llmModel = mcbEl('config-llm-model').value || '';
    if (whiteLabelSection.style.display !== 'none') {
        settings.widgetName = configWidgetName.value.trim();
        settings.widgetAccentColor = configWidgetColor.value.trim();
        settings.widgetAvatar = avatar;
    }

    saveConfigBtn.disabled = true;
    mcbStatus('Saving…');
    try {
        const res = await apiFetch(`${API_BASE}/api/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: cid, settings }) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        const crmRes = await apiFetch(`${API_BASE}/api/crm-settings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: cid, default_campaign_mode: configCampaignMode.value, auto_approve_campaigns: configAutoApprove.checked }),
        });
        if (!crmRes.ok) throw new Error(`chatbot saved, but campaign settings failed: ${(await crmRes.json().catch(() => ({}))).error || `HTTP ${crmRes.status}`}`);
        mcbEl('config-domains').value = settings.allowedDomains.join('\n');
        mcbSetDirty(false);
        mcbStatus('✓ Chatbot settings saved.', 'ok');
        mcbHealth(cid);
        if (typeof loadClients === 'function') loadClients(true); // refresh the Bot column
    } catch (e) {
        mcbStatus(`Save failed: ${e.message}`, 'bad');
    } finally {
        saveConfigBtn.disabled = false;
    }
});

// Live guidance + unsaved-change tracking
['config-mode', 'config-llm-model', 'config-campaign-mode'].forEach(id => mcbEl(id)?.addEventListener('change', mcbRefreshUI));
['config-prompt', 'config-domains'].forEach(id => mcbEl(id)?.addEventListener('input', mcbRefreshUI));
mcbEl('config-domains')?.addEventListener('blur', () => {
    const ta = mcbEl('config-domains');
    const cleaned = domainListOf(ta.value).join('\n');
    if (cleaned !== ta.value.trim()) { ta.value = cleaned; mcbRefreshUI(); }
});
['input', 'change'].forEach(ev => mcbEl('mc-bot')?.addEventListener(ev, (e) => { if (e.isTrusted && MCB.loaded && !e.target.closest('.btn-primary')) mcbSetDirty(true); }));
mcbEl('config-prompt-template')?.addEventListener('click', () => {
    const company = configCompanyName.value.trim() || '[Company]';
    const tpl = `You are the friendly assistant for ${company}.\n\nWhat we do: [one or two sentences about the services].\nWho we help: [ideal customers].\nPrices: [starting prices, or "we quote after a short call"].\nOpening hours / location: [details].\n\nGoals, in order:\n1. Answer questions clearly in 2–3 short sentences.\n2. Ask for the visitor's name and email when they show interest.\n3. Offer a free consultation and confirm we'll be in touch.\n\nRules: only discuss ${company} and its services; never invent prices or promises; if unsure, offer to have a team member follow up.`;
    if (configPrompt.value.trim() && !confirm('Replace the current prompt with the starter prompt?')) return;
    configPrompt.value = tpl;
    mcbSetDirty(true);
    mcbRefreshUI();
    configPrompt.focus();
});
mcbEl('config-copy-embed')?.addEventListener('click', (e) => {
    const code = mcbEl('config-embed').textContent;
    if (!code) return;
    const btn = e.currentTarget;
    const done = (t) => { btn.textContent = t; setTimeout(() => { btn.textContent = 'Copy install code'; }, 1800); };
    try { navigator.clipboard.writeText(code).then(() => done('Copied ✓'), () => done('Select and copy the code')); } catch (_) { done('Select and copy the code'); }
});
window.addEventListener('beforeunload', (e) => { if (!mcbEl('mc-drawer')?.hidden && mcbIsDirty()) { e.preventDefault(); e.returnValue = ''; } });

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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sequenceModal.classList.contains('hidden')) sequenceModal.classList.add('hidden'); });

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
            const err = await res.json().catch(() => ({}));
            sequenceStatus.innerText = err.error ? `Could not approve: ${err.error}` : 'Failed to approve campaign.';
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

// Admins: this page is the agency's own demo bot and the shared email sender — say where the rest lives
function cbAdminNote() {
    let el = document.getElementById('cb-admin-note');
    if (userRole !== 'admin') { el?.remove(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = 'cb-admin-note';
    el.className = 'cb-admin-note';
    el.innerHTML = 'You\'re editing the <strong>agency demo bot</strong> and the <strong>email sender used for any client without their own</strong>. The Bytes website chatbot is in <a href="#" data-go="site-settings">Settings</a>; each client\'s bot is in <a href="#" data-go="clients">Manage Clients</a>.';
    el.addEventListener('click', (e) => { const a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); switchView(a.dataset.go); } });
    document.getElementById('cb-status').before(el);
}

async function loadChatbotView() {
    loadModelCatalog();
    // Load installations first so we have clientId
    try {
        const res = await apiFetch(`${API_BASE}/api/installations`);
        if (res.ok) installationData = await res.json();
    } catch { /* use cached */ }
    renderChatbotView();
    loadChatbotStatus();
    cbAdminNote();

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

async function ensureModelCatalog() {
    if (modelCatalog) return modelCatalog;
    const res = await fetch(`${CHATBOT_API}/public/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    modelCatalog = await res.json();
    return modelCatalog;
}

// Fills a model <select> with "Default" + one optgroup per provider, in catalog order
function populateModelSelect(select, savedValue) {
    const def = modelCatalog.models.find(m => m.id === modelCatalog.defaultModel);
    select.innerHTML = '';
    select.appendChild(new Option(`Default — ${def ? def.name : modelCatalog.defaultModel}`, ''));
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
    select.dataset.filled = '1';
    select.value = savedValue || '';
    if (select.value !== (savedValue || '')) select.value = ''; // saved model no longer offered
}

async function loadModelCatalog() {
    const select = document.getElementById('settings-llm-model');
    if (!select || select.dataset.filled) return;
    try {
        await ensureModelCatalog();
    } catch (e) {
        console.error('Model catalog load failed:', e);
        select.innerHTML = '<option value="">Default model (could not load the model list)</option>';
        return;
    }
    populateModelSelect(select, savedLlmModel);
    renderModelCost();
}

// Cost line under a model picker (shared by Chatbot and Bytes website settings)
function modelCostHtml(id) {
    const m = modelCatalog && modelCatalog.models.find(x => x.id === (id || modelCatalog.defaultModel));
    if (!m) return '';
    return `Provider: <strong>${escapeHtml(m.providerName)}</strong> · Model: <code>${escapeHtml(m.id)}</code><br>`
        + `Cost: <strong>${formatPrice(m.inputPrice)}</strong> per 1M input tokens · <strong>${formatPrice(m.outputPrice)}</strong> per 1M output tokens`
        + (m.provider === 'openrouter' ? ' <span style="color:var(--text-secondary);">(live OpenRouter price)</span>' : '')
        + (m.available ? '' : `<br><span style="color:var(--warning, #f59e0b);">No ${escapeHtml(m.providerName)} API key is set on the chatbot server — replies will use the default model.</span>`);
}

function renderModelCost() {
    const select = document.getElementById('settings-llm-model');
    const costEl = document.getElementById('settings-llm-cost');
    if (!select || !costEl || !modelCatalog) return;
    costEl.innerHTML = modelCostHtml(select.value);
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
    cbApplyModeLocks();
    const llmSelect = document.getElementById('settings-llm-model');
    if (llmSelect && llmSelect.dataset.filled) { llmSelect.value = savedLlmModel; if (llmSelect.value !== savedLlmModel) llmSelect.value = ''; renderModelCost(); }
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
        ai:     'AI writes up to 5 personalised follow-up emails from each lead\'s own conversation, signed with your company name. On the Free plan this falls back to the simple sequence.',
        rule:   'A simple 3-email follow-up (thanks, any questions, checking in) using your company name and the service the lead asked about.',
        manual: 'Nothing is generated automatically. Write each follow-up yourself from the lead\'s Campaign button on the Leads page.',
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
        embedEl.textContent = `<!-- BytesAI Chatbot Widget Start -->\n<script src="https://web.bytesfx.com/widget.js"\n  data-client-id="${clientId.replace(/"/g, '')}"></` + `script>\n<!-- BytesAI Chatbot Widget End -->`;
    }

    // Plan badge
    const planBadge = document.getElementById('dash-install-plan-badge');
    if (planBadge) planBadge.textContent = userRole === 'admin' ? 'Agency' : inTrial ? `Trial · ${planStatus.trialDaysLeft || 0}d left` : (plan.charAt(0).toUpperCase() + plan.slice(1));

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
                : `Your <strong style="color:#e2e8f0;">${escapeHtml(plan.charAt(0).toUpperCase() + plan.slice(1))}</strong> plan allows ${domLabel}.`;
    }

    // Upgrade button
    const upgBtn = document.getElementById('dash-upgrade-install-btn');
    if (upgBtn) {
        upgBtn.style.display = (maxDomains === -1 || userRole === 'admin') ? 'none' : 'block';
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
            const removed = installationData.allowedDomains.splice(idx, 1)[0];
            renderDomainList(installationData.allowedDomains, installationData.maxDomains);
            saveDomains(`Removed ${removed}.`);
        });
    });
}

document.getElementById('dash-add-domain-btn').addEventListener('click', () => {
    const input = document.getElementById('dash-new-domain');
    let val = input.value.trim().toLowerCase();
    if (!val) return;
    // Accept pasted URLs: https://www.site.com/page → www.site.com
    val = val.replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '');
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
    renderDomainList(installationData.allowedDomains, installationData.maxDomains);
    saveDomains(`Added ${val}.`);
});

document.getElementById('dash-new-domain').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('dash-add-domain-btn').click(); }
});

// Domains save as soon as they're added or removed
async function saveDomains(doneMsg) {
    const status = document.getElementById('dash-domains-status');
    status.textContent = 'Saving…';
    status.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/installations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allowedDomains: installationData.allowedDomains }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        installationData.allowedDomains = data.allowedDomains;
        renderDomainList(installationData.allowedDomains, installationData.maxDomains);
        status.textContent = `✓ ${doneMsg} Saved.`;
        status.style.color = 'var(--success)';
        loadChatbotStatus();
    } catch (err) {
        status.textContent = `${err.message || 'Network error.'} Not saved; showing your saved list.`;
        status.style.color = 'var(--error)';
        try { const r = await apiFetch(`${API_BASE}/api/installations`); if (r.ok) { installationData = await r.json(); renderDomainList(installationData.allowedDomains, installationData.maxDomains); } } catch (_) {}
    }
}

document.getElementById('dash-copy-embed-btn').addEventListener('click', () => {
    const code = document.getElementById('dash-embed-code')?.textContent;
    if (!code) return;
    const btn = document.getElementById('dash-copy-embed-btn');
    const done = (msg) => { btn.textContent = msg; setTimeout(() => { btn.textContent = 'Copy Code'; }, 2000); };
    const fallback = () => {
        const r = document.createRange(); r.selectNodeContents(document.getElementById('dash-embed-code'));
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        done('Selected, press Ctrl+C');
    };
    try { navigator.clipboard.writeText(code).then(() => done('Copied ✓'), fallback); } catch (_) { fallback(); }
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
    const llmSel = document.getElementById('settings-llm-model');
    if (llmSel?.dataset.filled) settings.llmModel = llmSel.value || '';
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
            const err = await res.json().catch(() => ({}));
            statusEl.textContent = err.error || 'Save failed.'; statusEl.style.color = 'var(--error)';
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

let analyticsMetric = 'leads';
let analyticsData = null;
let analyticsListenersAttached = false;

const HEAT_DARK = ['#184f95', '#1c5cab', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'];
const HEAT_LIGHT = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'];
const MIN_SAMPLE = 30; // below this a rate is shown with a low-sample note

let analyticsRange = '30';      // '7' | '30' | '90' | '0' | 'custom'
let analyticsClient = '';       // admin only
let analyticsMode = 'chatbot';  // admin only: 'chatbot' | 'web' (Bytes website visitors)
try { if (localStorage.getItem('viz_mode') === 'web') analyticsMode = 'web'; } catch (_) {}
let visitorsData = null;
let vwMetric = 'visitors';

function vizIso(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

async function loadAnalytics(force = false) {
    if (!analyticsListenersAttached) {
        analyticsListenersAttached = true;
        document.querySelectorAll('.time-btn[data-days]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.days === analyticsRange);
            btn.setAttribute('aria-pressed', btn.dataset.days === analyticsRange);
            btn.addEventListener('click', () => {
                analyticsRange = btn.dataset.days;
                document.querySelectorAll('.time-btn[data-days]').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
                const custom = document.getElementById('viz-custom');
                custom.hidden = analyticsRange !== 'custom';
                if (analyticsRange === 'custom' && !document.getElementById('viz-from').value) {
                    const today = new Date();
                    document.getElementById('viz-to').value = vizIso(today);
                    document.getElementById('viz-from').value = vizIso(new Date(today.getTime() - 27 * 86400000));
                }
                loadAnalytics(true);
            });
        });
        ['viz-from', 'viz-to'].forEach(id => document.getElementById(id).addEventListener('change', () => loadAnalytics(true)));
        document.getElementById('viz-client').addEventListener('change', (e) => { analyticsClient = e.target.value; loadAnalytics(true); });
        document.getElementById('viz-export').addEventListener('click', () => (analyticsMode === 'web' ? exportVisitorsCsv() : exportAnalyticsCsv()));
        document.querySelectorAll('.viz-mode-btn').forEach(btn => btn.addEventListener('click', () => {
            analyticsMode = btn.dataset.mode;
            try { localStorage.setItem('viz_mode', analyticsMode); } catch (_) {}
            loadAnalytics();
        }));
        document.querySelectorAll('.vw-seg-btn').forEach(btn => btn.addEventListener('click', () => {
            vwMetric = btn.dataset.vw;
            document.querySelectorAll('.vw-seg-btn').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
            if (visitorsData) renderVisitorsTrend(visitorsData);
        }));
        document.getElementById('viz-onboard-btn').addEventListener('click', () => switchView('chatbot'));
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
        window.addEventListener('resize', () => {
            if (document.getElementById('analytics-view').classList.contains('hidden')) return;
            if (analyticsMode === 'web') { if (visitorsData) renderVisitorsTrend(visitorsData); }
            else if (analyticsData) renderTrend(analyticsData);
        });
    }
    // A forced reload means the period or filter changed: the other view's cached data is now stale
    if (force) { if (analyticsMode === 'web') analyticsData = null; else visitorsData = null; }
    // Website visitors are the Bytes website's own traffic, so only admins get the switch
    if (userRole !== 'admin') analyticsMode = 'chatbot';
    const modeBox = document.getElementById('viz-mode');
    if (modeBox) modeBox.hidden = userRole !== 'admin';
    document.querySelectorAll('.viz-mode-btn').forEach(b => { b.classList.toggle('active', b.dataset.mode === analyticsMode); b.setAttribute('aria-pressed', b.dataset.mode === analyticsMode); });
    document.getElementById('viz-chatbot').hidden = analyticsMode === 'web';
    document.getElementById('viz-web').hidden = analyticsMode !== 'web';
    const clientSel = document.getElementById('viz-client');
    if (clientSel && analyticsMode === 'web') clientSel.hidden = true;
    if (analyticsMode === 'web') return loadVisitors(force);

    if (analyticsData && !force) { renderAnalytics(analyticsData); return; }

    const params = new URLSearchParams({ tz: new Date().getTimezoneOffset() });
    if (analyticsRange === 'custom') {
        const f = document.getElementById('viz-from').value, t = document.getElementById('viz-to').value;
        if (!f || !t) return;
        const from = new Date(`${f}T00:00:00`).getTime(), to = new Date(`${t}T23:59:59.999`).getTime();
        params.set('from', Math.min(from, to)); params.set('to', Math.max(from, to));
    } else params.set('days', analyticsRange);
    if (analyticsClient) params.set('clientId', analyticsClient);

    const kpis = document.getElementById('viz-kpis');
    if (kpis && !analyticsData) kpis.innerHTML = '<div class="viz-kpi"><span class="viz-kpi-label">Loading…</span></div>';
    document.getElementById('analytics-view')?.setAttribute('aria-busy', 'true');
    try {
        const res = await apiFetch(`${API_BASE}/api/analytics?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        analyticsData = await res.json();
        renderAnalytics(analyticsData);
    } catch (err) {
        console.error('[Analytics]', err);
        if (kpis) {
            kpis.innerHTML = '<div class="viz-kpi"><span class="viz-kpi-label">Could not load analytics</span><span class="viz-kpi-help">Check your connection and try again.</span><button type="button" class="cl-btn viz-retry">Retry</button></div>';
            kpis.querySelector('.viz-retry').onclick = () => loadAnalytics(true);
        }
    } finally {
        document.getElementById('analytics-view')?.removeAttribute('aria-busy');
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
const vizRangeLabel = (d) => `${new Date(d.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(d.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

function deltaHtml(cur, prev, { isRate = false, days, lowerIsBetter = false }) {
    if (!days) return '<span>All time</span>';
    if (cur == null || prev == null) return `<span>no ${periodName(days)} data</span>`;
    if (isRate) {
        const pts = (cur - prev) * 100;
        if (Math.abs(pts) < 0.05) return `<span>no change vs ${periodName(days)}</span>`;
        const cls = (pts > 0) !== lowerIsBetter ? 'up' : 'down';
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
    const who = d.clientId ? ` · ${d.clientId === 'default' ? 'Bytes website' : d.clientId}` : (userRole === 'admin' ? ' · all clients' : '');
    if (scope) scope.textContent = (d.previous
        ? `${vizRangeLabel(d)}, compared with the ${d.days} days before`
        : `All time (${vizRangeLabel(d)})`) + `${who}. Conversations are estimated (a new one starts after 30 min of inactivity).`;

    const clientSel = document.getElementById('viz-client');
    if (clientSel && userRole === 'admin' && d.clients?.length > 1) {
        clientSel.hidden = false;
        clientSel.innerHTML = '<option value="">All clients</option>' + d.clients.map(cid => `<option value="${escapeHtml(cid)}">${escapeHtml(cid === 'default' ? 'Bytes website' : cid)}</option>`).join('');
        clientSel.value = analyticsClient;
    }
    document.getElementById('viz-onboard').hidden = d.everActive !== false;
    renderQuality(d);

    const low = (n) => n > 0 && n < MIN_SAMPLE ? `<span class="viz-kpi-warn">n=${n}: too few for a reliable rate</span>` : '';
    const tiles = [
        { label: 'Conversations', value: fmtInt(c.conversations), delta: deltaHtml(c.conversations, p.conversations, d), help: 'Chats started on your sites' },
        { label: 'Leads', value: fmtInt(c.leads), delta: deltaHtml(c.leads, p.leads, d), help: 'Contacts captured by the bot' },
        { label: 'Chat → lead', value: fmtPct(c.chatToLead), delta: deltaHtml(c.chatToLead, p.chatToLead, { ...d, isRate: true }), help: 'Leads ÷ conversations', extra: low(c.conversations) },
        { label: 'Verified email', value: fmtPct(c.verifiedRate), delta: deltaHtml(c.verifiedRate, p.verifiedRate, { ...d, isRate: true }), help: 'Leads who confirmed their email', extra: low(c.leads) },
        { label: 'Lead → opportunity', value: fmtPct(c.qualifiedRate), delta: deltaHtml(c.qualifiedRate, p.qualifiedRate, { ...d, isRate: true }), help: 'Moved to Opportunity or later', extra: low(c.leads) },
        { label: 'Pipeline value', value: fmtMoney(c.pipelineValue), delta: deltaHtml(c.pipelineValue, p.pipelineValue, d), help: `Stated budgets, ${c.withBudget} of ${c.leads} leads${Object.keys(c.pipelineOther || {}).length ? ` · plus ${Object.entries(c.pipelineOther).map(([cur, v]) => fmtMoney(v).replace('£', cur)).join(' + ')}` : ''}` },
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

// ── Trend: this period (blue, solid) against the previous period (grey, dashed) on one axis
function renderTrend(d) {
    const el = document.getElementById('viz-trend');
    const tableEl = document.getElementById('viz-trend-table');
    const title = document.getElementById('viz-trend-title');
    const legend = document.getElementById('viz-legend');
    if (!el) return;
    const m = analyticsMetric;
    const names = { leads: 'Leads', conversations: 'Conversations', rate: 'Chat → lead rate' };
    if (title) title.textContent = `${names[m]} per ${d.bucket}`;
    const val = (s, prev) => {
        const L = prev ? s.prevLeads : s.leads, C = prev ? s.prevConversations : s.conversations;
        if (prev && L == null) return null;
        return m === 'rate' ? (C ? L / C : null) : (m === 'leads' ? L : C);
    };
    const hasPrev = !!d.previous;
    const pts = d.series.map(s => ({ t: s.t, v: val(s, false), pv: hasPrev ? val(s, true) : null, s }));
    const fmtV = (v) => v == null ? '—' : m === 'rate' ? fmtPct(v) : fmtInt(v);
    if (legend) legend.innerHTML = hasPrev
        ? `<span><i class="viz-key viz-key-cur"></i>This period</span><span><i class="viz-key viz-key-prev"></i>Previous ${d.days} days</span>`
        : '';

    if (tableEl) tableEl.innerHTML = `<div class="viz-table-scroll"><table><thead><tr><th>${d.bucket === 'week' ? 'Week of' : 'Day'}</th><th>Conversations</th><th>Leads</th><th>Chat → lead</th>${hasPrev ? '<th>Prev. conversations</th><th>Prev. leads</th>' : ''}</tr></thead><tbody>${
        d.series.map(s => `<tr><td>${bucketLabel(s.t, d.bucket)}</td><td>${s.conversations}</td><td>${s.leads}</td><td>${fmtPct(s.conversations ? s.leads / s.conversations : null)}</td>${hasPrev ? `<td>${s.prevConversations}</td><td>${s.prevLeads}</td>` : ''}</tr>`).join('')
    }</tbody></table></div>`;

    if (!pts.some(p => p.v || p.pv)) { el.innerHTML = `<div class="viz-empty">No ${names[m].toLowerCase()} in this period yet.</div>`; return; }

    const W = el.clientWidth || 600, H = el.clientHeight || 220;
    const pad = { l: 34, r: 8, t: 14, b: 22 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const rawMax = Math.max(...pts.map(p => Math.max(p.v || 0, p.pv || 0)));
    const max = m === 'rate' ? Math.min(1, Math.max(0.05, Math.ceil(rawMax * 10) / 10)) : Math.max(1, niceMax(rawMax));
    const x = (i) => pad.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
    const y = (v) => pad.t + ih - (v / max) * ih;
    const ticks = [0, max / 2, max];
    const pathOf = (key) => { let dPath = '', on = false; pts.forEach((p, i) => { if (p[key] == null) { on = false; return; } dPath += `${on ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`; on = true; }); return dPath; };
    const valid = pts.map((p, i) => ({ ...p, i })).filter(p => p.v != null);
    const area = valid.length ? `M${x(valid[0].i)},${y(0)} ` + valid.map(p => `L${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ') + ` L${x(valid[valid.length - 1].i)},${y(0)} Z` : '';

    const step = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(iw / 70))));
    const xlabels = pts.map((p, i) => (i % step === 0 || i === pts.length - 1) && !(i !== pts.length - 1 && pts.length - 1 - i < step / 2)
        ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${bucketLabel(p.t, d.bucket)}</text>` : '').join('');
    const peak = valid.length ? valid.reduce((a, b) => (b.v > a.v ? b : a), valid[0]) : null;

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${names[m]} per ${d.bucket}${peak ? `, peak ${fmtV(peak.v)} on ${bucketLabel(peak.t, d.bucket)}` : ''}${hasPrev ? ', with the previous period dashed' : ''}">
        <defs><linearGradient id="viz-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--viz-1)" stop-opacity="0.24"/><stop offset="1" stop-color="var(--viz-1)" stop-opacity="0"/></linearGradient></defs>
        <g class="viz-axis">${ticks.map(t => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${m === 'rate' ? fmtPct(t) : fmtInt(Math.round(t))}</text>`).join('')}${xlabels}</g>
        ${hasPrev ? `<path d="${pathOf('pv')}" fill="none" stroke="var(--viz-prev)" stroke-width="1.5" stroke-dasharray="4 4" stroke-linejoin="round"/>` : ''}
        <path d="${area}" fill="url(#viz-area)"/>
        <path d="${pathOf('v')}" fill="none" stroke="var(--viz-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${peak ? `<circle cx="${x(peak.i)}" cy="${y(peak.v)}" r="4" fill="var(--viz-1)" stroke="var(--bg-secondary)" stroke-width="2"/>
        <text x="${Math.min(W - pad.r - 4, Math.max(pad.l + 4, x(peak.i)))}" y="${Math.max(10, y(peak.v) - 9)}" text-anchor="middle" font-size="10" fill="var(--text-primary)">${fmtV(peak.v)}</text>` : ''}
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
        showTip(`<b>${bucketLabel(p.t, d.bucket, true)}</b><br>${names[m]}: <b>${fmtV(p.v)}</b>${hasPrev ? `<br><span style="color:var(--text-secondary)">Previous period: ${fmtV(p.pv)}</span>` : ''}<br><span style="color:var(--text-secondary)">${p.s.conversations} conversations · ${p.s.leads} leads</span>`, e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); });
}

// ── Chatbot quality: how deep conversations go and whether the bot is stuck on one reply
function renderQuality(d) {
    const el = document.getElementById('viz-quality');
    if (!el) return;
    const c = d.current, p = d.previous || {};
    if (!c.conversations) { el.hidden = true; return; }
    el.hidden = false;
    const item = (label, value, delta, help, warn) => `<div class="viz-q-item${warn ? ' viz-q-warn' : ''}"><span class="viz-kpi-label">${label}</span><span class="viz-q-num">${value}</span><span class="viz-kpi-delta">${delta}</span><span class="viz-kpi-help">${help}</span></div>`;
    const avgDelta = d.previous && p.avgMessages != null && c.avgMessages != null
        ? (Math.abs(c.avgMessages - p.avgMessages) < 0.05 ? `<span>no change vs ${periodName(d.days)}</span>` : `<span class="${c.avgMessages > p.avgMessages ? 'up' : 'down'}">${c.avgMessages > p.avgMessages ? '▲' : '▼'} ${Math.abs(c.avgMessages - p.avgMessages).toFixed(1)}</span> vs ${periodName(d.days)}`)
        : deltaHtml(null, null, d);
    el.innerHTML = `<h3>Chatbot quality</h3>` +
        item('Messages per conversation', c.avgMessages == null ? '—' : c.avgMessages.toFixed(1), avgDelta, 'Deeper chats usually mean more engaged visitors') +
        item('One-message chats', fmtPct(c.singleMessageRate), deltaHtml(c.singleMessageRate, p.singleMessageRate, { ...d, isRate: true, lowerIsBetter: true }), 'Visitor left after the first reply', c.singleMessageRate > 0.5) +
        item('Same reply every time', fmtPct(c.repeatedRate), deltaHtml(c.repeatedRate, p.repeatedRate, { ...d, isRate: true, lowerIsBetter: true }), c.repeatedRate > 0 ? 'Bot repeated one canned answer: check its mode and AI model' : 'No canned-reply loops', c.repeatedRate > 0);
}

function exportAnalyticsCsv() {
    const d = analyticsData; if (!d) return;
    const cell = csvCell;
    const c = d.current, p = d.previous || {};
    const rows = [['metric', 'this_period', 'previous_period'],
        ...[['conversations', c.conversations, p.conversations], ['leads', c.leads, p.leads], ['chat_to_lead_rate', c.chatToLead, p.chatToLead], ['verified_rate', c.verifiedRate, p.verifiedRate],
            ['lead_to_opportunity_rate', c.qualifiedRate, p.qualifiedRate], ['pipeline_value_gbp', c.pipelineValue, p.pipelineValue], ['avg_messages_per_conversation', c.avgMessages, p.avgMessages],
            ['one_message_chat_rate', c.singleMessageRate, p.singleMessageRate], ['same_reply_rate', c.repeatedRate, p.repeatedRate], ['emails_sent', c.emailsSent, p.emailsSent]],
        [], [d.bucket === 'week' ? 'week_of' : 'date', 'conversations', 'leads', 'prev_conversations', 'prev_leads'],
        ...d.series.map(s => [new Date(s.t).toISOString().slice(0, 10), s.conversations, s.leads, s.prevConversations ?? '', s.prevLeads ?? ''])];
    const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analytics-${new Date(d.from).toISOString().slice(0, 10)}-to-${new Date(d.to).toISOString().slice(0, 10)}${d.clientId ? `-${d.clientId}` : ''}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
        w.oldest.map(l => `<button type="button" class="viz-wait-item" data-lead-id="${escapeHtml(String(l.id))}" aria-label="Open ${escapeHtml(l.name || 'lead')}"><span>${escapeHtml(l.name || 'Unknown')}${l.service ? ` · <span style="color:var(--text-secondary)">${escapeHtml(l.service)}</span>` : ''}</span><span>${age(l.timestamp)} waiting</span></button>`).join('') +
        '<p class="viz-wait-note">Replying within an hour makes a lead far more likely to convert than replying the next day.</p>';
    el.querySelectorAll('[data-lead-id]').forEach(b => b.addEventListener('click', () => {
        window.ldOpenAfterLoad = b.dataset.leadId; // the Leads page opens it once loaded
        switchView('leads');
    }));
}

// ─── Website visitors (admin only): cookieless page views of the Bytes website ────
async function loadVisitors(force = false) {
    if (visitorsData && !force) { renderVisitors(visitorsData); return; }
    const params = new URLSearchParams({ tz: new Date().getTimezoneOffset() });
    if (analyticsRange === 'custom') {
        const f = document.getElementById('viz-from').value, t = document.getElementById('viz-to').value;
        if (!f || !t) return;
        const from = new Date(`${f}T00:00:00`).getTime(), to = new Date(`${t}T23:59:59.999`).getTime();
        params.set('from', Math.min(from, to)); params.set('to', Math.max(from, to));
    } else params.set('days', analyticsRange);
    const kpis = document.getElementById('vw-kpis');
    if (!visitorsData) kpis.innerHTML = '<div class="viz-kpi"><span class="viz-kpi-label">Loading…</span></div>';
    document.getElementById('analytics-view')?.setAttribute('aria-busy', 'true');
    try {
        const res = await apiFetch(`${API_BASE}/api/analytics/visitors?${params}`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        visitorsData = await res.json();
        renderVisitors(visitorsData);
    } catch (err) {
        console.error('[Visitors]', err);
        kpis.innerHTML = `<div class="viz-kpi"><span class="viz-kpi-label">Could not load website visitors</span><span class="viz-kpi-help">${escapeHtml(err.message)}</span><button type="button" class="cl-btn viz-retry">Retry</button></div>`;
        kpis.querySelector('.viz-retry').onclick = () => loadVisitors(true);
    } finally {
        document.getElementById('analytics-view')?.removeAttribute('aria-busy');
    }
}

const vwCountry = (() => { let dn = null; try { dn = new Intl.DisplayNames(['en-GB'], { type: 'region' }); } catch (_) {} return (code) => { if (!code || code === 'Unknown' || code === 'XX' || code === 'T1') return code === 'T1' ? 'Tor network' : 'Unknown'; try { return dn ? dn.of(code) : code; } catch (_) { return code; } }; })();

function renderVisitors(d) {
    const c = d.current, p = d.previous || {};
    document.getElementById('vw-scope').textContent = `${d.previous ? `${vizRangeLabel(d)}, compared with the ${d.days} days before` : `All time (${vizRangeLabel(d)})`} · Bytes website. Counted without cookies; a visitor is counted once per day.`;
    document.getElementById('vw-empty').hidden = d.everTracked !== false;
    const low = (n) => n > 0 && n < MIN_SAMPLE ? `<span class="viz-kpi-warn">n=${n}: too few for a reliable rate</span>` : '';
    const tiles = [
        { label: 'Visitors', value: fmtInt(c.visitors), delta: deltaHtml(c.visitors, p.visitors, d), help: 'Unique visitors per day, added up' },
        { label: 'Page views', value: fmtInt(c.views), delta: deltaHtml(c.views, p.views, d), help: 'Every page opened' },
        { label: 'Pages per visit', value: c.pagesPerVisit == null ? '—' : c.pagesPerVisit.toFixed(1), delta: d.previous && p.pagesPerVisit != null && c.pagesPerVisit != null ? (Math.abs(c.pagesPerVisit - p.pagesPerVisit) < 0.05 ? `<span>no change vs ${periodName(d.days)}</span>` : `<span class="${c.pagesPerVisit > p.pagesPerVisit ? 'up' : 'down'}">${c.pagesPerVisit > p.pagesPerVisit ? '▲' : '▼'} ${Math.abs(c.pagesPerVisit - p.pagesPerVisit).toFixed(1)}</span> vs ${periodName(d.days)}`) : deltaHtml(null, null, d), help: 'Page views ÷ visitors' },
        { label: 'Bounce rate', value: fmtPct(c.bounceRate), delta: deltaHtml(c.bounceRate, p.bounceRate, { ...d, isRate: true, lowerIsBetter: true }), help: 'Left after one page', extra: low(c.visitors) },
        { label: 'Chatted', value: fmtPct(c.chatRate), delta: '', help: `${fmtInt(c.conversations)} conversations ÷ visitors`, extra: low(c.visitors) },
        { label: 'Became leads', value: fmtPct(c.leadRate), delta: '', help: `${fmtInt(c.leads)} leads (chat + contact form) ÷ visitors`, extra: low(c.visitors) },
    ];
    document.getElementById('vw-kpis').innerHTML = tiles.map(t => `
        <div class="viz-kpi">
            <span class="viz-kpi-label">${t.label}</span>
            <span class="viz-kpi-num">${t.value}</span>
            <span class="viz-kpi-delta">${t.delta}</span>
            <span class="viz-kpi-help">${t.help}</span>
            ${t.extra || ''}
        </div>`).join('');
    document.getElementById('vw-live').innerHTML = `<i class="vw-live-dot${d.live ? ' on' : ''}" aria-hidden="true"></i>${d.live} visitor${d.live === 1 ? '' : 's'} in the last 5 minutes`;

    renderVisitorsTrend(d);
    // Funnel: visitors → chatted → leads (each a share of visitors)
    const steps = [{ label: 'Visitors', n: c.visitors }, { label: 'Started a chat', n: c.conversations }, { label: 'Became leads', n: c.leads }];
    const topN = Math.max(1, c.visitors);
    document.getElementById('vw-funnel').innerHTML = steps.map((s, i) => `<div>
        <div class="viz-fstep-top"><span>${s.label}</span><b>${fmtInt(s.n)}</b></div>
        <div class="viz-ftrack" role="img" aria-label="${s.label}: ${s.n}"><div class="viz-fbar" style="width:${s.n ? Math.max(2, Math.min(100, (s.n / topN) * 100)) : 0}%;animation-delay:${i * 60}ms"></div></div>
        <div class="viz-fconv">${i ? (c.visitors ? `${fmtPct(Math.min(1, s.n / c.visitors))} of visitors` : '—') : 'Start of funnel'}</div>
    </div>`).join('') + '<p class="viz-wait-note">Leads include contact-form enquiries; conversations can\'t be matched to individual visitors, so these are period totals.</p>';

    const bars = (id, rows, empty, nameFn = (x) => x, title) => {
        const el = document.getElementById(id);
        if (!rows.length) { el.innerHTML = empty ? `<div class="viz-empty">${empty}</div>` : ''; return; }
        const top = Math.max(1, ...rows.map(r => r.visitors));
        el.innerHTML = (title ? `<p class="vw-subhead">${title}</p>` : '') + rows.map((r, i) => `<div>
            <div class="viz-hbar-top"><span title="${escapeHtml(nameFn(r.name))}">${escapeHtml(nameFn(r.name))}</span><span>${fmtInt(r.visitors)} · ${fmtInt(r.views)}</span></div>
            <div class="viz-ftrack"><div class="viz-fbar" style="width:${(r.visitors / top) * 100}%;animation-delay:${i * 40}ms"></div></div>
        </div>`).join('');
    };
    const pageName = (pth) => ({ '/': 'Home', '/onboarding/': 'Sign-up (onboarding)', '/privacy-policy.html': 'Privacy policy', '/cookie-policy.html': 'Cookie policy', '/terms-of-service.html': 'Terms of service', '/data-deletion.html': 'Data deletion' })[pth] || pth;
    bars('vw-pages', d.pages, 'No page views in this period yet.', pageName);
    bars('vw-sources', d.sources, 'No visits in this period yet.');
    bars('vw-campaigns', d.campaigns, '', (x) => x, 'Campaigns (utm_campaign)');
    bars('vw-countries', d.countries, 'No visits in this period yet.', vwCountry);
    bars('vw-devices', d.devices, 'No visits in this period yet.');
    bars('vw-browsers', d.browsers, 'No visits in this period yet.');
}

function renderVisitorsTrend(d) {
    const el = document.getElementById('vw-trend');
    const m = vwMetric, name = m === 'views' ? 'Page views' : 'Visitors';
    document.getElementById('vw-trend-title').textContent = `${name} per ${d.bucket}`;
    document.getElementById('vw-trend-table').innerHTML = `<div class="viz-table-scroll"><table><thead><tr><th>${d.bucket === 'week' ? 'Week of' : 'Day'}</th><th>Visitors</th><th>Page views</th></tr></thead><tbody>${d.series.map(s => `<tr><td>${bucketLabel(s.t, d.bucket)}</td><td>${s.visitors}</td><td>${s.views}</td></tr>`).join('')}</tbody></table></div>`;
    const pts = d.series.map(s => ({ t: s.t, v: s[m] }));
    if (!pts.some(p => p.v)) { el.innerHTML = `<div class="viz-empty">No ${name.toLowerCase()} in this period yet.</div>`; return; }
    const W = el.clientWidth || 600, H = el.clientHeight || 220, pad = { l: 34, r: 8, t: 14, b: 22 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const max = Math.max(1, niceMax(Math.max(...pts.map(p => p.v))));
    const x = (i) => pad.l + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw);
    const y = (v) => pad.t + ih - (v / max) * ih;
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
    const area = `M${x(0)},${y(0)} ` + pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ') + ` L${x(pts.length - 1)},${y(0)} Z`;
    const step = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(iw / 70))));
    const xl = pts.map((p, i) => (i % step === 0 || i === pts.length - 1) && !(i !== pts.length - 1 && pts.length - 1 - i < step / 2) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${bucketLabel(p.t, d.bucket)}</text>` : '').join('');
    const peak = pts.reduce((a, b, i) => (b.v > a.v ? { ...b, i } : a), { ...pts[0], i: 0 });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${name} per ${d.bucket}, peak ${fmtInt(peak.v)} on ${bucketLabel(peak.t, d.bucket)}">
        <defs><linearGradient id="vw-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--viz-1)" stop-opacity="0.24"/><stop offset="1" stop-color="var(--viz-1)" stop-opacity="0"/></linearGradient></defs>
        <g class="viz-axis">${[0, max / 2, max].map(t => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${fmtInt(Math.round(t))}</text>`).join('')}${xl}</g>
        <path d="${area}" fill="url(#vw-area)"/>
        <path d="${line}" fill="none" stroke="var(--viz-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${x(peak.i)}" cy="${y(peak.v)}" r="4" fill="var(--viz-1)" stroke="var(--bg-secondary)" stroke-width="2"/>
        <text x="${Math.min(W - pad.r - 4, Math.max(pad.l + 4, x(peak.i)))}" y="${Math.max(10, y(peak.v) - 9)}" text-anchor="middle" font-size="10" fill="var(--text-primary)">${fmtInt(peak.v)}</text>
        <line class="vw-cross" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--text-secondary)" stroke-dasharray="3 3" visibility="hidden"/>
        <circle class="vw-dot" r="5" fill="var(--viz-1)" stroke="var(--bg-secondary)" stroke-width="2" visibility="hidden"/>
        <rect class="vw-hit" x="${pad.l}" y="0" width="${iw}" height="${H}" fill="transparent"/>
    </svg>`;
    const svg = el.querySelector('svg'), cross = el.querySelector('.vw-cross'), dot = el.querySelector('.vw-dot'), hit = el.querySelector('.vw-hit');
    hit.addEventListener('pointermove', (e) => {
        const box = svg.getBoundingClientRect();
        const px = (e.clientX - box.left) * (W / box.width);
        const i = Math.max(0, Math.min(pts.length - 1, Math.round(pts.length === 1 ? 0 : ((px - pad.l) / iw) * (pts.length - 1))));
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(pts[i].v)); dot.setAttribute('visibility', 'visible');
        const s = d.series[i];
        showTip(`<b>${bucketLabel(s.t, d.bucket, true)}</b><br>${fmtInt(s.visitors)} visitors · ${fmtInt(s.views)} page views`, e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); });
}

function exportVisitorsCsv() {
    const d = visitorsData; if (!d) return;
    const c = d.current, p = d.previous || {};
    const rows = [['metric', 'this_period', 'previous_period'],
        ['visitors', c.visitors, p.visitors], ['page_views', c.views, p.views], ['pages_per_visit', c.pagesPerVisit, p.pagesPerVisit], ['bounce_rate', c.bounceRate, p.bounceRate],
        ['conversations', c.conversations, ''], ['leads', c.leads, ''],
        [], [d.bucket === 'week' ? 'week_of' : 'date', 'visitors', 'page_views'], ...d.series.map(s => [new Date(s.t).toISOString().slice(0, 10), s.visitors, s.views]),
        [], ['top_page', 'visitors', 'views'], ...d.pages.map(r => [r.name, r.visitors, r.views]),
        [], ['source', 'visitors', 'views'], ...d.sources.map(r => [r.name, r.visitors, r.views]),
        [], ['country', 'visitors', 'views'], ...d.countries.map(r => [vwCountry(r.name), r.visitors, r.views])];
    const blob = new Blob(['﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `website-visitors-${new Date(d.from).toISOString().slice(0, 10)}-to-${new Date(d.to).toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ─── Bytes website settings (admin only) ──────────────────────────────────────
// Reads/writes /api/site-settings, which only ever touches the house client ("default").

async function loadSiteSettings() {
    siteHealth();
    loadSiteMail();
    const status = document.getElementById('site-status');
    const modelSel = document.getElementById('site-llm-model');
    if (!modelSel) return;
    status.textContent = 'Loading…';
    status.style.color = 'var(--text-secondary)';
    try {
        const [res] = await Promise.all([
            apiFetch(`${API_BASE}/api/site-settings`),
            ensureModelCatalog().catch(e => { console.error('Model catalog load failed:', e); }),
        ]);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        const d = await res.json();
        document.getElementById('site-company-name').value = d.companyName || '';
        document.getElementById('site-mode').value = d.mode || 'free';
        document.getElementById('site-llm-effort').value = ['low', 'medium', 'high'].includes(d.llmEffort) ? d.llmEffort : 'medium';
        document.getElementById('site-domains').value = (d.allowedDomains || []).join('\n');
        document.getElementById('site-prompt').value = d.systemPrompt || '';
        document.querySelectorAll('#site-settings-view [data-social]').forEach(el => {
            el.value = (d.socials || {})[el.dataset.social] || '';
            el.removeAttribute('aria-invalid');
        });
        if (modelCatalog) populateModelSelect(modelSel, d.llmModel || '');
        else modelSel.innerHTML = '<option value="">Default model (could not load the model list)</option>';
        document.getElementById('site-llm-cost').innerHTML = modelCostHtml(modelSel.value);
        status.textContent = '';
        siteRefreshUI();
        document.getElementById('site-card')?.classList.remove('cb-dirty');
    } catch (e) {
        status.textContent = `Could not load website settings: ${e.message}`;
        status.style.color = 'var(--error)';
    }
}

document.getElementById('site-llm-model')?.addEventListener('change', (e) => {
    document.getElementById('site-llm-cost').innerHTML = modelCostHtml(e.target.value);
});

document.getElementById('site-save-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('site-status');
    const btn = document.getElementById('site-save-btn');
    const modelSel = document.getElementById('site-llm-model');
    const body = {
        companyName: document.getElementById('site-company-name').value.trim(),
        mode: document.getElementById('site-mode').value,
        llmEffort: document.getElementById('site-llm-effort').value,
        allowedDomains: siteDomainList(),
        systemPrompt: document.getElementById('site-prompt').value.trim(),
        socials: Object.fromEntries([...document.querySelectorAll('#site-settings-view [data-social]')].map(el => [el.dataset.social, el.value.trim()])),
    };
    document.querySelectorAll('#site-settings-view [data-social]').forEach(el => el.removeAttribute('aria-invalid'));
    // Only send the model once the list loaded, so a failed load can't wipe the saved choice
    if (modelSel.dataset.filled) body.llmModel = modelSel.value || '';
    btn.disabled = true;
    status.textContent = 'Saving…';
    status.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/site-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            (data.fields || []).forEach(f => document.getElementById(`site-social-${f}`)?.setAttribute('aria-invalid', 'true'));
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        if (data.socials) document.querySelectorAll('#site-settings-view [data-social]').forEach(el => { el.value = data.socials[el.dataset.social] || ''; });
        const dropped = body.allowedDomains.length - (data.allowedDomains || []).length;
        if (data.allowedDomains) document.getElementById('site-domains').value = data.allowedDomains.join('\n');
        status.textContent = dropped > 0 ? `Saved. ${dropped} invalid domain${dropped === 1 ? ' was' : 's were'} skipped.` : 'Website settings saved.';
        status.style.color = 'var(--success)';
    } catch (e) {
        status.textContent = `Save failed: ${e.message}`;
        status.style.color = 'var(--error)';
    } finally {
        btn.disabled = false;
    }
});

// ─── Website email sender (Settings): mail:default, with the server-secret and agency fallbacks ───
let siteMailSavedKey = false;
const SM = (id) => document.getElementById(id);

function siteMailProviderUI() {
    const p = SM('site-mail-provider').value;
    SM('site-mail-fields').classList.toggle('cb-muted', !p);
    SM('site-mail-fields').querySelectorAll('input').forEach(i => { i.disabled = !p; });
    SM('site-mail-mailgun-group').hidden = p !== 'mailgun';
    SM('site-mail-api-key-label').textContent = p === 'resend' ? 'API key (starts with re_)' : p === 'sendgrid' ? 'API key (starts with SG.)' : 'API key';
}

function siteMailSource(d) {
    const el = SM('site-mail-source');
    const from = d._activeFrom ? ` from <strong>${escapeHtml(d._activeFrom)}</strong>` : '';
    const map = {
        saved: ['ok', `Website emails go out with the sender saved below${from}.`],
        secret: ['ok', `Website emails go out with the Resend key saved as a server secret${from}. Saving a sender below overrides it.`],
        agency: ['warn', `No website sender of its own: emails go out with the agency sender from the Chatbot page${from}.`],
        none: ['bad', 'No email sender is set up, so website leads aren\'t getting verification emails. Choose a provider below.'],
    };
    const [state, text] = map[d._source] || map.none;
    el.className = `site-mail-source cb-${state}`;
    el.innerHTML = `<span class="cb-stat-dot" aria-hidden="true"></span><span>${text}</span>`;
}

async function loadSiteMail() {
    const st = SM('site-mail-status');
    if (!st) return;
    try {
        const res = await apiFetch(`${API_BASE}/api/mail-settings?site=1`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        const d = await res.json();
        SM('site-mail-provider').value = ['resend', 'sendgrid', 'mailgun'].includes(d.provider) ? d.provider : '';
        SM('site-mail-from-name').value = d.fromName || '';
        SM('site-mail-from-email').value = d.fromEmail || '';
        SM('site-mail-mailgun-domain').value = d.mailgunDomain || '';
        SM('site-mail-api-key').value = '';
        siteMailSavedKey = !!d.apiKey;
        SM('site-mail-key-hint').textContent = d.apiKey ? `A key ending in ${d.apiKey.replace(/^•+/, '')} is saved. Leave this empty to keep it.` : (d._secretKey ? 'A Resend key is also saved as a server secret; it is used when no sender is saved here.' : '');
        siteMailSource(d);
        siteMailProviderUI();
        SM('site-mail-card').classList.remove('cb-dirty');
        st.textContent = '';
    } catch (e) {
        st.textContent = `Could not load the email sender: ${e.message}`;
        st.style.color = 'var(--error)';
    }
}

SM('site-mail-provider')?.addEventListener('change', siteMailProviderUI);
['input', 'change'].forEach(ev => SM('site-mail-card')?.addEventListener(ev, (e) => { if (e.isTrusted && !e.target.closest('button')) SM('site-mail-card').classList.add('cb-dirty'); }));

SM('site-mail-save')?.addEventListener('click', async () => {
    const st = SM('site-mail-status'), btn = SM('site-mail-save');
    const provider = SM('site-mail-provider').value;
    const fromEmail = SM('site-mail-from-email').value.trim();
    const apiKey = SM('site-mail-api-key').value.trim();
    const fail = (msg, el) => { st.textContent = msg; st.style.color = 'var(--error)'; el?.focus(); };
    if (provider) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fromEmail)) return fail('Enter the From email, on a domain verified with the provider.', SM('site-mail-from-email'));
        if (!apiKey && !siteMailSavedKey) return fail('Paste the API key.', SM('site-mail-api-key'));
        if (provider === 'resend' && apiKey && !apiKey.startsWith('re_')) return fail('Resend keys start with re_. Check you copied the whole key.', SM('site-mail-api-key'));
        if (provider === 'mailgun' && !SM('site-mail-mailgun-domain').value.trim()) return fail('Enter the Mailgun sending domain.', SM('site-mail-mailgun-domain'));
    }
    const body = { provider, fromName: SM('site-mail-from-name').value.trim(), fromEmail, mailgunDomain: SM('site-mail-mailgun-domain').value.trim() };
    if (apiKey) body.apiKey = apiKey;
    btn.disabled = true;
    st.textContent = 'Saving…'; st.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/mail-settings?site=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        await loadSiteMail();
        st.textContent = provider ? '✓ Email sender saved. Send a test email to check it.' : '✓ Saved. Website emails now use the fallback sender.';
        st.style.color = 'var(--success)';
        siteHealth();
    } catch (e) {
        fail(`Save failed: ${e.message}`);
    } finally { btn.disabled = false; }
});

SM('site-mail-test')?.addEventListener('click', async () => {
    const st = SM('site-mail-status'), btn = SM('site-mail-test');
    if (SM('site-mail-card').classList.contains('cb-dirty')) { st.textContent = 'Save your changes first, then send the test.'; st.style.color = 'var(--warning, #f59e0b)'; return; }
    btn.disabled = true;
    st.textContent = 'Sending a test email…'; st.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/mail-settings/test?site=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
        st.textContent = `✓ Test email sent to ${d.sentTo || 'your email'}. Check the inbox (and spam folder).`;
        st.style.color = 'var(--success)';
    } catch (e) {
        st.textContent = `Test failed: ${e.message}`; st.style.color = 'var(--error)';
    } finally { btn.disabled = false; }
});
window.addEventListener('beforeunload', (e) => { if (SM('site-mail-card')?.classList.contains('cb-dirty')) { e.preventDefault(); e.returnValue = ''; } });

// ─── Chat Logs: conversations inbox ───────────────────────────────────────────
// /api/conversations groups messages into conversations (30-min inactivity rule), links captured
// leads and returns a daily series. "New" = last message after you last marked the inbox read,
// and not opened since; tracked per browser in localStorage.

const CL = { range: '7', from: null, to: null, data: null, offset: 0, selected: null, timer: null };
const CL_SEEN_KEY = 'cl_seen_at';
const CL_READ_KEY = 'cl_read_ids';

function clSeenAt() {
    let v = 0;
    try { v = parseInt(localStorage.getItem(CL_SEEN_KEY) || '0', 10); } catch (_) {}
    if (!v) { v = Date.now() - 86400000; try { localStorage.setItem(CL_SEEN_KEY, String(v)); } catch (_) {} } // first visit: last 24h count as new
    return v;
}
function clReadIds() { try { return new Set(JSON.parse(localStorage.getItem(CL_READ_KEY) || '[]')); } catch (_) { return new Set(); } }
function clMarkRead(id) {
    const ids = clReadIds(); ids.add(id);
    try { localStorage.setItem(CL_READ_KEY, JSON.stringify([...ids].slice(-500))); } catch (_) {}
}
function clIsNew(cv) { return cv.end > clSeenAt() && !clReadIds().has(cv.id); }

function clRange() {
    if (CL.range === 'custom') {
        const f = document.getElementById('cl-from').value, t = document.getElementById('cl-to').value;
        const from = f ? new Date(`${f}T00:00:00`).getTime() : Date.now() - 7 * 86400000;
        const to = t ? new Date(`${t}T23:59:59.999`).getTime() : Date.now();
        return { from: Math.min(from, to), to: Math.max(from, to) };
    }
    const days = parseInt(CL.range, 10);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return { from: start.getTime() - (days - 1) * 86400000, to: Date.now() };
}

function clQuery(extra = {}) {
    const { from, to } = clRange();
    const p = new URLSearchParams({ from, to, tz: new Date().getTimezoneOffset(), offset: CL.offset, ...extra });
    const q = document.getElementById('cl-q').value.trim();
    if (q) p.set('q', q);
    const client = document.getElementById('cl-client').value;
    if (client) p.set('clientId', client);
    if (document.getElementById('cl-leads-only').checked) p.set('leadsOnly', '1');
    return p;
}

let clListenersAttached = false;
function clAttachListeners() {
    if (clListenersAttached) return;
    clListenersAttached = true;
    const reload = () => { CL.offset = 0; CL.selected = null; loadConversations(); };
    const rangeBtns = document.querySelectorAll('#logs-view .cl-seg-btn[data-range]');
    rangeBtns.forEach(btn => btn.addEventListener('click', () => {
        rangeBtns.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
        CL.range = btn.dataset.range;
        const custom = document.getElementById('cl-custom');
        custom.hidden = CL.range !== 'custom';
        if (CL.range === 'custom' && !document.getElementById('cl-from').value) {
            const today = new Date(); const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
            document.getElementById('cl-to').value = iso(today);
            document.getElementById('cl-from').value = iso(new Date(today.getTime() - 13 * 86400000));
        }
        reload();
    }));
    ['cl-from', 'cl-to', 'cl-client', 'cl-leads-only'].forEach(id => document.getElementById(id).addEventListener('change', reload));
    let t; document.getElementById('cl-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(reload, 300); });
    document.getElementById('cl-more').addEventListener('click', () => { CL.offset += CL.data.pageSize; loadConversations(true); });
    document.getElementById('cl-mark-read').addEventListener('click', () => {
        try { localStorage.setItem(CL_SEEN_KEY, String(Date.now())); localStorage.removeItem(CL_READ_KEY); } catch (_) {}
        renderConvList(); refreshLogsBadge();
    });
    document.getElementById('cl-export').addEventListener('click', exportConversationsCsv);
    document.getElementById('cl-list').addEventListener('click', (e) => {
        const item = e.target.closest('[data-cid]');
        if (item) openConversation(item.dataset.cid);
    });
    document.getElementById('cl-list').addEventListener('keydown', (e) => {
        if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
        const items = [...document.querySelectorAll('#cl-list [data-cid]')];
        const i = items.indexOf(document.activeElement);
        const next = items[e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1)];
        if (next) { e.preventDefault(); next.focus(); openConversation(next.dataset.cid); }
    });
}

const clSig = (d) => `${d.total}|${d.conversations.map(c => `${c.id}:${c.messageCount}`).join(',')}`;

// auto = the minute refresh: leaves the screen alone unless new messages arrived
async function loadConversations(append = false, auto = false) {
    clAttachListeners();
    const countEl = document.getElementById('cl-count');
    if (!append && !auto) countEl.textContent = 'Loading…';
    try {
        const res = await apiFetch(`${API_BASE}/api/conversations?${clQuery()}`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        const data = await res.json();
        if (auto && CL.data && clSig(data) === clSig({ ...CL.data, conversations: CL.data.conversations.slice(0, data.pageSize) })) { refreshLogsBadge(); return; }
        if (append && CL.data) data.conversations = CL.data.conversations.concat(data.conversations);
        CL.data = data;
        const clientSel = document.getElementById('cl-client');
        if (userRole === 'admin' && data.clients?.length) {
            clientSel.hidden = false;
            const cur = clientSel.value;
            clientSel.innerHTML = '<option value="">All clients</option>' + data.clients.map(cid => `<option value="${escapeHtml(cid)}">${escapeHtml(cid === 'default' ? 'Bytes website (default)' : cid)}</option>`).join('');
            clientSel.value = cur;
        }
        renderConvStats(data);
        renderConvChart(data);
        renderConvList();
        if (!append) {
            const first = data.conversations[0];
            if (CL.selected && data.conversations.some(c => c.id === CL.selected)) openConversation(CL.selected, true);
            else if (first && window.innerWidth > 900) openConversation(first.id, true);
            else document.getElementById('cl-thread').innerHTML = `<div class="cl-empty">${data.total ? 'Select a conversation to read it.' : ''}</div>`;
        }
        refreshLogsBadge();
    } catch (err) {
        console.error('[Chat logs]', err);
        if (auto) return; // keep what's on screen; the next refresh will try again
        countEl.innerHTML = `Could not load conversations. <button type="button" class="cl-btn cl-retry">Retry</button>`;
        countEl.querySelector('.cl-retry').onclick = () => loadConversations(append);
        if (!append) document.getElementById('cl-list').innerHTML = '';
    }
}

const clFmtPct = (r) => (r == null ? '—' : `${Math.round(r * 100)}%`);

function renderConvStats(d) {
    const s = d.stats;
    const tiles = [
        { label: 'Conversations', value: s.conversations.toLocaleString('en-GB'), help: 'in this period' },
        { label: 'Messages', value: s.messages.toLocaleString('en-GB'), help: s.avgMessages == null ? 'from visitors' : `${s.avgMessages.toFixed(1)} per conversation` },
        { label: 'Became leads', value: clFmtPct(s.leadRate), help: `${s.withLead} of ${s.conversations} conversations` },
        { label: 'New', value: '0', help: 'unread since last visit', id: 'cl-new-count' },
    ];
    document.getElementById('cl-stats').innerHTML = tiles.map(t => `<div class="cl-stat"><span class="cl-stat-label">${t.label}</span><span class="cl-stat-num"${t.id ? ` id="${t.id}"` : ''}>${t.value}</span><span class="cl-stat-help">${t.help}</span></div>`).join('');

    const alert = document.getElementById('cl-alert');
    if (s.repeated > 0) {
        alert.hidden = false;
        alert.innerHTML = `<strong>${s.repeated} conversation${s.repeated === 1 ? '' : 's'} got the same bot reply to every message.</strong> The chatbot is likely in a scripted mode or its AI model is failing. ${userRole === 'admin' ? 'Check the bot mode in Settings (website) or Manage Clients.' : 'Check the bot mode on your Chatbot page.'}`;
    } else alert.hidden = true;
}

// Single-series bar chart (blue), leads shown in the tooltip — one axis, no legend needed
function renderConvChart(d) {
    const el = document.getElementById('cl-chart');
    const note = document.getElementById('cl-chart-note');
    const pts = d.daily;
    const max = Math.max(1, ...pts.map(p => p.conversations));
    if (note) note.textContent = `peak ${max === 1 && !pts.some(p => p.conversations) ? 0 : max}/day`;
    if (!pts.some(p => p.conversations)) { el.innerHTML = '<div class="cl-chart-empty">No conversations in this period.</div>'; return; }
    const W = el.clientWidth || 600, H = el.clientHeight || 96, padB = 16, ih = H - padB - 4;
    const gap = pts.length > 60 ? 1 : 2, bw = Math.max(1, (W - gap * (pts.length - 1)) / pts.length);
    const label = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const bars = pts.map((p, i) => {
        const h = p.conversations ? Math.max(3, (p.conversations / max) * ih) : 0;
        const x = i * (bw + gap);
        return `<rect class="cl-bar" x="${x.toFixed(1)}" y="${(4 + ih - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2).toFixed(1)}" data-i="${i}"/>`
            + `<rect x="${x.toFixed(1)}" y="0" width="${(bw + gap).toFixed(1)}" height="${H}" fill="transparent" data-i="${i}"/>`;
    }).join('');
    const ticks = [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i)
        .map((i, k, a) => `<text x="${(i * (bw + gap) + bw / 2).toFixed(1)}" y="${H - 3}" text-anchor="${k === 0 && a.length > 1 ? 'start' : k === a.length - 1 && a.length > 1 ? 'end' : 'middle'}">${label(pts[i].t)}</text>`).join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Conversations per day, peak ${max}">${bars}<g class="cl-axis">${ticks}</g></svg>`;
    el.onpointermove = (e) => {
        const i = e.target.getAttribute && e.target.getAttribute('data-i');
        const tip = document.getElementById('cl-tip');
        if (i == null) { tip.hidden = true; return; }
        const p = pts[+i];
        tip.innerHTML = `<b>${new Date(p.t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</b><br>${p.conversations} conversation${p.conversations === 1 ? '' : 's'} · ${p.leads} lead${p.leads === 1 ? '' : 's'}`;
        tip.hidden = false;
        const r = tip.getBoundingClientRect();
        tip.style.left = `${Math.min(window.innerWidth - r.width - 8, e.clientX + 12)}px`;
        tip.style.top = `${Math.max(8, e.clientY - r.height - 12)}px`;
        el.querySelectorAll('.cl-bar').forEach(b => b.classList.toggle('hover', b.getAttribute('data-i') === i));
    };
    el.onpointerleave = () => { document.getElementById('cl-tip').hidden = true; el.querySelectorAll('.cl-bar.hover').forEach(b => b.classList.remove('hover')); };
}

function clRelTime(ts) {
    const age = Date.now() - ts;
    if (age < 60000) return 'just now';
    if (age < 3600000) return `${Math.floor(age / 60000)}m ago`;
    if (age < 86400000) return `${Math.floor(age / 3600000)}h ago`;
    if (age < 7 * 86400000) return `${Math.floor(age / 86400000)}d ago`;
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function clHighlight(text) {
    const q = document.getElementById('cl-q').value.trim();
    if (!q) return escapeHtml(text);
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return String(text ?? '').split(re).map((part, i) => (i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part))).join('');
}

function renderConvList() {
    const d = CL.data; if (!d) return;
    const list = document.getElementById('cl-list');
    document.getElementById('cl-count').textContent = d.total ? `${d.total} conversation${d.total === 1 ? '' : 's'}` : 'No conversations match these filters.';
    list.innerHTML = d.conversations.map(cv => {
        const isNew = clIsNew(cv);
        return `<li><button type="button" class="cl-item${cv.id === CL.selected ? ' selected' : ''}${isNew ? ' is-new' : ''}" data-cid="${escapeHtml(cv.id)}" aria-current="${cv.id === CL.selected}">
            <span class="cl-item-top">
                <span class="cl-item-who">${isNew ? '<span class="cl-dot" aria-label="New"></span>' : ''}${escapeHtml(cv.lead?.name || 'Visitor')}</span>
                <span class="cl-item-time" title="${new Date(cv.end).toLocaleString('en-GB')}">${clRelTime(cv.end)}</span>
            </span>
            <span class="cl-item-preview">${clHighlight(cv.preview || '(no visitor message)')}</span>
            <span class="cl-item-meta">
                <span>${cv.messageCount} msg${cv.messageCount === 1 ? '' : 's'}</span>
                ${userRole === 'admin' ? `<span class="cl-chip">${escapeHtml(cv.clientId === 'default' ? 'Bytes website' : cv.clientId)}</span>` : ''}
                ${cv.lead ? '<span class="cl-chip cl-chip-lead">Lead</span>' : ''}
                ${cv.repeatedReply ? '<span class="cl-chip cl-chip-warn" title="The bot gave the same reply to every message">Same reply</span>' : ''}
            </span>
        </button></li>`;
    }).join('');
    document.getElementById('cl-more').hidden = d.conversations.length >= d.total;
    const newEl = document.getElementById('cl-new-count');
    if (newEl) newEl.textContent = d.conversations.filter(clIsNew).length.toLocaleString('en-GB');
}

function openConversation(id, silent = false) {
    const cv = CL.data?.conversations.find(c => c.id === id);
    if (!cv) return;
    CL.selected = id;
    clMarkRead(id);
    document.getElementById('cl-inbox').classList.add('has-thread');
    const fmt = (t) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const dur = Math.max(1, Math.round((cv.end - cv.start) / 60000));
    const lead = cv.lead ? `<div class="cl-lead-card">
            <div><span class="cl-chip cl-chip-lead">Lead captured</span> <strong>${escapeHtml(cv.lead.name || 'Unnamed')}</strong></div>
            <div class="cl-lead-meta">${[cv.lead.email, cv.lead.service, cv.lead.budget].filter(Boolean).map(escapeHtml).join(' · ')}</div>
            <button type="button" class="cl-btn" data-goto-leads>Open in Leads</button>
        </div>` : '';
    document.getElementById('cl-thread').innerHTML = `
        <div class="cl-thread-head">
            <button type="button" class="cl-btn cl-back" data-back aria-label="Back to conversations">← Back</button>
            <div>
                <h3>${escapeHtml(cv.lead?.name || 'Visitor')}</h3>
                <p>${new Date(cv.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${fmt(cv.start)}–${fmt(cv.end)} · ${dur} min · ${cv.messageCount} message${cv.messageCount === 1 ? '' : 's'}${userRole === 'admin' ? ` · <code>${escapeHtml(cv.clientId)}</code>` : ''}</p>
            </div>
            <button type="button" class="cl-btn" data-copy-thread>Copy transcript</button>
        </div>
        ${lead}
        <ol class="cl-msgs">${cv.messages.map(m => `
            ${m.user ? `<li class="cl-msg cl-msg-user"><span class="cl-bubble">${clHighlight(m.user)}</span><time>${fmt(m.t)}</time></li>` : ''}
            ${m.bot ? `<li class="cl-msg cl-msg-bot"><span class="cl-bubble">${clHighlight(m.bot)}</span><time>Bot · ${fmt(m.t)}</time></li>` : ''}`).join('')}
        </ol>`;
    const thread = document.getElementById('cl-thread');
    thread.querySelector('[data-back]').onclick = () => { document.getElementById('cl-inbox').classList.remove('has-thread'); document.querySelector(`[data-cid="${CSS.escape(id)}"]`)?.focus(); };
    thread.querySelector('[data-goto-leads]')?.addEventListener('click', () => { window.ldOpenAfterLoad = cv.lead.id; switchView('leads'); });
    thread.querySelector('[data-copy-thread]').onclick = (e) => {
        const head = `${cv.lead?.name || 'Visitor'} · ${new Date(cv.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        const text = [head, ...cv.messages.flatMap(m => [m.user && `[${fmt(m.t)}] Visitor: ${m.user}`, m.bot && `[${fmt(m.t)}] Bot: ${m.bot}`].filter(Boolean))].join('\n');
        navigator.clipboard?.writeText(text).then(() => { e.target.textContent = 'Copied'; setTimeout(() => (e.target.textContent = 'Copy transcript'), 1500); });
    };
    if (!silent) thread.scrollTop = 0;
    renderConvList();
    refreshLogsBadge();
}

async function exportConversationsCsv() {
    const d = CL.data; if (!d) return;
    const btn = document.getElementById('cl-export');
    // Fetch the remaining pages so the file has every conversation matching the filters
    let all = d.conversations.slice();
    if (all.length < d.total) {
        btn.disabled = true; btn.textContent = 'Preparing…';
        try {
            for (let off = all.length; off < d.total && off < 5000; off += d.pageSize) {
                const res = await apiFetch(`${API_BASE}/api/conversations?${clQuery({ offset: off })}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                all = all.concat((await res.json()).conversations);
            }
        } catch (err) { alert(`Export failed: ${err.message}`); return; }
        finally { btn.disabled = false; btn.textContent = 'Export CSV'; }
    }
    const cell = csvCell;
    const rows = [['conversation_id', 'client_id', 'time', 'visitor_message', 'bot_reply', 'lead_name', 'lead_email']];
    all.forEach(cv => cv.messages.forEach(m => rows.push([cv.id, cv.clientId, new Date(m.t).toISOString(), m.user, m.bot, cv.lead?.name, cv.lead?.email])));
    const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chat-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Sidebar badge: conversations with activity since you last marked the inbox read (polled each minute)
async function refreshLogsBadge() {
    const badge = document.getElementById('logs-badge');
    if (!badge) return;
    let n = 0;
    if (CL.data) n = CL.data.conversations.filter(clIsNew).length; // exact when the inbox is loaded
    else {
        try {
            const p = new URLSearchParams({ countOnly: '1', since: clSeenAt(), from: clSeenAt(), to: Date.now() });
            const res = await apiFetch(`${API_BASE}/api/conversations?${p}`);
            if (res.ok) n = (await res.json()).newCount || 0;
        } catch (_) {}
    }
    badge.hidden = !n;
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.setAttribute('aria-label', `${n} new conversation${n === 1 ? '' : 's'}`);
}

function startLogsBadge() {
    refreshLogsBadge();
    clearInterval(window.ldTimer);
    window.ldTimer = setInterval(() => {
        const busy = document.querySelector('#leads-view .lead-card.dragging, #leads-kanban select:focus') || !sequenceModal.classList.contains('hidden');
        if (!document.hidden && !busy && !document.getElementById('leads-view')?.classList.contains('hidden')) loadLeads();
    }, 60000);
    clearInterval(CL.timer);
    CL.timer = setInterval(() => {
        if (document.hidden) return;
        if (!document.getElementById('logs-view')?.classList.contains('hidden')) {
            const sel = window.getSelection();
            const reading = sel && !sel.isCollapsed && document.getElementById('cl-thread').contains(sel.anchorNode);
            if (CL.offset === 0 && !reading) loadConversations(false, true);
        }
        else { CL.data = null; refreshLogsBadge(); }
    }, 60000);
}

// ─── Chatbot page: health strip, mode guidance, prompt helper, unsaved-change guard ───
const CB_MODE_NOTES = {
    free: 'Scripted replies only, no AI. The AI model and effort below are not used.',
    standard: 'Smarter scripted flows, no AI. The AI model and effort below are not used.',
    ai: 'Replies are written by the AI model you choose below.',
    pro: 'AI replies tuned for sales conversations, using the model below.',
    elite: 'Advanced AI with higher limits, using the model below.',
};

function cbAgo(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 60) return `${Math.max(1, m)} min ago`;
    if (m < 2880) return `${Math.round(m / 60)} h ago`;
    return `${Math.round(m / 1440)} days ago`;
}

async function loadChatbotStatus() {
    const el = document.getElementById('cb-status');
    if (!el) return;
    let d = null;
    try { const res = await apiFetch(`${API_BASE}/api/chatbot/status`); if (res.ok) d = await res.json(); } catch (_) {}
    if (!d) { el.innerHTML = ''; return; }
    const fresh = d.lastChatAt && Date.now() - d.lastChatAt < 7 * 86400000;
    const ai = ['ai', 'pro', 'elite'].includes(d.mode);
    const item = (state, title, text, href) => `<a class="cb-stat cb-${state}" href="${href}"><span class="cb-stat-dot" aria-hidden="true"></span><span class="cb-stat-text"><strong>${title}</strong><span>${text}</span></span></a>`;
    el.innerHTML = [
        d.lastChatAt
            ? item(fresh ? 'ok' : 'warn', fresh ? 'Widget live' : 'Widget quiet', `Last conversation ${cbAgo(d.lastChatAt)} · ${d.messages7d} message${d.messages7d === 1 ? '' : 's'} this week`, '#cb-install')
            : item('warn', 'Not detected yet', 'No conversations yet. Install the snippet and send a test message.', '#cb-install'),
        item(ai ? 'ok' : 'info', ai ? 'AI replies on' : 'Scripted replies', ai ? `Mode: ${escapeHtml(d.mode)} · ${d.llmModel ? escapeHtml(d.llmModel.replace(/^openrouter:/, '')) : 'default model'}` : `Mode: ${escapeHtml(d.mode)}. Switch to AI for smarter answers.`, '#chatbot-settings-card'),
        item(d.mailReady ? 'ok' : 'bad', d.mailReady ? 'Email sending ready' : 'Emails not sending', d.mailReady ? `${d.leads7d} lead${d.leads7d === 1 ? '' : 's'} this week` : `${escapeHtml(d.mailIssue)}. Verification and campaign emails are waiting.`, '#cb-email'),
    ].join('');
}

function cbApplyModeLocks() {
    const sel = document.getElementById('settings-mode');
    if (!sel) return;
    const locked = typeof isFreeLocked === 'function' && isFreeLocked();
    [...sel.options].forEach(o => {
        const base = o.dataset.label || (o.dataset.label = o.textContent);
        o.disabled = locked && o.value !== 'free';
        o.textContent = o.disabled ? `${base} (upgrade)` : base;
    });
    cbModeChanged();
}

function cbModeChanged() {
    const sel = document.getElementById('settings-mode');
    if (!sel) return;
    const note = document.getElementById('settings-mode-note');
    if (note) note.textContent = CB_MODE_NOTES[sel.value] || '';
    const scripted = ['free', 'standard'].includes(sel.value);
    document.querySelectorAll('#chatbot-settings-card .cb-ai-only').forEach(g => {
        g.classList.toggle('cb-muted', scripted);
        g.querySelectorAll('select').forEach(x => { x.disabled = scripted; });
    });
}
document.getElementById('settings-mode')?.addEventListener('change', cbModeChanged);

// Prompt helper
function cbPromptCount() {
    const ta = document.getElementById('settings-prompt'), out = document.getElementById('settings-prompt-count');
    if (ta && out) out.textContent = `${ta.value.length.toLocaleString('en-GB')} / 20,000 characters${ta.value.length ? '' : ' · empty uses the built-in sales prompt'}`;
}
document.getElementById('settings-prompt')?.addEventListener('input', cbPromptCount);
document.getElementById('settings-prompt-template')?.addEventListener('click', () => {
    const ta = document.getElementById('settings-prompt');
    const company = document.getElementById('settings-company-name')?.value.trim() || '[Company]';
    const tpl = `You are the friendly assistant for ${company}.\n\nWhat we do: [one or two sentences about your services].\nWho we help: [your ideal customers].\nPrices: [starting prices, or "we quote after a short call"].\nOpening hours / location: [details].\n\nGoals, in order:\n1. Answer questions clearly in 2–3 short sentences.\n2. Ask for the visitor's name and email when they show interest.\n3. Offer a free consultation and confirm we'll be in touch.\n\nRules: only discuss ${company} and its services; never invent prices or promises; if unsure, offer to have a team member follow up.`;
    if (ta.value.trim() && !confirm('Replace your current prompt with the starter prompt?')) return;
    ta.value = tpl;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('chatbot-settings-card')?.classList.add('cb-dirty');
    ta.focus();
});

// Unsaved-change guard: a card is "dirty" after an edit until its status line reports a save (✓)
const CB_CARDS = [
    { card: 'chatbot-settings-card', status: 'settings-chatbot-status' },
    { card: 'cb-campaigns', status: 'settings-campaign-status' },
    { card: 'cb-email', status: 'settings-mail-status' },
];
CB_CARDS.forEach(({ card, status }) => {
    const c = document.getElementById(card), st = document.getElementById(status);
    if (!c || !st) return;
    const mark = (e) => { if (e.isTrusted && !e.target.closest('.btn-primary')) c.classList.add('cb-dirty'); };
    c.addEventListener('input', mark);
    c.addEventListener('change', mark);
    c.addEventListener('click', (e) => { if (e.isTrusted && e.target.closest('.sett-mode-btn')) c.classList.add('cb-dirty'); });
    new MutationObserver(() => {
        if (st.textContent.trim().startsWith('✓') || /saved/i.test(st.textContent) && !/not saved|failed/i.test(st.textContent)) c.classList.remove('cb-dirty');
    }).observe(st, { childList: true, characterData: true, subtree: true });
});
window.addEventListener('beforeunload', (e) => {
    if (document.querySelector('#chatbot-view .cb-dirty')) { e.preventDefault(); e.returnValue = ''; }
});
// Saved values (re)loaded into a form → it's clean again
const _cbPopulate = { populateChatbotSettings, populateCampaignSettings, populateMailSettings };
populateChatbotSettings = function (d) { _cbPopulate.populateChatbotSettings(d); document.getElementById('chatbot-settings-card')?.classList.remove('cb-dirty'); cbPromptCount(); };
populateCampaignSettings = function (d) { _cbPopulate.populateCampaignSettings(d); document.getElementById('cb-campaigns')?.classList.remove('cb-dirty'); };
populateMailSettings = function (d) { _cbPopulate.populateMailSettings(d); document.getElementById('cb-email')?.classList.remove('cb-dirty'); };

// Section nav + status links: smooth scroll, and mark the section in view
['.cb-nav', '#cb-status'].forEach(sel => document.querySelector(sel)?.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // The last section can't reach the top, so pin the highlight to what was clicked while scrolling
    cbNavPinnedUntil = Date.now() + 1200;
    document.querySelectorAll('.cb-nav a').forEach(l => l.classList.toggle('active', l.getAttribute('href') === href));
}));
let cbNavPinnedUntil = 0;
if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('.cb-nav a')];
    const io = new IntersectionObserver((entries) => {
        if (Date.now() < cbNavPinnedUntil) return;
        entries.filter(en => en.isIntersecting).forEach(en => links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${en.target.id}`)));
    }, { rootMargin: '-20% 0px -70% 0px' });
    links.forEach(l => { const t = document.querySelector(l.getAttribute('href')); if (t) io.observe(t); });
}

// ─── Manage Clients: directory, plan & trial, editor drawer ──────────────────
const MC = { list: [], open: null, listeners: false };
const mcPlanName = (p) => escapeHtml((p || 'free').charAt(0).toUpperCase() + (p || 'free').slice(1));

function mcPlanBadge(c) {
    if (c.inTrial) return `<span class="ld-chip ld-chip-info">Trial · ${c.trialDaysLeft}d left</span>`;
    if (c.trialExpired) return '<span class="ld-chip mc-chip-warn">Trial expired</span>';
    if (c.plan && c.plan !== 'free') return `<span class="ld-chip ld-chip-ok">${mcPlanName(c.plan)}</span>`;
    return `<span class="ld-chip">${mcPlanName(c.plan)}${c.registered ? '' : ' · not registered'}</span>`;
}
function mcAgo(ts) {
    if (!ts) return 'Never';
    const h = (Date.now() - ts) / 3600000;
    if (h < 1) return 'Just now';
    if (h < 48) return `${Math.round(h)}h ago`;
    return `${Math.round(h / 24)}d ago`;
}

function mcAttach() {
    if (MC.listeners) return;
    MC.listeners = true;
    let t;
    document.getElementById('mc-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(renderClients, 120); });
    ['mc-filter', 'mc-sort'].forEach(id => document.getElementById(id).addEventListener('change', renderClients));
    document.getElementById('mc-export').addEventListener('click', mcExport);
    document.getElementById('mc-new').addEventListener('click', () => openClientDrawer(null));
    document.getElementById('mc-body').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-go]');
        const row = e.target.closest('tr[data-cid]');
        if (!row) return;
        if (btn) { e.stopPropagation(); return mcGo(btn.dataset.go, row.dataset.cid); }
        openClientDrawer(row.dataset.cid);
    });
    document.getElementById('mc-body').addEventListener('keydown', (e) => {
        const row = e.target.closest('tr[data-cid]');
        if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openClientDrawer(row.dataset.cid); }
    });
    document.getElementById('mc-d-close').addEventListener('click', closeClientDrawer);
    document.getElementById('mc-backdrop').addEventListener('click', closeClientDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.getElementById('mc-drawer').hidden) closeClientDrawer(); });
    document.getElementById('config-client-id').addEventListener('input', mcIdHint);
    document.getElementById('mc-plan-save').addEventListener('click', () => mcPlan({ plan: document.getElementById('mc-plan-select').value }, 'Plan updated.'));
    document.getElementById('mc-trial-extend').addEventListener('click', () => mcPlan({ extendTrialDays: 7 }, 'Trial extended by 7 days.'));
    document.getElementById('mc-trial-end').addEventListener('click', () => { if (confirm('End this client’s trial now? They drop to their plan’s limits immediately.')) mcPlan({ endTrial: true }, 'Trial ended.'); });
    // Refresh the list after the existing editor saves
    new MutationObserver(() => { if (/saved successfully/i.test(document.getElementById('config-status').textContent)) loadClients(true); })
        .observe(document.getElementById('config-status'), { childList: true, characterData: true, subtree: true });
}

async function loadClients(keepDrawer = false) {
    mcAttach();
    try {
        const res = await apiFetch(`${API_BASE}/api/admin/clients`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        MC.list = (await res.json()).clients || [];
    } catch (err) {
        document.getElementById('mc-body').innerHTML = `<tr><td colspan="7" class="mc-empty">Could not load clients: ${escapeHtml(err.message)}</td></tr>`;
        return;
    }
    document.getElementById('mc-client-ids').innerHTML = MC.list.map(c => `<option value="${escapeHtml(c.clientId)}">${escapeHtml(c.companyName || '')}</option>`).join('');
    renderClients();
    if (keepDrawer && MC.open) mcFillHeader(MC.list.find(c => c.clientId === MC.open));
}

function mcFiltered() {
    const q = document.getElementById('mc-q').value.trim().toLowerCase();
    const f = document.getElementById('mc-filter').value;
    const sort = document.getElementById('mc-sort').value;
    const d30 = Date.now() - 30 * 86400000;
    const out = MC.list.filter(c =>
        (!q || [c.clientId, c.companyName, c.ownerEmail].some(v => String(v || '').toLowerCase().includes(q))) &&
        (!f || (f === 'trial' && c.inTrial) || (f === 'ending' && c.inTrial && c.trialDaysLeft <= 3) || (f === 'expired' && c.trialExpired)
            || (f === 'paying' && c.plan !== 'free') || (f === 'inactive' && (!c.lastActivity || c.lastActivity < d30))));
    out.sort((a, b) => sort === 'leads' ? b.leads30d - a.leads30d
        : sort === 'trial' ? (a.inTrial ? a.trialEndsAt : Infinity) - (b.inTrial ? b.trialEndsAt : Infinity)
        : sort === 'name' ? (a.companyName || a.clientId).localeCompare(b.companyName || b.clientId)
        : (b.lastActivity || 0) - (a.lastActivity || 0));
    return out;
}

function renderClients() {
    const list = MC.list, shown = mcFiltered();
    const d30 = Date.now() - 30 * 86400000;
    const tiles = [
        { label: 'Clients', value: list.length, help: shown.length !== list.length ? `${shown.length} shown` : 'excluding the Bytes website' },
        { label: 'In trial', value: list.filter(c => c.inTrial).length, help: `${list.filter(c => c.inTrial && c.trialDaysLeft <= 3).length} ending within 3 days`, warn: list.some(c => c.inTrial && c.trialDaysLeft <= 3) },
        { label: 'Paying', value: list.filter(c => c.plan !== 'free').length, help: 'Starter or above' },
        { label: 'Trial expired', value: list.filter(c => c.trialExpired).length, help: 'on Free, worth a follow-up' },
        { label: 'Active (30d)', value: list.filter(c => c.lastActivity && c.lastActivity >= d30).length, help: 'had chats or leads' },
    ];
    document.getElementById('mc-stats').innerHTML = tiles.map(t => `<div class="cl-stat${t.warn ? ' ld-stat-warn' : ''}"><span class="cl-stat-label">${t.label}</span><span class="cl-stat-num">${t.value}</span><span class="cl-stat-help">${t.help}</span></div>`).join('');

    const body = document.getElementById('mc-body');
    if (!shown.length) { body.innerHTML = `<tr><td colspan="7" class="mc-empty">${list.length ? 'No clients match these filters.' : 'No clients yet. They appear here after signing up through onboarding.'}</td></tr>`; return; }
    body.innerHTML = shown.map(c => `
        <tr data-cid="${escapeHtml(c.clientId)}" tabindex="0" aria-label="Open ${escapeHtml(c.companyName || c.clientId)}">
            <td data-label="Client"><div class="mc-name">${escapeHtml(c.companyName || c.clientId)}</div><div class="mc-sub"><code>${escapeHtml(c.clientId)}</code>${c.ownerEmail ? ` · ${escapeHtml(c.ownerEmail)}` : ''}</div></td>
            <td data-label="Plan">${mcPlanBadge(c)}</td>
            <td data-label="Bot"><span class="mc-sub">${c.hasConfig ? escapeHtml(c.mode || 'free') : 'not set up'}${c.domains ? ` · ${c.domains} domain${c.domains === 1 ? '' : 's'}` : ''}</span></td>
            <td data-label="Leads 30d" class="num">${c.leads30d}<span class="mc-sub"> / ${c.leadsTotal}</span></td>
            <td data-label="Chats 30d" class="num">${c.messages30d}</td>
            <td data-label="Last activity"><span class="${c.lastActivity && Date.now() - c.lastActivity < 7 * 86400000 ? '' : 'mc-sub'}">${mcAgo(c.lastActivity)}</span></td>
            <td class="mc-actions">
                <button type="button" class="cl-btn" data-go="leads" title="Leads for this client">Leads</button>
                <button type="button" class="cl-btn" data-go="logs" title="Chats for this client">Chats</button>
                <button type="button" class="cl-btn" data-go="analytics" title="Analytics for this client">Stats</button>
            </td>
        </tr>`).join('');
}

function mcGo(where, cid) {
    closeClientDrawer();
    if (where === 'leads') {
        switchView('leads');
        loadLeads().then(() => { const sel = document.getElementById('ld-client'); if (sel) { sel.value = cid; renderLeads(window.allLeads); } });
    } else if (where === 'logs') {
        const sel = document.getElementById('cl-client');
        if (sel) { if (![...sel.options].some(o => o.value === cid)) sel.add(new Option(cid, cid)); sel.value = cid; }
        if (typeof CL !== 'undefined') { CL.offset = 0; CL.selected = null; }
        switchView('logs');
    } else if (where === 'analytics') {
        analyticsClient = cid;
        switchView('analytics');
        loadAnalytics(true);
    }
}

function mcIdHint() {
    const id = document.getElementById('config-client-id').value.trim();
    const hint = document.getElementById('mc-id-hint');
    if (!id) { hint.textContent = ''; return; }
    if (id === 'default') { hint.textContent = 'The Bytes website is edited under Settings, not here.'; return; }
    hint.textContent = MC.list.some(c => c.clientId === id) ? '' : 'Not an existing client: saving will create settings for this new ID. Check the spelling.';
}

function mcFillHeader(c) {
    const id = MC.open;
    document.getElementById('mc-d-name').textContent = c?.companyName || id || 'Open a client';
    document.getElementById('mc-d-sub').textContent = c ? `${c.clientId}${c.ownerEmail ? ` · ${c.ownerEmail}` : ''} · last activity ${mcAgo(c.lastActivity).toLowerCase()}` : (id ? 'New client ID' : 'Type a client ID and press Load');
    document.getElementById('mc-plan-select').value = c?.plan || 'free';
    document.getElementById('mc-plan-status').innerHTML = c
        ? (c.inTrial ? `On a <strong>${mcPlanName(c.plan)}</strong> plan with a trial ending ${new Date(c.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} (${c.trialDaysLeft} day${c.trialDaysLeft === 1 ? '' : 's'} left).`
            : c.trialExpired ? `Trial ended ${new Date(c.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}; now on <strong>Free</strong>.`
            : `On the <strong>${mcPlanName(c.plan)}</strong> plan.`)
        : 'Open or create a client to manage its plan.';
    document.getElementById('mc-trial-end').hidden = !c?.inTrial;
    document.querySelectorAll('#mc-plan-save, #mc-trial-extend').forEach(b => { b.disabled = !id; });
    document.getElementById('mc-quick').innerHTML = c ? `
        <div class="mc-quick-stats"><span><strong>${c.leads30d}</strong> leads (30d)</span><span><strong>${c.leadsTotal}</strong> leads total</span><span><strong>${c.messages30d}</strong> chat messages (30d)</span></div>
        <div class="mc-quick-links"><button type="button" class="cl-btn" data-qgo="leads">View leads</button><button type="button" class="cl-btn" data-qgo="logs">View chats</button><button type="button" class="cl-btn" data-qgo="analytics">View analytics</button></div>` : '';
    document.querySelectorAll('#mc-quick [data-qgo]').forEach(b => b.addEventListener('click', () => mcGo(b.dataset.qgo, id)));
}

let mcLastFocus = null;
function openClientDrawer(cid) {
    mcAttach();
    mcLastFocus = document.activeElement;
    MC.open = cid;
    const c = MC.list.find(x => x.clientId === cid);
    const idInput = document.getElementById('config-client-id');
    idInput.value = cid || '';
    idInput.readOnly = !!cid;
    document.getElementById('load-config-btn').hidden = !!cid;
    document.getElementById('sim-client-id').value = cid || '';
    document.getElementById('config-status').textContent = '';
    document.getElementById('mc-plan-msg').textContent = '';
    mcIdHint();
    mcFillHeader(c);
    document.getElementById('mc-backdrop').hidden = false;
    const drawer = document.getElementById('mc-drawer');
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('open'));
    if (cid) mcbLoad(cid);
    else { MCB.cid = ''; MCB.loaded = false; mcbSetDirty(false); mcbRefreshUI(); mcbEl('mc-health').innerHTML = ''; }
    (cid ? document.getElementById('mc-d-close') : idInput).focus();
}

function closeClientDrawer() {
    const drawer = document.getElementById('mc-drawer');
    if (!drawer || drawer.hidden) return;
    if (mcbIsDirty() && !confirm('You have unsaved chatbot settings for this client. Close without saving?')) return;
    mcbSetDirty(false);
    drawer.classList.remove('open');
    drawer.hidden = true;
    document.getElementById('mc-backdrop').hidden = true;
    MC.open = null;
    if (mcLastFocus && document.contains(mcLastFocus)) mcLastFocus.focus();
}

// Typed IDs: keep the drawer in sync when Load is pressed
document.getElementById('load-config-btn')?.addEventListener('click', () => {
    const id = document.getElementById('config-client-id').value.trim();
    if (!id || id === MC.open) return;
    MC.open = id;
    document.getElementById('sim-client-id').value = id;
    mcFillHeader(MC.list.find(x => x.clientId === id));
});

async function mcPlan(body, okMsg) {
    const id = MC.open || document.getElementById('config-client-id').value.trim();
    const msg = document.getElementById('mc-plan-msg');
    if (!id) { msg.textContent = 'Open a client first.'; return; }
    msg.textContent = 'Saving…'; msg.style.color = 'var(--text-secondary)';
    try {
        const res = await apiFetch(`${API_BASE}/api/admin/clients/${encodeURIComponent(id)}/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        msg.textContent = `✓ ${okMsg}`; msg.style.color = 'var(--success)';
        await loadClients(true);
    } catch (err) { msg.textContent = `Failed: ${err.message}`; msg.style.color = 'var(--error)'; }
}

function mcExport() {
    const rows = [['client_id', 'company', 'owner_email', 'plan', 'in_trial', 'trial_ends', 'bot_mode', 'domains', 'leads_30d', 'leads_total', 'chat_messages_30d', 'last_activity']];
    mcFiltered().forEach(c => rows.push([c.clientId, c.companyName, c.ownerEmail, c.plan, c.inTrial ? 'yes' : 'no', c.trialEndsAt ? new Date(c.trialEndsAt).toISOString().slice(0, 10) : '', c.mode, c.domains, c.leads30d, c.leadsTotal, c.messages30d, c.lastActivity ? new Date(c.lastActivity).toISOString() : '']));
    const cell = csvCell;
    const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ─── Bytes website Settings: health, mode guidance, domains, prompt, socials preview, unsaved guard ───
function siteDomainList() {
    return document.getElementById('site-domains').value.split(/[\n,]+/)
        .map(d => d.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#\s]/)[0].replace(/:\d+$/, '').replace(/\.$/, ''))
        .filter(Boolean);
}

async function siteHealth() {
    const el = document.getElementById('site-health');
    if (!el) return;
    let d = null;
    try { const res = await apiFetch(`${API_BASE}/api/chatbot/status?clientId=default`); if (res.ok) d = await res.json(); } catch (_) {}
    if (!d) { el.innerHTML = ''; return; }
    const fresh = d.lastChatAt && Date.now() - d.lastChatAt < 7 * 86400000;
    const ai = ['ai', 'pro', 'elite'].includes(d.mode);
    const item = (state, title, text, target) => `<a class="cb-stat cb-${state}" href="#" data-target="${target}"><span class="cb-stat-dot" aria-hidden="true"></span><span class="cb-stat-text"><strong>${title}</strong><span>${text}</span></span></a>`;
    el.innerHTML = [
        d.lastChatAt
            ? item(fresh ? 'ok' : 'warn', fresh ? 'Website chat active' : 'Website chat quiet', `Last conversation ${cbAgo(d.lastChatAt)} · ${d.messages7d} message${d.messages7d === 1 ? '' : 's'} this week`, 'site-card')
            : item('warn', 'No website chats yet', 'Open the website and send a test message.', 'site-card'),
        item(ai ? 'ok' : 'bad', ai ? 'AI replies on' : 'Scripted replies only', ai ? `Mode: ${escapeHtml(d.mode)} · ${d.llmModel ? escapeHtml(d.llmModel.replace(/^openrouter:/, '')) : 'default model'}` : `Mode: ${escapeHtml(d.mode)}. Visitors get canned answers. Set Bot Mode to AI below.`, 'site-mode'),
        item(d.mailReady ? 'ok' : 'bad', d.mailReady ? 'Lead emails ready' : 'Lead emails not sending', d.mailReady ? `${d.leads7d} website lead${d.leads7d === 1 ? '' : 's'} this week` : `${escapeHtml(d.mailIssue)}. Set it up in Website email sender below.`, 'site-mail-card'),
    ].join('');
}
document.getElementById('site-health')?.addEventListener('click', (e) => {
    const a = e.target.closest('[data-target]');
    if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.dataset.target);
    t?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (t && t.tagName === 'SELECT') setTimeout(() => t.focus(), 300);
});

function siteModeChanged() {
    const sel = document.getElementById('site-mode');
    if (!sel) return;
    document.getElementById('site-mode-note').textContent = (typeof CB_MODE_NOTES !== 'undefined' && CB_MODE_NOTES[sel.value]) || '';
    const scripted = ['free', 'standard'].includes(sel.value);
    document.querySelectorAll('#site-settings-view .site-ai-only').forEach(g => {
        g.classList.toggle('cb-muted', scripted);
        g.querySelectorAll('select').forEach(x => { x.disabled = scripted; });
    });
}

function siteDomainsCheck() {
    const warn = document.getElementById('site-domains-warn');
    const list = siteDomainList();
    if (!list.length) { warn.hidden = true; return; }
    const covers = (host) => list.some(d => d.startsWith('*.') ? (host === d.slice(2) || host.endsWith('.' + d.slice(2))) : (host === d || host === 'www.' + d));
    const missing = ['bytesfx.com', 'www.bytesfx.com'].filter(h => !covers(h));
    warn.hidden = false;
    warn.textContent = `With a list set, the chatbot only answers on these domains (web.bytesfx.com always works).${missing.length ? ` Not covered: ${missing.join(', ')}. Add *.bytesfx.com to include every subdomain.` : ''}`;
}

function sitePromptCount() {
    const ta = document.getElementById('site-prompt');
    document.getElementById('site-prompt-count').textContent = `${ta.value.length.toLocaleString('en-GB')} / 20,000 characters${ta.value.length ? '' : ' · empty uses the built-in BytesFX sales prompt'}`;
}

function siteSocialPreview() {
    const el = document.getElementById('site-social-preview');
    if (!el) return;
    const items = [...document.querySelectorAll('#site-settings-view [data-social]')].filter(i => i.value.trim());
    el.innerHTML = items.length
        ? `<span class="cb-hint" style="margin:0;">Footer preview:</span> ${items.map(i => {
            let ok = false; try { ok = /^https?:$/.test(new URL(/^https?:\/\//i.test(i.value.trim()) ? i.value.trim() : `https://${i.value.trim()}`).protocol); } catch (_) {}
            return `<a class="cl-btn" href="${ok ? escapeHtml(/^https?:\/\//i.test(i.value.trim()) ? i.value.trim() : `https://${i.value.trim()}`) : '#'}" target="_blank" rel="noopener" title="Open ${escapeHtml(i.dataset.social)} in a new tab">${escapeHtml(i.dataset.social.charAt(0).toUpperCase() + i.dataset.social.slice(1))} ↗</a>`;
        }).join(' ')}`
        : '<span class="cb-hint" style="margin:0;">No social links yet, so the footer shows only the share button.</span>';
}

function siteRefreshUI() { siteModeChanged(); siteDomainsCheck(); sitePromptCount(); siteSocialPreview(); }

document.getElementById('site-mode')?.addEventListener('change', siteModeChanged);
document.getElementById('site-domains')?.addEventListener('input', siteDomainsCheck);
document.getElementById('site-domains')?.addEventListener('blur', () => {
    const ta = document.getElementById('site-domains');
    const cleaned = [...new Set(siteDomainList())].join('\n');
    if (cleaned !== ta.value.trim()) { ta.value = cleaned; siteDomainsCheck(); }
});
document.getElementById('site-prompt')?.addEventListener('input', sitePromptCount);
document.querySelectorAll('#site-settings-view [data-social]').forEach(i => i.addEventListener('input', siteSocialPreview));
document.getElementById('site-prompt-template')?.addEventListener('click', () => {
    const ta = document.getElementById('site-prompt');
    const company = document.getElementById('site-company-name').value.trim() || 'BytesFX';
    const tpl = `You are the friendly assistant for ${company}, a London studio that builds high-converting websites, custom apps and AI chatbots.\n\nWho we help: small and growing businesses that want more enquiries and sales from their website.\nWhat we offer: website design and development, web and mobile apps, AI chatbots that capture leads, and SEO foundations.\nPricing: projects are quoted after a free consultation; never invent prices.\n\nGoals, in order:\n1. Understand what the visitor needs in 2–3 short, friendly sentences.\n2. Ask for their name and business email when they show interest.\n3. Offer a free consultation and confirm the team will be in touch within one working day.\n\nRules: stay on topic; be concise; never promise timelines or prices; if unsure, offer to have the team follow up.`;
    if (ta.value.trim() && !confirm('Replace the current prompt with the starter prompt?')) return;
    ta.value = tpl;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('site-card')?.classList.add('cb-dirty');
    ta.focus();
});

// Unsaved-change guard (same pattern as the Chatbot page)
(() => {
    const card = document.getElementById('site-card'), st = document.getElementById('site-status');
    if (!card || !st) return;
    const mark = (e) => { if (e.isTrusted && !e.target.closest('.btn-primary, a')) card.classList.add('cb-dirty'); };
    card.addEventListener('input', mark);
    card.addEventListener('change', mark);
    new MutationObserver(() => { if (/saved/i.test(st.textContent) && !/fail/i.test(st.textContent)) { card.classList.remove('cb-dirty'); siteHealth(); } })
        .observe(st, { childList: true, characterData: true, subtree: true });
    window.addEventListener('beforeunload', (e) => { if (card.classList.contains('cb-dirty')) { e.preventDefault(); e.returnValue = ''; } });
})();
