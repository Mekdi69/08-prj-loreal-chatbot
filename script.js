/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Replace this with your own Cloudflare Worker URL.
const WORKER_URL = "https://lorchatbot.mekdimbekele.workers.dev";

// LocalStorage key for conversation history
const HISTORY_KEY = "loreal_conversation_history";

// Stores the ongoing chat context (without exposing secrets).
// Loaded from localStorage on page load.
let conversationHistory = [];

// Load conversation history from localStorage
function loadConversationHistory() {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (stored) {
    try {
      conversationHistory = JSON.parse(stored);
      return true;
    } catch (error) {
      console.error("Failed to load conversation history:", error);
      conversationHistory = [];
      return false;
    }
  }
  return false;
}

// Save conversation history to localStorage
function saveConversationHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(conversationHistory));
  } catch (error) {
    console.error("Failed to save conversation history:", error);
  }
}

// Clear conversation history and reset UI
function clearConversation() {
  conversationHistory = [];
  localStorage.removeItem(HISTORY_KEY);
  chatWindow.innerHTML = "";
  showBotResponse(
    "Hello! Ask me about L'Oréal skincare, haircare, or beauty routines.",
  );
}

// Restore previous messages to chat window from history
function restoreChatHistory() {
  conversationHistory.forEach((msg) => {
    if (msg.role === "user") {
      showMessage("user", `You: ${msg.content}`);
    } else if (msg.role === "assistant") {
      showBotResponse(msg.content);
    }
  });
}

// Product database with images
const LOREAL_PRODUCTS = {
  "pure active cleanser": {
    name: "Pure Active Cleanser",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop",
    description: "Effective acne cleanser",
  },
  "hydra genius": {
    name: "Hydra Genius Moisturizer",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop",
    description: "Deep hydration moisturizer",
  },
  revitalift: {
    name: "RevitaLift",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop",
    description: "Anti-aging serum",
  },
  "absolut repair": {
    name: "Absolut Repair",
    image:
      "https://images.unsplash.com/photo-1528148343865-13218c1777b7?w=150&h=150&fit=crop",
    description: "Hair repair treatment",
  },
  elvive: {
    name: "Elvive Shampoo",
    image:
      "https://images.unsplash.com/photo-1528148343865-13218c1777b7?w=150&h=150&fit=crop",
    description: "Professional haircare",
  },
  sheabutter: {
    name: "Shea Butter Line",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=150&h=150&fit=crop",
    description: "Natural moisture care",
  },
  "true match": {
    name: "True Match Foundation",
    image:
      "https://images.unsplash.com/photo-1596462502278-af3efdc991db?w=150&h=150&fit=crop",
    description: "Perfect match foundation",
  },
  voluminous: {
    name: "Voluminous Mascara",
    image:
      "https://images.unsplash.com/photo-1596462502278-af3efdc991db?w=150&h=150&fit=crop",
    description: "Bold volumizing mascara",
  },
};

// This system prompt keeps the assistant focused on L'Oréal beauty topics only.
const SYSTEM_PROMPT =
  "You are a L'Oréal beauty advisor. You can only answer questions related to L'Oréal products, skincare, haircare, makeup, beauty routines, and product usage. If a question is unrelated, politely refuse and ask the user to ask a L'Oréal beauty question instead. When recommending products, mention the product names so they can be displayed as cards.";

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

// Typing animation function with product cards
function typeMessage(element, text, speed = 30) {
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

// Extract product names from text
function extractProductsFromText(text) {
  const foundProducts = [];
  const lowerText = text.toLowerCase();

  for (const [key, product] of Object.entries(LOREAL_PRODUCTS)) {
    if (lowerText.includes(key)) {
      foundProducts.push(product);
    }
  }

  return foundProducts;
}

// Create product card element
function createProductCard(product) {
  const card = document.createElement("div");
  card.classList.add("product-card");
  card.innerHTML = `
    <img src="${product.image}" alt="${product.name}" class="product-image" />
    <h4 class="product-name">${product.name}</h4>
    <p class="product-description">${product.description}</p>
  `;
  return card;
}

// Create product cards container
function createProductCardsContainer(products) {
  const container = document.createElement("div");
  container.classList.add("products-container");

  products.forEach((product) => {
    container.appendChild(createProductCard(product));
  });

  return container;
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
  const messageEl = document.createElement("p");
  messageEl.classList.add("msg", "ai");
  messageEl.textContent = `Advisor: `;
  chatWindow.appendChild(messageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Start typing animation (excluding "Advisor: " prefix)
  typeMessage(messageEl, `Advisor: ${responseText}`, 25).then(() => {
    // After typing completes, extract and show product cards
    const products = extractProductsFromText(responseText);
    if (products.length > 0) {
      const productsContainer = createProductCardsContainer(products);
      chatWindow.appendChild(productsContainer);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  });

  return messageEl;
}

// Quick message display (for restored history - no typing animation)
function showBotResponseQuick(responseText) {
  const messageEl = document.createElement("p");
  messageEl.classList.add("msg", "ai");
  messageEl.textContent = `Advisor: ${responseText}`;
  chatWindow.appendChild(messageEl);

  // Show product cards if any
  const products = extractProductsFromText(responseText);
  if (products.length > 0) {
    const productsContainer = createProductCardsContainer(products);
    chatWindow.appendChild(productsContainer);
  }

  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageEl;
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

// Set initial message or restore history
function initializeChat() {
  const hasHistory = loadConversationHistory();

  if (hasHistory && conversationHistory.length > 0) {
    // Restore previous conversation
    restoreChatHistory();
  } else {
    // Show greeting for new conversation
    showBotResponseQuick(
      "Hello! Ask me about L'Oréal skincare, haircare, or beauty routines.",
    );
  }
}

// Initialize on page load
initializeChat();

// Set up clear history button
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    if (
      confirm("Are you sure you want to clear the entire conversation history?")
    ) {
      clearConversation();
    }
  });
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  showMessage("user", `You: ${message}`);
  userInput.value = "";

  // Save user messages in history so future requests include full context.
  conversationHistory.push({ role: "user", content: message });
  saveConversationHistory();

  if (!isBeautyQuestion(message)) {
    const refusalMessage =
      "I can only help with L'Oréal products, skincare, haircare, and beauty routines. Please ask a beauty-related question.";
    showBotResponse(refusalMessage);
    conversationHistory.push({ role: "assistant", content: refusalMessage });
    saveConversationHistory();
    return;
  }

  showBotResponse("Thinking...");

  try {
    const answer = await sendMessageToWorker();
    conversationHistory.push({ role: "assistant", content: answer });
    saveConversationHistory();

    // The last message was "Thinking...", so we replace it
    const lastMessage = chatWindow.querySelector(".msg.ai:last-of-type");
    if (lastMessage && lastMessage.textContent.includes("Advisor: Thinking")) {
      lastMessage.remove();
    }

    // Now show the typing animation with products
    showBotResponse(answer);
  } catch (error) {
    const errorMessage =
      "Sorry, I could not get a response right now. Please try again.";

    // Replace the last "Thinking..." message
    const lastMessage = chatWindow.querySelector(".msg.ai:last-of-type");
    if (lastMessage && lastMessage.textContent.includes("Advisor: Thinking")) {
      lastMessage.remove();
    }

    showBotResponse(errorMessage);
    conversationHistory.push({ role: "assistant", content: errorMessage });
    saveConversationHistory();
    console.error(error);
  }
});
