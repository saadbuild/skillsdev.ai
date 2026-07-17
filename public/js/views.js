/* ============================================================
   skillsdev.ai — Views & router
   Hash-based routing over: / , /browse/:cat , /roadmap/:cat/:key ,
   /find-path , /help
   ============================================================ */

const Views = (function () {
  const CAT_LABEL = { skills: "Skills", languages: "Languages", tools: "Tools" };
  const CAT_DESC = {
    skills: "Freelance skills clients actually hire for — pick one to open its full roadmap.",
    languages: "Programming languages, from fundamentals to freelance-ready.",
    tools: "The software freelancers use day to day, explained from zero.",
  };

  let currentRoadmap = null; // { cat, key, data }
  let roadmapMode = "flow";
  let metaCache = null;

  /* ---------------- helpers ---------------- */
  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const el = document.getElementById("view-" + name);
    if (el) el.classList.add("active");
    document.querySelectorAll(".nav-item[data-route]").forEach((a) => a.classList.remove("active"));
  }

  function setActiveNav(route) {
    document.querySelectorAll(".nav-item[data-route]").forEach((a) => {
      const r = a.getAttribute("data-route");
      const match = r === "/" ? route === "/" : route.startsWith(r);
      a.classList.toggle("active", match);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------------- HOME ---------------- */
  async function renderHome() {
    showView("home");
    if (!metaCache) {
      try {
        metaCache = await Api.meta();
      } catch (e) {
        console.error(e);
        return;
      }
    }
    const c = metaCache.counts;
    const stats = document.getElementById("heroStats");
    stats.innerHTML = `
      <div class="hero-stat"><b>${c.skills + c.languages + c.tools}</b><span>Guided roadmaps</span></div>
      <div class="hero-stat"><b>${c.skills}·${c.languages}·${c.tools}</b><span>Skills · Languages · Tools</span></div>
      <div class="hero-stat"><b>24/7</b><span>SkillBot AI agent</span></div>
    `;

    const cards = document.getElementById("homeCategoryCards");
    cards.innerHTML = "";
    [
      { cat: "skills", initials: "SK", title: "Skills", desc: CAT_DESC.skills, count: c.skills },
      { cat: "languages", initials: "LN", title: "Languages", desc: CAT_DESC.languages, count: c.languages },
      { cat: "tools", initials: "TL", title: "Tools", desc: CAT_DESC.tools, count: c.tools },
    ].forEach((entry, i) => {
      const card = document.createElement("a");
      card.href = "#/browse/" + entry.cat;
      card.className = "glass item-card";
      card.setAttribute("data-cat", entry.cat);
      card.style.animationDelay = i * 0.06 + "s";
      card.innerHTML = `
        <div class="badge">${entry.initials}</div>
        <h3>${entry.title}</h3>
        <p>${entry.desc}</p>
        <span class="meta-row"><span>${entry.count} roadmaps</span><span class="view-link">Browse →</span></span>
      `;
      cards.appendChild(card);
    });
  }

  /* ---------------- BROWSE ---------------- */
  async function renderBrowse(cat) {
    cat = ["skills", "languages", "tools"].includes(cat) ? cat : "skills";
    showView("browse");
    document.getElementById("browseTitle").textContent = CAT_LABEL[cat];
    document.getElementById("browseDesc").textContent = CAT_DESC[cat];
    document.querySelectorAll(".cat-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("data-cat") === cat));

    const grid = document.getElementById("browseGrid");
    grid.innerHTML = '<div class="loading-row"><span class="spin"></span> Loading catalogue…</div>';
    try {
      const { items } = await Api.items(cat);
      grid.innerHTML = "";
      if (!items.length) {
        grid.innerHTML = '<div class="empty-state">Nothing here yet.</div>';
        return;
      }
      items.forEach((item, i) => {
        const card = document.createElement("button");
        card.className = "glass item-card";
        card.setAttribute("data-cat", cat);
        card.style.animationDelay = i * 0.04 + "s";
        card.innerHTML = `
          <div class="badge">${escapeHtml(item.initials)}</div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.tag)}</p>
          <span class="meta-row"><span>${item.stageCount} stages · ${item.topicCount} topics</span><span class="view-link">View roadmap →</span></span>
        `;
        card.addEventListener("click", () => {
          location.hash = `#/roadmap/${cat}/${item.key}`;
        });
        grid.appendChild(card);
      });
    } catch (e) {
      grid.innerHTML = `<div class="empty-state">Couldn't load ${cat}. Is the server running?</div>`;
      console.error(e);
    }
  }

  /* ---------------- ROADMAP ---------------- */
  async function renderRoadmap(cat, key) {
    showView("roadmap");
    const badge = document.getElementById("rmBadge");
    const title = document.getElementById("rmTitle");
    const summary = document.getElementById("rmSummary");
    const eyebrow = document.getElementById("rmEyebrow");
    const content = document.getElementById("rmContent");

    title.textContent = "Loading…";
    summary.textContent = "";
    content.innerHTML = '<div class="loading-row"><span class="spin"></span> Building roadmap…</div>';

    try {
      const data = await Api.roadmap(cat, key);
      currentRoadmap = { cat, key, data };

      badge.textContent = data.initials;
      const accent = cat === "skills" ? "var(--skills-a)" : cat === "languages" ? "var(--languages-a)" : "var(--tools-a)";
      badge.style.background = accent.replace("var(--", "rgba(").length ? "" : "";
      badge.style.color = accent;
      badge.style.background =
        cat === "skills" ? "rgba(139,107,255,.16)" : cat === "languages" ? "rgba(52,224,194,.16)" : "rgba(255,193,94,.16)";
      eyebrow.textContent = CAT_LABEL[cat] + " roadmap";
      title.textContent = data.name;
      summary.textContent = data.summary;

      renderCurrentRoadmapView();
      updateProgressBar();
    } catch (e) {
      title.textContent = "Not found";
      summary.textContent = "";
      content.innerHTML = `<div class="empty-state">Couldn't load this roadmap. <a href="#/browse/${cat}" style="color:var(--aurora-teal)">Go back to ${CAT_LABEL[cat] || "catalogue"}</a>.</div>`;
      console.error(e);
    }
  }

  function renderCurrentRoadmapView() {
    if (!currentRoadmap) return;
    const { cat, key, data } = currentRoadmap;
    const content = document.getElementById("rmContent");
    document.querySelectorAll(".view-toggle button").forEach((b) => b.classList.toggle("active", b.getAttribute("data-mode") === roadmapMode));
    if (roadmapMode === "flow") {
      Flowchart.renderFlow(content, cat, key, data.stages, openTopicDrawer);
    } else {
      Flowchart.renderSteps(content, cat, key, data.stages, openTopicDrawer);
    }
  }

  function updateProgressBar() {
    if (!currentRoadmap) return;
    const { cat, key, data } = currentRoadmap;
    const { total, done } = Flowchart.countLearned(cat, key, data.stages);
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById("rmProgressFill").style.width = pct + "%";
    document.getElementById("rmProgressLabel").textContent = `${pct}% (${done}/${total})`;
  }

  /* ---------------- TOPIC DRAWER ---------------- */
  let drawerNode = null;

  function openTopicDrawer(node) {
    drawerNode = node;
    const d = node.detail;
    document.getElementById("drawerEyebrow").textContent = currentRoadmap ? currentRoadmap.data.name + " · roadmap topic" : "Roadmap topic";
    document.getElementById("drawerTitle").textContent = node.label;
    document.getElementById("drawerEasy").textContent = d.easy || d.what;
    document.getElementById("drawerWhat").textContent = d.what;
    document.getElementById("drawerHow").textContent = d.how;
    document.getElementById("drawerUsed").textContent = d.used;
    const toolsEl = document.getElementById("drawerTools");
    toolsEl.innerHTML = "";
    (d.tools || []).forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = t;
      toolsEl.appendChild(chip);
    });
    const checkbox = document.getElementById("drawerLearnedCheckbox");
    if (currentRoadmap) {
      checkbox.checked = Flowchart.isLearned(currentRoadmap.cat, currentRoadmap.key, node.id);
    }
    document.getElementById("topicDrawer").classList.add("open");
    document.getElementById("drawerBackdrop").classList.add("open");
  }

  function closeTopicDrawer() {
    document.getElementById("topicDrawer").classList.remove("open");
    document.getElementById("drawerBackdrop").classList.remove("open");
  }

  function wireDrawer() {
    document.getElementById("drawerClose").addEventListener("click", closeTopicDrawer);
    document.getElementById("drawerBackdrop").addEventListener("click", closeTopicDrawer);
    document.getElementById("drawerLearnedCheckbox").addEventListener("change", (e) => {
      if (!currentRoadmap || !drawerNode) return;
      Flowchart.setLearned(currentRoadmap.cat, currentRoadmap.key, drawerNode.id, e.target.checked);
      renderCurrentRoadmapView();
      updateProgressBar();
    });
  }

  function wireRoadmapToggle() {
    document.querySelectorAll(".view-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        roadmapMode = btn.getAttribute("data-mode");
        renderCurrentRoadmapView();
      });
    });
  }

  function wireCatTabs() {
    document.querySelectorAll(".cat-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        location.hash = "#/browse/" + tab.getAttribute("data-cat");
      });
    });
  }

  /* ---------------- FIND MY PATH ---------------- */
  const selectedInterests = new Set();

  async function renderFindPath() {
    showView("find-path");
    if (!metaCache) {
      try {
        metaCache = await Api.meta();
      } catch (e) {
        console.error(e);
      }
    }
    const grid = document.getElementById("interestGrid");
    if (metaCache && !grid.dataset.built) {
      grid.dataset.built = "1";
      grid.innerHTML = "";
      metaCache.interestOptions.forEach((opt) => {
        const chip = document.createElement("button");
        chip.className = "glass interest-chip";
        chip.textContent = opt.label;
        chip.setAttribute("data-id", opt.id);
        chip.addEventListener("click", () => {
          if (selectedInterests.has(opt.id)) {
            selectedInterests.delete(opt.id);
            chip.classList.remove("selected");
          } else {
            selectedInterests.add(opt.id);
            chip.classList.add("selected");
          }
        });
        grid.appendChild(chip);
      });
    }
  }

  function renderFindPathResults(rec) {
    const wrap = document.getElementById("findPathResults");
    wrap.innerHTML = "";
    const slots = [
      { key: "skill", label: "Start skill" },
      { key: "language", label: "Start language" },
      { key: "tool", label: "Start tool" },
    ];
    slots.forEach((slot) => {
      const r = rec[slot.key];
      const card = document.createElement("div");
      card.className = "glass result-card";
      if (!r) {
        card.innerHTML = `<span class="eyebrow">${slot.label}</span><p>No strong match — try selecting a different interest.</p>`;
      } else {
        card.innerHTML = `
          <span class="eyebrow">${slot.label}</span>
          <h3>${escapeHtml(r.name)}</h3>
          <p>${escapeHtml(r.tag)}</p>
          <a href="#/roadmap/${r.cat}/${r.key}" class="btn btn-ghost btn-sm">Open roadmap →</a>
        `;
      }
      wrap.appendChild(card);
    });
  }

  function wireFindPathButton() {
    document.getElementById("findPathBtn").addEventListener("click", async () => {
      if (!selectedInterests.size) {
        alert("Pick at least one interest first.");
        return;
      }
      const btn = document.getElementById("findPathBtn");
      btn.disabled = true;
      btn.textContent = "Thinking…";
      try {
        const res = await Api.recommend(Array.from(selectedInterests));
        renderFindPathResults(res.recommendation);
      } catch (e) {
        console.error(e);
      } finally {
        btn.disabled = false;
        btn.textContent = "Suggest my path →";
      }
    });
  }

  /* ---------------- HELP / FAQ ---------------- */
  const FAQ_STATIC = [
    { q: "Is this free to use?", a: "Yes — every roadmap, topic explanation, and SkillBot conversation is free. There are no accounts or paywalls." },
    { q: "How is my progress saved?", a: "Ticking \"Mark as learned\" on a topic saves it in your browser's local storage — it persists on this device without needing an account, but won't follow you to another browser." },
    { q: "How long does it take to learn a skill?", a: "It varies, but most people reach a freelance-ready basic level within 2-4 months of consistent practice, and become competitive within 6-12 months." },
    { q: "Where do I actually find freelance clients?", a: "Upwork and Fiverr are the two biggest general platforms. Contra and Toptal suit more experienced freelancers. LinkedIn outreach and a simple portfolio also work well." },
    { q: "Is SkillBot a real AI?", a: "SkillBot always answers using this site's own skills/languages/tools database. If the server has an API key configured, it also uses a large language model for more natural, open-ended answers — otherwise it uses fast local keyword matching." },
  ];

  function renderHelp() {
    showView("help");
    const list = document.getElementById("faqList");
    if (list.dataset.built) return;
    list.dataset.built = "1";
    list.innerHTML = "";
    FAQ_STATIC.forEach((f) => {
      const item = document.createElement("div");
      item.className = "glass faq-item";
      item.innerHTML = `<h4>${f.q}<span>+</span></h4><div class="faq-a">${f.a}</div>`;
      item.addEventListener("click", () => item.classList.toggle("open"));
      list.appendChild(item);
    });
  }

  /* ---------------- SEARCH ---------------- */
  function wireSearchPair(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    if (!input || !results) return;
    let searchTimer = null;

    input.addEventListener("input", () => {
      clearTimeout(searchTimer);
      const q = input.value.trim();
      if (!q) {
        results.classList.remove("open");
        return;
      }
      searchTimer = setTimeout(async () => {
        try {
          const { results: hits } = await Api.search(q);
          results.innerHTML = "";
          if (!hits.length) {
            results.innerHTML = '<div class="search-result-row">No matches.</div>';
          } else {
            hits.slice(0, 12).forEach((hit) => {
              const row = document.createElement("div");
              row.className = "search-result-row";
              if (hit.type === "item") {
                row.innerHTML = `<span class="sr-type">${hit.cat}</span><span>${escapeHtml(hit.name)}</span>`;
                row.addEventListener("click", () => {
                  location.hash = `#/roadmap/${hit.cat}/${hit.key}`;
                  results.classList.remove("open");
                  input.value = "";
                  if (window.closeMobileMenu) window.closeMobileMenu();
                });
              } else {
                row.innerHTML = `<span class="sr-type">${hit.cat} topic</span><span>${escapeHtml(hit.label)} — ${escapeHtml(hit.itemName)}</span>`;
                row.addEventListener("click", () => {
                  location.hash = `#/roadmap/${hit.cat}/${hit.key}`;
                  results.classList.remove("open");
                  input.value = "";
                  if (window.closeMobileMenu) window.closeMobileMenu();
                });
              }
              results.appendChild(row);
            });
          }
          results.classList.add("open");
        } catch (e) {
          console.error(e);
        }
      }, 250);
    });

    document.addEventListener("click", (e) => {
      if (!results.contains(e.target) && e.target !== input) results.classList.remove("open");
    });
  }

  function wireSearch() {
    wireSearchPair("searchInput", "searchResults");
    wireSearchPair("searchInputMobile", "searchResultsMobile");
  }

  /* ---------------- ROUTER ---------------- */
  function parseRoute() {
    const hash = location.hash.replace(/^#/, "") || "/";
    return hash;
  }

  async function handleRoute() {
    const route = parseRoute();
    setActiveNav(route);
    if (window.closeMobileMenu) window.closeMobileMenu();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    if (route === "/" || route === "") {
      await renderHome();
    } else if (route.startsWith("/browse/")) {
      await renderBrowse(route.split("/")[2]);
    } else if (route.startsWith("/roadmap/")) {
      const parts = route.split("/");
      await renderRoadmap(parts[2], parts[3]);
    } else if (route === "/find-path") {
      await renderFindPath();
    } else if (route === "/help") {
      renderHelp();
    } else {
      await renderHome();
    }
  }

  function init() {
    wireDrawer();
    wireRoadmapToggle();
    wireCatTabs();
    wireFindPathButton();
    wireSearch();

    document.getElementById("footerYear").textContent = new Date().getFullYear();

    window.addEventListener("hashchange", handleRoute);
    handleRoute();
  }

  return { init, openTopicDrawer };
})();
