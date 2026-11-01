// The site's own chat (the Bytes bot, clientId "default"), used by the homepage and the AI chatbot page
import PLAN_DATA from '../public/plans.json';

// The messages shown in this tab
const chatHistory = [];

export function initChatbot() {
  const btnOpen = document.getElementById('btnOpenChat');
  const btnClose = document.getElementById('btnCloseChat');
  const chatWindow = document.getElementById('chatbot-window');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');

  if (!btnOpen || !chatWindow) return;

  // A phone or tablet brings up its keyboard when the text box is selected, and the keyboard covers half the
  // screen. There the text box is selected only when the visitor asks for it: by tapping it or "Other / not sure",
  // or by sending a message they typed. With a mouse it is selected as soon as the chat opens.
  const keyboardOnScreen = () => window.matchMedia('(pointer: coarse)').matches;

  // On a phone the chat fills the screen, but the keyboard covers the lower part of it and the page is not made
  // shorter for it. The chat is sized to the part still in view (the phone rule in style.css reads these two
  // values), so the header stays at the top and the text box sits on the keyboard.
  const view = window.visualViewport;
  let viewHeight = 0;
  const fitToView = () => {
    if (!view) return;
    // Closed, or zoomed by hand (which also changes the part in view): back to the whole screen
    if (chatWindow.classList.contains('hidden') || Math.abs(view.scale - 1) > 0.01) {
      chatWindow.style.removeProperty('--chat-top');
      chatWindow.style.removeProperty('--chat-height');
      viewHeight = 0;
      return;
    }
    chatWindow.style.setProperty('--chat-top', `${view.offsetTop}px`);
    chatWindow.style.setProperty('--chat-height', `${view.height}px`);
    // The keyboard came up: keep what the visitor is answering in view, which is the question above the choices
    // or the last message
    const messages = document.getElementById('chat-messages');
    if (messages && view.height < viewHeight) messages.scrollTop = messages.querySelector('.chat-choices') ? 0 : messages.scrollHeight;
    viewHeight = view.height;
  };
  view?.addEventListener('resize', fitToView);
  view?.addEventListener('scroll', fitToView);

  // Open chatbot
  btnOpen.addEventListener('click', () => {
    chatWindow.classList.remove('hidden');
    btnOpen.classList.add('hidden');
    if (!keyboardOnScreen()) chatInput?.focus();
    fitToView();
  });

  // Close chatbot. The text box is let go, so the keyboard goes with the chat.
  btnClose?.addEventListener('click', () => {
    chatWindow.classList.add('hidden');
    btnOpen.classList.remove('hidden');
    chatInput?.blur();
    fitToView();
  });

  // One message has a character limit (plans.json "chat"; the server enforces it too).
  // The count appears for the last fifth, so a pasted text that was cut short is not a surprise.
  const chatCount = document.getElementById('chatCount');
  const maxChars = PLAN_DATA.chat.messageChars;
  const showCount = () => {
    if (!chatInput || !chatCount) return;
    const left = maxChars - chatInput.value.length;
    chatCount.hidden = left > maxChars / 5;
    chatCount.classList.toggle('at-limit', left <= 0);
    chatCount.textContent = left > 0 ? `${left} character${left === 1 ? '' : 's'} left` : `Limit reached: ${maxChars} characters`;
  };
  if (chatInput) {
    chatInput.maxLength = maxChars;
    chatInput.addEventListener('input', showCount);
  }

  // The services, offered as buttons under the greeting when a chat opens. Only for a new chat: a tap sent in
  // the middle of an earlier conversation would be read as the answer to a later question (a name, a timeline).
  const chatMessages = document.getElementById('chat-messages');
  let choices = null;
  let started = false;
  const hideChoices = () => { choices?.remove(); choices = null; };
  const showChoices = (services) => {
    if (started || chatSessionId || !chatMessages || !chatInput || !services.length) return;
    const greeting = chatMessages.querySelector('.bot-message p');
    // One line, so the question and the three default services fit the window without scrolling
    if (greeting) greeting.textContent = 'Hi! How can we help?';
    choices = document.createElement('div');
    choices.className = 'chat-choices';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', 'What you need');
    const addChoice = (label, onTap, extra) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = extra ? `chat-choice ${extra}` : 'chat-choice';
      btn.textContent = label; // text only: a service name can never become HTML
      btn.addEventListener('click', onTap);
      choices.appendChild(btn);
    };
    services.forEach((service) => addChoice(service, () => send(service)));
    // Named as the contact form's last option, so the chat's choices match the form's
    addChoice('Other / not sure', () => chatInput.focus(), 'chat-choice-other');
    chatMessages.appendChild(choices);
  };
  // The list comes from the bot's settings. If it can't be read, the chat opens as before, with no buttons.
  if (!chatSessionId) {
    fetch(`${CHAT_API_URL}/public/config?clientId=default`)
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => showChoices((Array.isArray(cfg?.services) ? cfg.services : []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 8)))
      .catch(() => { /* no buttons */ });
  }

  // One visitor message, typed or tapped. The choices go at once, so a second tap can't send again.
  const send = async (message, typed = false) => {
    if (!chatInput || chatInput.disabled) return;
    started = true;
    hideChoices();

    // Add user message
    addChatMessage(message, 'user');
    chatInput.value = '';
    showCount();

    // Block new messages until this reply lands so history stays in order
    chatInput.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    // Generate response
    const response = await generateChatResponse(message);
    removeTypingIndicator();
    addChatMessage(response, 'bot');

    chatInput.disabled = false;
    // Back to the text box for the next message. Where the keyboard is on screen, only after a typed message:
    // after a tapped choice it would come up over the reply.
    if (typed || !keyboardOnScreen()) chatInput.focus();
  };

  // Handle form submission
  chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = chatInput?.value?.trim();
    if (message) send(message, true);
  });
}

function addChatMessage(text, sender) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${sender === 'user' ? 'user-message' : 'bot-message'}`;

  const p = document.createElement('p');
  // Show the link, but keep the raw [LINKEDIN_BUTTON] token in history for the API.
  // Built from text nodes and https links only, so a reply can never become HTML.
  text.replace('[LINKEDIN_BUTTON]', LINKEDIN_URL).split(/(https:\/\/[^\s<>"']+[^\s<>"'.,;:!?)])/).forEach((part) => {
    if (sender !== 'bot' || !/^https:\/\//.test(part)) { p.appendChild(document.createTextNode(part)); return; }
    const a = document.createElement('a');
    a.href = part;
    a.className = 'chat-link';
    a.textContent = part.replace(/^https:\/\//, '');
    if (a.origin === location.origin && a.pathname === location.pathname && a.hash) {
      // A place on this page (the contact form): close the chat and go there
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('btnCloseChat')?.click();
        document.getElementById(a.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      });
    } else {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    p.appendChild(a);
  });
  messageDiv.appendChild(p);

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Store in history
  chatHistory.push({ sender, text, timestamp: Date.now() });
}

function showTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message bot-message typing-indicator';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = '<span></span><span></span><span></span>';

  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  document.getElementById('typingIndicator')?.remove();
}

const CHAT_API_URL = 'https://ai.bytesfx.com';
const LINKEDIN_URL = 'https://www.linkedin.com/in/fbmacagba/';

// The conversation is kept on the server; this tab only holds its opaque id
let chatSessionId = null;
try { chatSessionId = sessionStorage.getItem('bytesfx_chat_default'); } catch (_) { /* storage blocked */ }

// Ask the AI backend, falling back to canned replies if it's unreachable
async function generateChatResponse(userMessage) {
  try {
    const res = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, clientId: 'default', sessionId: chatSessionId })
    });
    const data = await res.json();
    if (data.sessionId && data.sessionId !== chatSessionId) {
      chatSessionId = data.sessionId;
      try { sessionStorage.setItem('bytesfx_chat_default', chatSessionId); } catch (_) { /* storage blocked */ }
    }
    if (res.ok && data.response) {
      return data.response;
    }
  } catch (err) {
    console.error('Chat API error:', err);
  }

  return getFallbackResponse(userMessage);
}

// Sales-optimized chatbot responses
function getFallbackResponse(userMessage) {
  const message = userMessage.toLowerCase();

  // Check for lead capture keywords
  if (message.includes('contact') || message.includes('get started') || message.includes('hire') || message.includes('quote') || message.includes('price') || message.includes('cost')) {
    return "I'd love to help you get started! Could you share your name and email so one of our specialists can reach out with a personalized quote?";
  }

  // Website upgrading (before the website branch, so "upgrade my website" lands here)
  if (message.includes('upgrade') || message.includes('upgrading') || message.includes('redesign') || message.includes('refresh')) {
    return "We upgrade the site you already have: a redesign that fixes what is slow, what is unclear and what is not converting, without losing what you have already earned. Want us to take a look at it?";
  }

  // Website development
  if (message.includes('website') || message.includes('web design') || message.includes('web development')) {
    return "We specialize in high-performance websites designed for maximum ROI. Our sites are optimized for conversions, fast-loading, and built to scale your business. Would you like to schedule a free consultation?";
  }

  // Application development
  if (message.includes('app') || message.includes('application') || message.includes('software')) {
    return "Our custom application development service delivers tailored solutions to streamline your business operations. From internal tools to customer-facing apps, we've got you covered. What's your specific use case?";
  }

  // Chatbot / AI
  if (message.includes('chatbot') || message.includes('ai') || message.includes('automation')) {
    return "We design and implement intelligent consultant chatbots that qualify leads, answer questions, and drive sales 24/7. Our AI solutions are built to maximize your conversion rates. Interested in seeing a demo?";
  }

  // Pricing
  if (message.includes('price') || message.includes('pricing') || message.includes('cost') || message.includes('expensive')) {
    return `Websites and apps are quoted once the team understands the project. Chatbot plans start free, and paid plans start at ${PLAN_DATA.currency}${Math.min(...PLAN_DATA.plans.filter(p => p.price > 0).map(p => p.price))} a month. Shall I pass your details to the team for a quote?`;
  }

  // Process / timeline
  if (message.includes('time') || message.includes('how long') || message.includes('process') || message.includes('timeline')) {
    return "Every project starts with a short conversation about what you need. The team then sends a written quote with the timeline, so you know both before anything starts. Would you like them to get in touch?";
  }

  // Portfolio / work
  if (message.includes('portfolio') || message.includes('work') || message.includes('projects') || message.includes('example')) {
    return "Tell me a little about what you have in mind, and the team will reply by email within 24 hours with how they would approach it. What's the best email for you?";
  }

  // Contact request
  if (message.includes('yes') || message.includes('sure') || message.includes('okay') || message.includes('definitely')) {
    return "Great! Please share your name and email, and our team will be in touch within 24 hours with a personalized proposal for your project.";
  }

  // Default responses - keep the conversation going
  const defaultResponses = [
    "That's a great question! To help you better, could you tell me more about your project or business goals?",
    "I'd love to learn more about your specific needs. What problem are you trying to solve?",
    "Absolutely! Let's find the perfect solution for you. What's your timeline and budget range?",
    "Sounds interesting! Could you share a bit more about what you're looking to achieve?",
    "We're here to help! What specific service interests you the most - website development, applications, or chatbots?"
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}
