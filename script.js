/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* System prompt */
const SYSTEM_PROMPT = `
You are a professional L'Oréal beauty advisor.
You answer ONLY beauty-related questions about L'Oréal skincare, haircare, makeup, and routines.
Be friendly, helpful, and specific.
Always give product-based recommendations when possible.
`;

/* Cloudflare Worker URL */
const WORKER_URL = "https://lorchatbot.mekdimbekele.workers.dev";

/* LocalStorage key */
const HISTORY_KEY = "loreal_conversation_history";

/* Conversation memory */
let conversationHistory = [];

/* Load conversation history */
function loadConversationHistory() {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (!stored) return false;

  try {
    conversationHistory = JSON.parse(stored);
    return true;
  } catch {
    conversationHistory = [];
    return false;
  }
}

/* Save conversation history */
function saveConversationHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(conversationHistory));
}

/* Restore chat UI */
function restoreChatHistory() {
  conversationHistory.forEach((msg) => {
    if (msg.role === "user") {
      showMessage("user", `You: ${msg.content}`);
    } else if (msg.role === "assistant") {
      showBotResponseQuick(msg.content);
    }
  });
}

/* Typing animation */
function typeMessage(element, text, speed = 25) {
  return new Promise((resolve) => {
    let index = 0;
    element.textContent = "";

    function typeChar() {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
        chatWindow.scrollTop = chatWindow.scrollHeight;
        setTimeout(typeChar, speed);
      } else {
        resolve();
      }
    }

    typeChar();
  });
}

/* Show user message */
function showMessage(role, text) {
  const messageEl = document.createElement("p");
  messageEl.classList.add("msg", role);
  messageEl.textContent = text;
  chatWindow.appendChild(messageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show bot message with typing */
function showBotResponse(text) {
  const messageEl = document.createElement("p");
  messageEl.classList.add("msg", "ai");
  messageEl.textContent = "Advisor: ";
  chatWindow.appendChild(messageEl);

  typeMessage(messageEl, `Advisor: ${text}`, 25);
}

/* Show bot message instantly (for restored history) */
function showBotResponseQuick(text) {
  const messageEl = document.createElement("p");
  messageEl.classList.add("msg", "ai");
  messageEl.textContent = `Advisor: ${text}`;
  chatWindow.appendChild(messageEl);
}

/* Beauty-only filter */
const beautyKeywords = [
  "skin", "skincare", "hair", "haircare", "makeup",
  "l'oreal", "loreal", "cleanser", "serum", "moisturizer",
  "foundation", "routine", "beauty", "product", "shampoo",
  "conditioner", "sunscreen", "mascara", "lipstick", "fragrance"
];

function isBeautyQuestion(message) {
  const lower = message.toLowerCase();
  return beautyKeywords.some((k) => lower.includes(k));
}

/* Send message to Worker */
async function sendMessageToWorker() {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error("Worker request failed.");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* Initialize chat */
function initializeChat() {
  const hasHistory = loadConversationHistory();

  if (hasHistory && conversationHistory.length > 0) {
    restoreChatHistory();
  } else {
    showBotResponseQuick(
      "Hello! Ask me about L'Oréal skincare, haircare, or beauty routines."
    );
  }
}

initializeChat();

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;
  // Restart conversation when user types "restart"
  if (message.toLowerCase() === "restart") {
    conversationHistory = [];
    localStorage.removeItem(HISTORY_KEY);
    chatWindow.innerHTML = "";
    showBotResponseQuick("Conversation restarted. How can I help with L'Oréal beauty today?");
    return;
  }

  showMessage("user", `You: ${message}`);
  userInput.value = "";

  conversationHistory.push({ role: "user", content: message });
  saveConversationHistory();

  if (!isBeautyQuestion(message)) {
    const refusal =
      "I can only help with L'Oréal products, skincare, haircare, and beauty routines.";
    showBotResponse(refusal);
    conversationHistory.push({ role: "assistant", content: refusal });
    saveConversationHistory();
    return;
  }

  showBotResponse("Thinking...");

  try {
    const answer = await sendMessageToWorker();

    // Remove the "Thinking..." message
    const lastAI = chatWindow.querySelector(".msg.ai:last-of-type");
    if (lastAI && lastAI.textContent.includes("Thinking")) {
      lastAI.remove();
    }

    conversationHistory.push({ role: "assistant", content: answer });
    saveConversationHistory();

    showBotResponse(answer);
  } catch (err) {
    const errorMsg = "Sorry, I couldn't get a response. Please try again.";

    const lastAI = chatWindow.querySelector(".msg.ai:last-of-type");
    if (lastAI && lastAI.textContent.includes("Thinking")) {
      lastAI.remove();
    }

    showBotResponse(errorMsg);
    conversationHistory.push({ role: "assistant", content: errorMsg });
    saveConversationHistory();
  }
});

