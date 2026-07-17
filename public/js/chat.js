/* ============================================================
   skillsdev.ai — SkillBot chat widget (frontend)
   Talks to POST /api/chat. Backend decides local-match vs LLM.
   ============================================================ */

const Chat = (function () {
  let open = false;
  const history = [];

  const STARTERS = [
    "Which skill should I learn first?",
    "What is Python used for?",
    "How do I start freelancing?",
    "What is Figma?",
  ];

  function el(id) {
    return document.getElementById(id);
  }

  function appendMessage(role, text) {
    const wrap = el("chatMessages");
    const div = document.createElement("div");
    div.className = "msg " + (role === "user" ? "msg-user" : "msg-bot");
    div.textContent = text;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
    return div;
  }

  function appendActionChip(action) {
    const wrap = el("chatMessages");
    const chip = document.createElement("div");
    chip.className = "msg msg-bot msg-action";
    chip.textContent = "→ " + action.label;
    chip.addEventListener("click", () => {
      location.hash = `#/roadmap/${action.cat}/${action.key}`;
      closePanel();
    });
    wrap.appendChild(chip);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function showTyping() {
    const wrap = el("chatMessages");
    const div = document.createElement("div");
    div.className = "msg-typing";
    div.id = "typingIndicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }
  function hideTyping() {
    const t = el("typingIndicator");
    if (t) t.remove();
  }

  function renderSuggestions(list) {
    const wrap = el("chatSuggestions");
    wrap.innerHTML = "";
    list.forEach((q) => {
      const chip = document.createElement("button");
      chip.className = "suggestion-chip";
      chip.textContent = q;
      chip.addEventListener("click", () => sendMessage(q));
      wrap.appendChild(chip);
    });
  }

  function pickFollowUps() {
    return STARTERS.slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }

  async function sendMessage(message) {
    if (!message || !message.trim()) return;
    appendMessage("user", message);
    el("chatInput").value = "";
    el("chatSuggestions").innerHTML = "";
    history.push({ role: "user", text: message });

    showTyping();
    try {
      const reply = await Api.chat(message, history.slice(-8));
      hideTyping();
      appendMessage("bot", reply.text);
      history.push({ role: "bot", text: reply.text });
      if (reply.action) appendActionChip(reply.action);
      el("chatModeLabel").textContent = reply.mode === "llm" ? "AI agent · Claude, grounded on site data" : "AI agent · local knowledge base";
    } catch (e) {
      hideTyping();
      appendMessage("bot", "Sorry, I hit a connection problem reaching the server. Please try again in a moment.");
      console.error(e);
    }
    renderSuggestions(pickFollowUps());
  }

  function openPanel() {
    el("chatPanel").classList.add("open");
    open = true;
    el("chatInput").focus();
  }
  function closePanel() {
    el("chatPanel").classList.remove("open");
    open = false;
  }
  function togglePanel() {
    open ? closePanel() : openPanel();
  }

  function init() {
    appendMessage("bot", "Hey 👋 I'm SkillBot — ask me about any skill, language, or tool on skillsdev.ai, like \"what is JavaScript used for\" or \"which skill should I learn first?\"");
    renderSuggestions(STARTERS);

    el("chatFab").addEventListener("click", togglePanel);
    el("chatClose").addEventListener("click", closePanel);
    el("chatSend").addEventListener("click", () => sendMessage(el("chatInput").value));
    el("chatInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage(el("chatInput").value);
    });
    const footerLink = el("footerChatLink");
    if (footerLink) {
      footerLink.addEventListener("click", (e) => {
        e.preventDefault();
        openPanel();
      });
    }

    Api.health()
      .then((h) => {
        el("chatModeLabel").textContent = h.aiMode === "llm+local" ? "AI agent · Claude, grounded on site data" : "AI agent · local knowledge base";
      })
      .catch(() => {});
  }

  return { init, openPanel, closePanel };
})();
