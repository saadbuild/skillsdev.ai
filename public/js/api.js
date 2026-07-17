/* ============================================================
   skillsdev.ai — API client
   Thin fetch wrapper around the Express backend under /api/*
   ============================================================ */

const Api = (function () {
  const BASE = "/api";

  async function req(path, options) {
    const res = await fetch(BASE + path, options);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  return {
    meta: () => req("/meta"),
    items: (cat) => req(`/items/${cat}`),
    item: (cat, key) => req(`/item/${cat}/${key}`),
    roadmap: (cat, key) => req(`/roadmap/${cat}/${key}`),
    topic: (cat, key, nodeId) => req(`/topic/${cat}/${key}/${nodeId}`),
    search: (q) => req(`/search?q=${encodeURIComponent(q)}`),
    recommend: (interests) =>
      req("/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      }),
    chat: (message, history) =>
      req("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      }),
    health: () => req("/health"),
  };
})();
