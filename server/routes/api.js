const express = require("express");
const router = express.Router();
const { DATA, RECOMMEND_RULES, INTEREST_OPTIONS } = require("../data");
const chatEngine = require("../chatEngine");

const CATS = ["skills", "languages", "tools"];

function isValidCat(cat) {
  return CATS.includes(cat);
}

function toCard(cat, key) {
  const item = DATA[cat][key];
  return {
    cat,
    key,
    name: item.name,
    tag: item.tag,
    initials: item.initials,
    summary: item.summary,
    stageCount: item.stages.length,
    topicCount: item.stages.reduce((n, s) => n + s.length, 0),
  };
}

/* ---------- Meta ---------- */
router.get("/meta", (req, res) => {
  res.json({
    meta: DATA.meta,
    counts: {
      skills: Object.keys(DATA.skills).length,
      languages: Object.keys(DATA.languages).length,
      tools: Object.keys(DATA.tools).length,
    },
    interestOptions: INTEREST_OPTIONS,
  });
});

/* ---------- List all items in a category ---------- */
router.get("/items/:cat", (req, res) => {
  const { cat } = req.params;
  if (!isValidCat(cat)) return res.status(404).json({ error: `Unknown category "${cat}"` });
  const items = Object.keys(DATA[cat]).map((key) => toCard(cat, key));
  res.json({ cat, items });
});

/* ---------- Single item summary ---------- */
router.get("/item/:cat/:key", (req, res) => {
  const { cat, key } = req.params;
  if (!isValidCat(cat)) return res.status(404).json({ error: `Unknown category "${cat}"` });
  const item = DATA[cat][key];
  if (!item) return res.status(404).json({ error: `"${key}" not found in ${cat}` });
  res.json({ cat, key, ...toCard(cat, key) });
});

/* ---------- Full roadmap (stages + nodes + detail) ---------- */
router.get("/roadmap/:cat/:key", (req, res) => {
  const { cat, key } = req.params;
  if (!isValidCat(cat)) return res.status(404).json({ error: `Unknown category "${cat}"` });
  const item = DATA[cat][key];
  if (!item) return res.status(404).json({ error: `"${key}" not found in ${cat}` });
  res.json({
    cat,
    key,
    name: item.name,
    tag: item.tag,
    initials: item.initials,
    summary: item.summary,
    stages: item.stages,
  });
});

/* ---------- Single topic/node detail ---------- */
router.get("/topic/:cat/:key/:nodeId", (req, res) => {
  const { cat, key, nodeId } = req.params;
  if (!isValidCat(cat)) return res.status(404).json({ error: `Unknown category "${cat}"` });
  const item = DATA[cat][key];
  if (!item) return res.status(404).json({ error: `"${key}" not found in ${cat}` });
  let found = null;
  item.stages.forEach((stage) => stage.forEach((n) => { if (n.id === nodeId) found = n; }));
  if (!found) return res.status(404).json({ error: `Topic "${nodeId}" not found` });
  res.json({ cat, key, itemName: item.name, node: found });
});

/* ---------- Search across everything ---------- */
router.get("/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  if (!q) return res.json({ query: q, results: [] });
  const results = [];
  CATS.forEach((cat) => {
    Object.keys(DATA[cat]).forEach((key) => {
      const item = DATA[cat][key];
      if (item.name.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q)) {
        results.push({ type: "item", cat, key, name: item.name, tag: item.tag, initials: item.initials });
      }
      item.stages.forEach((stage) =>
        stage.forEach((node) => {
          if (node.label.toLowerCase().includes(q) || node.detail.what.toLowerCase().includes(q)) {
            results.push({ type: "topic", cat, key, itemName: item.name, nodeId: node.id, label: node.label });
          }
        })
      );
    });
  });
  res.json({ query: q, results: results.slice(0, 40) });
});

/* ---------- Recommendation engine ("Find My Path") ---------- */
router.post("/recommend", (req, res) => {
  const interests = Array.isArray(req.body.interests) ? req.body.interests : [];
  if (!interests.length) return res.status(400).json({ error: "Provide at least one interest id." });

  const tally = {};
  interests.forEach((id) => {
    const rule = RECOMMEND_RULES[id];
    if (!rule) return;
    ["skill", "language", "tool"].forEach((slot) => {
      const key = `${slot}:${rule[slot]}`;
      tally[key] = (tally[key] || 0) + 1;
    });
  });

  function topOf(slot) {
    const entries = Object.entries(tally).filter(([k]) => k.startsWith(slot + ":"));
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const key = entries[0][0].split(":")[1];
    const cat = slot === "skill" ? "skills" : slot === "language" ? "languages" : "tools";
    return { cat, key, ...toCard(cat, key) };
  }

  res.json({
    interests,
    recommendation: {
      skill: topOf("skill"),
      language: topOf("language"),
      tool: topOf("tool"),
    },
  });
});

/* ---------- AI agent chat ---------- */
router.post("/chat", async (req, res) => {
  const message = String(req.body.message || "").trim();
  const history = Array.isArray(req.body.history) ? req.body.history : [];
  if (!message) return res.status(400).json({ error: "Message is required." });

  try {
    const reply = await chatEngine.answer(message, history);
    res.json(reply);
  } catch (err) {
    console.error("[api/chat] error:", err);
    res.status(500).json({ error: "SkillBot hit an internal error." });
  }
});

module.exports = router;
