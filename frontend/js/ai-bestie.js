const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

function appendMessage(text, isUser = false) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isUser ? 'user-msg' : 'bot-msg'}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// API: POST /api/chat
async function queryAiBestie(prompt) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(`Analyzing your transactions... For "${prompt}", your finances are well balanced with ৳6,800 remaining this month!`);
    }, 700);
  });
}

async function sendPrompt(text) {
  appendMessage(text, true);
  const reply = await queryAiBestie(text);
  appendMessage(reply, false);
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  await sendPrompt(text);
});