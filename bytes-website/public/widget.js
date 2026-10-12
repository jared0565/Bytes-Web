(function () {
    // --- Configuration & Constants ---
    const API_URL = "https://ai.bytesfx.com";
    const LINKEDIN_URL = 'https://www.linkedin.com/in/fbmacagba/';

    // Get clientId from script tag (if provided)
    const scriptTag = document.currentScript;
    const clientId = scriptTag ? scriptTag.getAttribute('data-client-id') || 'default' : 'default';

    // --- State ---
    // The conversation is kept on the server; the browser only holds an opaque id for this tab's chat
    const SESSION_KEY = `bytesfx_chat_${clientId}`;
    let sessionId = null;
    try { sessionId = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* storage blocked */ }

    // --- Styles ---
    const styles = `
        :root {
            --widget-accent: #6366f1;
            --widget-accent-hover: #4f46e5;
            --widget-accent-glow: rgba(99, 102, 241, 0.4);
            --widget-bg: #0d0d1a;
            --widget-glass-bg: rgba(20, 20, 31, 0.7);
            --widget-glass-border: rgba(255, 255, 255, 0.08);
            --widget-text: #f0f0f5;
            --widget-text-secondary: #9aa0a6;
        }

        .chatbot-widget-container {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: var(--widget-text);
        }

        .chatbot-launcher {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--widget-accent-hover) 0%, var(--widget-accent) 100%);
            color: #fff;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 32px var(--widget-accent-glow);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
            animation: widget-fab-bounce 4s ease-in-out 3s infinite;
            padding: 0;
        }

        .chatbot-launcher::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: var(--widget-accent);
            opacity: 0.6;
            animation: widget-fab-ping 3s ease-out 2s infinite;
            z-index: -1;
        }

        .chatbot-launcher:hover {
            transform: scale(1.08);
            box-shadow: 0 10px 40px var(--widget-accent-glow);
            animation: none;
        }

        .chatbot-launcher svg {
            width: 30px;
            height: 30px;
            fill: currentColor;
        }

        .chatbot-window {
            width: 380px;
            height: 550px;
            max-height: 85vh;
            background: #090e17;
            background: linear-gradient(180deg, #090e17 0%, #11203b 100%);
            border: 1px solid var(--widget-glass-border);
            border-radius: 20px;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            transform-origin: bottom right;
            transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 1;
        }

        .chatbot-window.hidden {
            opacity: 0 !important;
            pointer-events: none !important;
            transform: scale(0.9) translateY(20px) !important;
        }

        .chatbot-header {
            padding: 1.25rem 1.5rem;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid var(--widget-glass-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .chatbot-title {
            font-weight: 600;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background-color: var(--widget-accent);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--widget-accent);
            animation: widget-pulse 2s infinite;
        }

        /* On a phone this is the only way to close the chat. A full-size tap area around the same small ×, with
           every property set so a host page's own button styles can't shrink, stretch or fade it. The negative
           margins keep the header the height it was. */
        .chatbot-widget-container .btn-close-chat {
            appearance: none;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: none;
            width: 44px;
            min-width: 0;
            height: 44px;
            margin: -9px -9px -9px 0;
            padding: 0;
            background: none;
            border: none;
            border-radius: 12px;
            box-shadow: none;
            color: var(--widget-text-secondary);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 1.5rem;
            font-weight: 400;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            opacity: 1;
            cursor: pointer;
        }
        .chatbot-widget-container .btn-close-chat:hover { color: var(--widget-text); }
        .chatbot-widget-container .btn-close-chat:active { transform: scale(0.94); }
        .chatbot-widget-container .btn-close-chat:focus-visible { outline: 2px solid var(--widget-text); outline-offset: -4px; }

        .chatbot-messages {
            flex: 1;
            padding: 1.5rem 1rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
        }

        .chat-message {
            max-width: 85%;
            padding: 0.8rem 1rem;
            border-radius: 12px;
            line-height: 1.5;
            white-space: pre-line;
            overflow-wrap: anywhere;
            font-size: 0.95rem;
            animation: widget-fadeIn 0.3s ease;
            word-wrap: break-word;
        }

        .bot-message {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.05);
            align-self: flex-start;
            border-bottom-left-radius: 4px;
        }

        .user-message {
            background: linear-gradient(135deg, var(--widget-accent-hover) 0%, var(--widget-accent) 100%);
            color: #fff;
            align-self: flex-end;
            border-bottom-right-radius: 4px;
            box-shadow: 0 4px 15px var(--widget-accent-glow);
        }

        .chatbot-input-area {
            padding: 1.25rem;
            background: rgba(0, 0, 0, 0.2);
            border-top: 1px solid var(--widget-glass-border);
        }

        .chat-form {
            display: flex;
            gap: 0.5rem;
        }

        .chat-input {
            flex: 1;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 0.8rem 1rem;
            color: #fff;
            font-family: inherit;
            outline: none;
        }

        .btn-send-chat {
            background: var(--widget-accent);
            color: #fff;
            border: none;
            border-radius: 12px;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .btn-send-chat:disabled { opacity: 0.5; }

        /* Characters left, shown only near the limit; lines up with the text being typed */
        .chatbot-widget-container .chat-count {
            margin: 0.5rem 0 0;
            padding: 0 1rem;
            font-size: 0.75rem;
            line-height: 1.2;
            color: var(--widget-text-secondary);
        }
        .chatbot-widget-container .chat-count.at-limit { color: var(--widget-text); }

        /* Choices offered when a chat opens: the bot's services, then a quieter "Something else". They sit on the
           visitor's side, outlined where a sent message is filled. Text colour only, so they read on any accent a
           client picks; every property is set, so a host page's own button styles don't leak in. */
        .chatbot-widget-container .chat-choices {
            align-self: flex-end;
            width: 85%;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin: -0.3rem 0 0; /* closer to the question than one message is to the next */
            padding: 0;
        }
        .chatbot-widget-container .chat-choice {
            appearance: none;
            display: block;
            width: 100%;
            min-height: 44px;
            margin: 0;
            padding: 0.65rem 1rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.24);
            border-radius: 12px;
            box-shadow: none;
            color: var(--widget-text);
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 500;
            line-height: 1.35;
            letter-spacing: normal;
            text-transform: none;
            text-align: left;
            overflow-wrap: anywhere;
            cursor: pointer;
            transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .chatbot-widget-container .chat-choice:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--widget-text); }
        .chatbot-widget-container .chat-choice:active { transform: scale(0.98); }
        .chatbot-widget-container .chat-choice:focus-visible { outline: 2px solid var(--widget-text); outline-offset: 2px; }
        .chatbot-widget-container .chat-choice-other { background: none; border-color: transparent; color: var(--widget-text-secondary); font-weight: 400; }
        .chatbot-widget-container .chat-choice-other:hover { background: none; border-color: transparent; color: var(--widget-text); text-decoration: underline; }
        @media (prefers-reduced-motion: reduce) {
            .chatbot-widget-container .chat-choice { transition: none; }
            .chatbot-widget-container .chat-choice:active { transform: none; }
        }

        .chat-link { color: inherit; text-decoration: underline; overflow-wrap: anywhere; }
        .chat-link:hover { opacity: 0.85; }
        .chat-link:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
        .chat-linkedin-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.75rem;
            padding: 0.55rem 1.1rem;
            background: #0a66c2;
            color: #fff !important;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            text-decoration: none;
            box-shadow: 0 4px 14px rgba(10, 102, 194, 0.4);
        }

        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 0.5rem 1rem;
            align-items: center;
        }

        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--widget-text-secondary);
            border-radius: 50%;
            animation: widget-typing 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes widget-fab-bounce {
            0%, 100% { transform: translateY(0); }
            10% { transform: translateY(-6px); }
            20% { transform: translateY(0); }
            30% { transform: translateY(-3px); }
            40% { transform: translateY(0); }
        }

        @keyframes widget-fab-ping {
            0% { transform: scale(1); opacity: 0.5; }
            70% { transform: scale(1.9); opacity: 0; }
            100% { transform: scale(1.9); opacity: 0; }
        }

        @keyframes widget-pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }

        @keyframes widget-typing {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        @keyframes widget-fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .branding-area {
            padding: 0.5rem;
            text-align: center;
            font-size: 0.7rem;
            color: var(--widget-text-secondary);
            background: rgba(0, 0, 0, 0.4);
        }

        .branding-area a {
            color: var(--widget-accent);
            text-decoration: none;
            font-weight: 600;
        }

        /* An iPhone zooms the page in when a text box under 16px is tapped */
        @media (pointer: coarse) {
            .chatbot-widget-container .chat-input { font-size: 16px; }
        }

        @media (max-width: 480px) {
            .chatbot-widget-container { bottom: 1rem; right: 1rem; }
            /* The chat fills the screen. While the keyboard is up, fitToView sets the two values to the part of the
               screen still in view. No border: with it the window was 2px larger than the screen. */
            .chatbot-window {
                position: fixed;
                top: var(--bfx-chat-top, 0px); left: 0;
                width: 100%; height: var(--bfx-chat-height, 100%);
                max-height: none;
                border: 0;
                border-radius: 0;
                margin-bottom: 0;
            }
            /* The chat fills the screen here, so the launcher would sit on the send button. The × closes the chat */
            .chatbot-window:not(.hidden) + .chatbot-launcher { display: none; }
        }
    `;

    const escapeAttr = (str) => String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    // --- Core UI Creation ---
    async function init() {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);

        // Fetch Config
        let config = {};
        try {
            // Public, no-auth endpoint — /api/config is admin-only and rejects customer sites
            const res = await fetch(`${API_URL}/public/config?clientId=${encodeURIComponent(clientId)}`);
            if (res.ok) config = await res.json();
        } catch (e) { console.error("Config fetch error:", e); }

        const showBranding = config.showBranding !== false;
        const refId = encodeURIComponent(config.referralId || '');
        const baseBadgeUrl = /^https:\/\//i.test(config.badgeUrl || '') ? config.badgeUrl : 'https://web.bytesfx.com/';
        const brandingUrl = escapeAttr(refId
            ? baseBadgeUrl + (baseBadgeUrl.includes('?') ? `&ref=${refId}` : `?ref=${refId}`)
            : baseBadgeUrl);

        // White-label customization (business+ only — enforced by backend)
        const widgetName = escapeAttr(config.widgetName || 'BytesFX');
        const widgetAccentColor = config.widgetAccentColor || '#6366f1';
        const widgetAvatar = /^https?:\/\//i.test(config.widgetAvatar || '') ? escapeAttr(config.widgetAvatar) : '';
        // One message has a character limit, set on the server (which enforces it too)
        const maxChars = Number(config.maxMessageChars) > 0 ? Math.floor(config.maxMessageChars) : 500;
        // The bot's services, offered as buttons when a chat opens. Only for a new chat: a tap sent in the middle of
        // an earlier conversation would be read as the answer to a later question (a name, a timeline).
        const services = sessionId ? [] : (Array.isArray(config.services) ? config.services : []).filter(s => typeof s === 'string' && s.trim()).slice(0, 8);
        const greeting = services.length ? 'Hi! How can we help?' : `Hi there! I'm ${widgetName}. How can I help you scale today?`;

        const container = document.createElement('div');
        container.className = 'chatbot-widget-container';

        // Apply custom accent color via CSS variable override
        if (/^#[0-9a-f]{6}$/i.test(config.widgetAccentColor || '')) { // hex only — it's injected into CSS
            const accentHex = config.widgetAccentColor;
            const customStyle = document.createElement('style');
            customStyle.textContent = `.chatbot-widget-container { --widget-accent: ${accentHex}; --widget-accent-hover: ${accentHex}; --widget-accent-glow: ${accentHex}40; }`;
            document.head.appendChild(customStyle);
        }

        const launcherContent = widgetAvatar
            ? `<img src="${widgetAvatar}" alt="${widgetName}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">`
            : `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>`;

        container.innerHTML = `
            <div id="chatbot-window" class="chatbot-window hidden">
                <div class="chatbot-header">
                    <div class="chatbot-title">
                        <div class="status-dot"></div>
                        ${widgetName}
                    </div>
                    <button class="btn-close-chat" id="btn-close-chat" aria-label="Close chat">&times;</button>
                </div>
                <div class="chatbot-messages" id="chatbot-messages">
                    <div class="chat-message bot-message">${greeting}</div>
                </div>
                <div class="chatbot-input-area">
                    <form class="chat-form" id="chatbot-form">
                        <input type="text" class="chat-input" id="chatbot-input" placeholder="Type a message..." autocomplete="off" maxlength="${maxChars}" aria-describedby="chatbot-count">
                        <button type="submit" class="btn-send-chat" id="btn-send-chat">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                        </button>
                    </form>
                    <div class="chat-count" id="chatbot-count" hidden></div>
                </div>
                <div class="branding-area" id="branding-area" style="display: ${showBranding ? 'block' : 'none'}">
                    Powered by <a href="${brandingUrl}" target="_blank" rel="noopener noreferrer">BytesFX</a>
                </div>
            </div>
            <button class="chatbot-launcher" id="chatbot-launcher">
                ${launcherContent}
            </button>
        `;
        document.body.appendChild(container);

        setupEventListeners(services);
    }

    function setupEventListeners(services) {
        const launcher = document.getElementById('chatbot-launcher');
        const windowEl = document.getElementById('chatbot-window');
        const closeBtn = document.getElementById('btn-close-chat');
        const form = document.getElementById('chatbot-form');
        const input = document.getElementById('chatbot-input');
        const messagesContainer = document.getElementById('chatbot-messages');

        let choices = null; // the buttons offered when a chat opens, until the first message

        // A phone or tablet brings up its keyboard when the text box is selected, and the keyboard covers half the
        // screen. There the text box is selected only when the visitor asks for it: by tapping it or "Something
        // else", or by sending a message they typed. With a mouse it is selected as soon as the chat opens.
        const keyboardOnScreen = () => window.matchMedia('(pointer: coarse)').matches;

        // On a phone the chat fills the screen, but the keyboard covers the lower part of it and the page is not
        // made shorter for it. The chat is sized to the part still in view (the phone rule above reads these two
        // values), so the header stays at the top and the text box sits on the keyboard.
        const view = window.visualViewport;
        let viewHeight = 0;
        const fitToView = () => {
            if (!view) return;
            // Closed, or zoomed by hand (which also changes the part in view): back to the whole screen
            if (windowEl.classList.contains('hidden') || Math.abs(view.scale - 1) > 0.01) {
                windowEl.style.removeProperty('--bfx-chat-top');
                windowEl.style.removeProperty('--bfx-chat-height');
                viewHeight = 0;
                return;
            }
            windowEl.style.setProperty('--bfx-chat-top', `${view.offsetTop}px`);
            windowEl.style.setProperty('--bfx-chat-height', `${view.height}px`);
            // The keyboard came up: keep what the visitor is answering in view, which is the question above the
            // choices or the last message
            if (view.height < viewHeight) messagesContainer.scrollTop = choices ? 0 : messagesContainer.scrollHeight;
            viewHeight = view.height;
        };
        if (view) {
            view.addEventListener('resize', fitToView);
            view.addEventListener('scroll', fitToView);
        }

        launcher.addEventListener('click', () => {
            windowEl.classList.toggle('hidden');
            if (!windowEl.classList.contains('hidden')) {
                if (!keyboardOnScreen()) input.focus();
                // A long list of choices opens at the question above it, not at the last button
                messagesContainer.scrollTop = choices ? 0 : messagesContainer.scrollHeight;
            } else {
                input.blur();
            }
            fitToView();
        });

        // The text box is let go, so the keyboard goes with the chat
        closeBtn.addEventListener('click', () => {
            windowEl.classList.add('hidden');
            input.blur();
            fitToView();
        });

        // The count appears for the last fifth of the limit, so a pasted text that was cut short is not a surprise
        const count = document.getElementById('chatbot-count');
        const showCount = () => {
            const left = input.maxLength - input.value.length;
            count.hidden = left > input.maxLength / 5;
            count.classList.toggle('at-limit', left <= 0);
            count.textContent = left > 0 ? `${left} character${left === 1 ? '' : 's'} left` : `Limit reached: ${input.maxLength} characters`;
        };
        input.addEventListener('input', showCount);

        // Service names are typed by the client: built as buttons with text only, never as HTML
        const hideChoices = () => { if (choices) { choices.remove(); choices = null; } };
        if (services.length) {
            choices = document.createElement('div');
            choices.className = 'chat-choices';
            choices.setAttribute('role', 'group');
            choices.setAttribute('aria-label', 'What you need');
            const addChoice = (label, onTap, extra) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = extra ? `chat-choice ${extra}` : 'chat-choice';
                btn.textContent = label;
                btn.addEventListener('click', onTap);
                choices.appendChild(btn);
            };
            services.forEach((service) => addChoice(service, () => send(service)));
            addChoice('Something else', () => input.focus(), 'chat-choice-other');
            messagesContainer.appendChild(choices);
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if (message) send(message, true);
        });

        // One visitor message, typed or tapped. The choices go at once, so a second tap can't send again.
        async function send(message, typed) {
            if (input.disabled) return;
            hideChoices();
            appendMessage(message, 'user-message');
            input.value = '';
            showCount();
            input.disabled = true;

            const typingId = showTypingIndicator();

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: message, clientId: clientId, sessionId: sessionId })
                });

                const data = await response.json();
                removeTypingIndicator(typingId);

                if (data.sessionId && data.sessionId !== sessionId) {
                    sessionId = data.sessionId;
                    try { sessionStorage.setItem(SESSION_KEY, sessionId); } catch (e) { /* storage blocked */ }
                }
                if (response.ok && data.response) {
                    appendMessage(data.response, 'bot-message');
                } else {
                    appendMessage(data.error || "Connection error. Please try again later.", 'bot-message');
                }
            } catch (err) {
                removeTypingIndicator(typingId);
                appendMessage("Network error. Please try again.", 'bot-message');
            } finally {
                input.disabled = false;
                // Back to the text box for the next message. Where the keyboard is on screen, only after a typed
                // message: after a tapped choice it would come up over the reply.
                if (typed || !keyboardOnScreen()) input.focus();
            }
        }
    }

    function appendMessage(text, className) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const div = document.createElement('div');
        div.className = `chat-message ${className}`;

        // Built with DOM nodes only: bot replies and visitor text can never become HTML or script
        String(text).split(/(\*\*[^*]+?\*\*|\[linkedin_button\]|https:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/i).forEach((seg) => {
            if (!seg) return;
            if (/^https:\/\//i.test(seg)) {
                // Links (e.g. a booking page) open in a new tab; https only
                const a = document.createElement('a');
                a.href = seg;
                a.target = '_blank';
                a.rel = 'noopener noreferrer nofollow';
                a.className = 'chat-link';
                a.textContent = seg.replace(/^https:\/\//i, '');
                div.appendChild(a);
                return;
            }
            if (/^\*\*[^*]+?\*\*$/.test(seg)) {
                const b = document.createElement('strong');
                b.textContent = seg.slice(2, -2);
                div.appendChild(b);
            } else if (/^\[linkedin_button\]$/i.test(seg)) {
                const a = document.createElement('a');
                a.href = LINKEDIN_URL;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.className = 'chat-linkedin-btn';
                a.textContent = 'DM us on LinkedIn';
                div.appendChild(a);
            } else {
                div.appendChild(document.createTextNode(seg));
            }
        });
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showTypingIndicator() {
        const messagesContainer = document.getElementById('chatbot-messages');
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `chat-message bot-message typing-indicator`;
        div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }


    // Start
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
