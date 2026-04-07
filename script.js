/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Replace this with your own Cloudflare Worker URL.
const WORKER_URL = "https://lorchatbot.mekdimbekele.workers.dev";

// Stores the ongoing chat context (without exposing secrets).
const conversationHistory = [];

// This system prompt keeps the assistant focused on L'Oréal beauty topics only.
const SYSTEM_PROMPT =
  "You are a L'Oréal beauty advisor. You can only answer questions related to L'Oréal products, skincare, haircare, makeup, beauty routines, and product usage. If a question is unrelated, politely refuse and ask the user to ask a L'Oréal beauty question instead.";

// Optional local keyword check to politely refuse unrelated questions immediately.
const beautyKeywords = [
  "l'oreal",
  "loreal",
  "skincare",
  "skin",
  "haircare",
  "hair",
  "makeup",
  "beauty",
  "routine",
  "serum",
  "shampoo",
  "conditioner",
  "cleanser",
  "moisturizer",
  "sunscreen",
  "foundation",
  "mascara",
  "lipstick",
  "fragrance",
];

function isBeautyQuestion(message) {
  const lowerMessage = message.toLowerCase();
  return beautyKeywords.some((keyword) => lowerMessage.includes(keyword));
}

function showMessage(role, text) {
  const messageEl = document.createElement("p");
  messageEl.classList.add("msg", role);
  messageEl.textContent = text;
  chatWindow.appendChild(messageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageEl;
}

function showBotResponse(responseText) {
  return showMessage("ai", `Advisor: ${responseText}`);
}

async function sendMessageToWorker() {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("Request failed. Please check your Cloudflare Worker URL.");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Set initial message
showBotResponse(
  "Hello! Ask me about L'Oréal skincare, haircare, or beauty routines.",
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  showMessage("user", `You: ${message}`);
  userInput.value = "";

  // Save user messages in history so future requests include full context.
  conversationHistory.push({ role: "user", content: message });

  if (!isBeautyQuestion(message)) {
    const refusalMessage =
      "I can only help with L'Oréal products, skincare, haircare, and beauty routines. Please ask a beauty-related question.";
    showBotResponse(refusalMessage);
    conversationHistory.push({ role: "assistant", content: refusalMessage });
    return;
  }

  const pendingResponseEl = showBotResponse("Thinking...");

  try {
    const answer = await sendMessageToWorker();

    // Replace the temporary "Thinking..." message in place.
    pendingResponseEl.textContent = `Advisor: ${answer}`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    conversationHistory.push({ role: "assistant", content: answer });
  } catch (error) {
    const errorMessage =
      "Sorry, I could not get a response right now. Please try again.";
    pendingResponseEl.textContent = `Advisor: ${errorMessage}`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    conversationHistory.push({ role: "assistant", content: errorMessage });
    console.error(error);
  }
});
