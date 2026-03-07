(function () {
    // --- Configuration & Constants ---
    const API_URL = "https://ai.bytesfx.com";
    const LINKEDIN_URL = 'https://www.linkedin.com/in/fbmacagba/';
    const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSfUBw3kAv2qoIC2Z45K8RNdzQlaIZYz_UALH4sEFnWDxfUETw/formResponse';

    // Get clientId from script tag (if provided)
    const scriptTag = document.currentScript;
    const clientId = scriptTag ? scriptTag.getAttribute('data-client-id') || 'default' : 'default';

    // --- State ---
    let chatHistory = [
        { role: 'model', parts: [{ text: "Hi there! I'm BytesAI. How can I help you scale today?" }] }
    ];
    let isSubmittingLead = false;

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

        .btn-close-chat {
            background: none;
            border: none;
            color: var(--widget-text-secondary);
            font-size: 1.5rem;
            cursor: pointer;
            line-height: 1;
        }

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

        @media (max-width: 480px) {
            .chatbot-widget-container { bottom: 1rem; right: 1rem; }
            .chatbot-window {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                max-height: none;
                border-radius: 0;
                margin-bottom: 0;
            }
        }
    `;

    // --- Core UI Creation ---
    function init() {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);

        const container = document.createElement('div');
        container.className = 'chatbot-widget-container';
        container.innerHTML = `
            <div id="chatbot-window" class="chatbot-window hidden">
                <div class="chatbot-header">
                    <div class="chatbot-title">
                        <div class="status-dot"></div>
                        BytesAI 
                    </div>
                    <button class="btn-close-chat" id="btn-close-chat">&times;</button>
                </div>
                <div class="chatbot-messages" id="chatbot-messages">
                    <div class="chat-message bot-message">
                        Hi there! I'm BytesAI. How can I help you scale today?
                    </div>
                </div>
                <div class="chatbot-input-area">
                    <form class="chat-form" id="chatbot-form">
                        <input type="text" class="chat-input" id="chatbot-input" placeholder="Type a message..." autocomplete="off">
                        <button type="submit" class="btn-send-chat" id="btn-send-chat">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
            <button class="chatbot-launcher" id="chatbot-launcher">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>
            </button>
        `;
        document.body.appendChild(container);

        setupEventListeners();
    }

    function setupEventListeners() {
        const launcher = document.getElementById('chatbot-launcher');
        const windowEl = document.getElementById('chatbot-window');
        const closeBtn = document.getElementById('btn-close-chat');
        const form = document.getElementById('chatbot-form');
        const input = document.getElementById('chatbot-input');
        const messagesContainer = document.getElementById('chatbot-messages');

        launcher.addEventListener('click', () => {
            windowEl.classList.toggle('hidden');
            if (!windowEl.classList.contains('hidden')) {
                input.focus();
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });

        closeBtn.addEventListener('click', () => {
            windowEl.classList.add('hidden');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = input.value.trim();
            if (!message) return;

            appendMessage(message, 'user-message');
            input.value = '';
            input.disabled = true;

            const typingId = showTypingIndicator();

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: message, history: chatHistory, clientId: clientId })
                });

                const data = await response.json();
                removeTypingIndicator(typingId);

                if (response.ok && data.response) {
                    chatHistory.push({ role: 'user', parts: [{ text: message }] });
                    chatHistory.push({ role: 'model', parts: [{ text: data.response }] });
                    appendMessage(data.response, 'bot-message');

                    if (data.leadData && !window._chatLeadSubmitted) {
                        window._chatLeadSubmitted = true;
                        submitLead(data.leadData.name, data.leadData.email, data.leadData.summary);
                    }
                } else {
                    appendMessage(data.error || "Connection error. Please try again later.", 'bot-message');
                }
            } catch (err) {
                removeTypingIndicator(typingId);
                appendMessage("Network error. Please try again.", 'bot-message');
            } finally {
                input.disabled = false;
                input.focus();
            }
        });
    }

    function appendMessage(text, className) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const div = document.createElement('div');
        div.className = `chat-message ${className}`;

        let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        const linkedinBtnHTML = `<a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer" class="chat-linkedin-btn">
            DM us on LinkedIn
        </a>`;
        formattedText = formattedText.replace(/\[linkedin_button\]/gi, linkedinBtnHTML);

        div.innerHTML = formattedText;
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

    function submitLead(name, email, summary) {
        let iframe = document.getElementById('chatLeadIframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'chatLeadIframe';
            iframe.name = 'chatLeadIframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        const form = document.createElement('form');
        form.action = GOOGLE_FORM_URL;
        form.method = 'POST';
        form.target = 'chatLeadIframe';
        form.style.display = 'none';

        const inputs = {
            'entry.1698580962': name,
            'entry.1399885084': email,
            'entry.584713419': `Agent Client: ${clientId}`,
            'entry.31456989': summary || 'Chatbot conversation'
        };

        for (const key in inputs) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = inputs[key];
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        setTimeout(() => form.remove(), 2000);
    }

    // Start
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
