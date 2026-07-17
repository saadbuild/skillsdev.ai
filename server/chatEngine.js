/* ============================================================
   skillsdev.ai — SkillBot engine (server side)
   Two modes:
   1) LOCAL MODE (always available, zero cost, zero setup):
      matches the user's message against every skill/language/tool,
      every roadmap topic, and an FAQ list, all sourced from data.js.
   2) LLM MODE (optional): if ANTHROPIC_API_KEY is set in .env, the
      matched context is handed to Claude as grounding so the agent
      can answer in full sentences, handle follow-ups, and reason
      about topics that don't exactly match a keyword.
   ============================================================ */

const { DATA, FAQ, FALLBACK_REPLIES } = require("./data");

let knowledgeIndex = null;

function buildIndex() {
  if (knowledgeIndex) return knowledgeIndex;
  const index = [];

  ["skills", "languages", "tools"].forEach((cat) => {
    Object.keys(DATA[cat]).forEach((key) => {
      const item = DATA[cat][key];
      const itemTerms = new Set();
      item.name
        .toLowerCase()
        .split(/\W+/)
        .forEach((w) => w.length > 2 && itemTerms.add(w));
      itemTerms.add(item.name.toLowerCase());

      index.push({ type: "item", cat, key, item, terms: Array.from(itemTerms) });

      item.stages.forEach((stage) => {
        stage.forEach((node) => {
          const nodeTerms = new Set(itemTerms);
          node.label
            .toLowerCase()
            .split(/\W+/)
            .forEach((w) => w.length > 2 && nodeTerms.add(w));
          nodeTerms.add(node.label.toLowerCase());
          index.push({ type: "node", cat, key, item, node, terms: Array.from(nodeTerms) });
        });
      });
    });
  });

  FAQ.forEach((entry) => {
    index.push({ type: "faq", terms: entry.keywords.map((k) => k.toLowerCase()), reply: entry.reply });
  });

  knowledgeIndex = index;
  return index;
}

function scoreEntry(text, entry) {
  let score = 0;
  entry.terms.forEach((term) => {
    if (term.length < 3) return;
    if (text.includes(term)) score += term.length;
  });
  return score;
}

function findMatches(message, limit = 3) {
  const index = buildIndex();
  const text = " " + message.toLowerCase().replace(/[^\w\s]/g, " ") + " ";
  const scored = index
    .map((entry) => ({ entry, score: scoreEntry(text, entry) }))
    .filter((s) => s.score >= 4)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

function buildLocalReply(entry) {
  if (entry.type === "faq") {
    return { text: entry.reply };
  }
  if (entry.type === "item") {
    const item = entry.item;
    return {
      text: `${item.name} — ${item.tag} In short: ${item.summary} Want to see the full step-by-step roadmap?`,
      action: { label: "Open " + item.name + " roadmap", cat: entry.cat, key: entry.key },
    };
  }
  if (entry.type === "node") {
    const d = entry.node.detail;
    const toolsLine = d.tools && d.tools.length ? ` Tools commonly used: ${d.tools.join(", ")}.` : "";
    return {
      text: `${entry.node.label} (part of the ${entry.item.name} roadmap): ${d.what} ${d.how} ${d.used}${toolsLine}`,
      action: { label: "Open " + entry.item.name + " roadmap", cat: entry.cat, key: entry.key },
    };
  }
  return { text: FALLBACK_REPLIES[0] };
}

function getFallback() {
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

function contextBlockFor(entries) {
  return entries
    .map((e) => {
      if (e.type === "faq") return `FAQ: ${e.reply}`;
      if (e.type === "item")
        return `ITEM "${e.item.name}" (${e.cat}): ${e.item.tag} ${e.item.summary} Roadmap stage count: ${e.item.stages.length}.`;
      if (e.type === "node") {
        const d = e.node.detail;
        return `TOPIC "${e.node.label}" from the ${e.item.name} roadmap — What: ${d.what} How: ${d.how} Used for: ${d.used} Related tools: ${(d.tools || []).join(", ")}`;
      }
      return "";
    })
    .join("\n");
}

async function callAnthropic(message, history, contextText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const system = `You are SkillBot, the AI agent embedded in skillsdev.ai — a site that teaches freelance skills, programming languages, and tools through roadmaps. Answer the user's question in a warm, concise, practical way (2-5 sentences unless more detail is clearly wanted). Ground your answer in the CONTEXT below when it's relevant; if the context doesn't cover the question, answer from general knowledge but stay focused on freelancing, skills, languages, and tools. Never invent specific pricing or guaranteed income figures.

CONTEXT:
${contextText || "(no directly matching entry found in the site's database)"}`;

  const messages = (history || [])
    .slice(-6)
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text || "").slice(0, 2000) }));
  messages.push({ role: "user", content: message });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || null;
}

/**
 * Main entry point used by the /api/chat route.
 * Always tries LOCAL matching first to find a linked action (roadmap deep link).
 * If an API key is configured, asks the LLM for the actual reply text so it
 * reads naturally and can handle follow-ups; otherwise falls back to the
 * canned local reply text. Either way, a matching roadmap link is attached
 * when the site's own database has something relevant.
 */
async function answer(message, history) {
  const matches = findMatches(message, 3);
  const best = matches[0] || null;
  const local = best ? buildLocalReply(best) : { text: getFallback() };
  const contextText = contextBlockFor(matches);

  let mode = "local";
  let text = local.text;

  try {
    const llmText = await callAnthropic(message, history, contextText);
    if (llmText) {
      text = llmText;
      mode = "llm";
    }
  } catch (err) {
    // Fall back silently to the local reply; surface the error only in logs.
    console.error("[SkillBot] Anthropic call failed, using local fallback:", err.message);
  }

  return {
    text,
    mode,
    action: local.action || null,
  };
}

module.exports = { answer, findMatches, buildIndex };
