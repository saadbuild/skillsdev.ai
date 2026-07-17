/* ============================================================
   skillsdev.ai — Roadmap flowchart & step-list renderer
   Renders a stage-by-stage diagram (flowchart) or a linear
   step list from { stages: [[node,...], ...] } roadmap data.
   Progress is tracked per-topic in localStorage.
   ============================================================ */

const Flowchart = (function () {
  const PROGRESS_KEY = "skillsdev_progress_v2";

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }
  function saveProgress(p) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    } catch (e) {}
  }
  function progressKey(cat, key, nodeId) {
    return `${cat}:${key}:${nodeId}`;
  }
  function isLearned(cat, key, nodeId) {
    return !!loadProgress()[progressKey(cat, key, nodeId)];
  }
  function setLearned(cat, key, nodeId, val) {
    const p = loadProgress();
    if (val) p[progressKey(cat, key, nodeId)] = true;
    else delete p[progressKey(cat, key, nodeId)];
    saveProgress(p);
  }
  function countLearned(cat, key, stages) {
    const p = loadProgress();
    let total = 0,
      done = 0;
    stages.forEach((stage) =>
      stage.forEach((node) => {
        total++;
        if (p[progressKey(cat, key, node.id)]) done++;
      })
    );
    return { total, done };
  }

  function accentClass(cat) {
    return cat === "skills" ? "skills" : cat === "languages" ? "languages" : "tools";
  }

  function renderFlow(container, cat, key, stages, onNodeClick) {
    container.innerHTML = "";
    container.className = "roadmap-flow rm-" + accentClass(cat);
    let counter = 0;
    stages.forEach((stage, sIdx) => {
      const stageEl = document.createElement("div");
      stageEl.className = "roadmap-stage";

      const idxEl = document.createElement("div");
      idxEl.className = "stage-index";
      idxEl.textContent = String(sIdx + 1).padStart(2, "0");
      stageEl.appendChild(idxEl);

      const nodesEl = document.createElement("div");
      nodesEl.className = "stage-nodes";

      stage.forEach((node) => {
        counter++;
        const done = isLearned(cat, key, node.id);
        const nodeEl = document.createElement("button");
        nodeEl.className = "flow-node glass" + (done ? " done" : "");
        nodeEl.innerHTML = `
          <span class="fn-num">STEP ${String(counter).padStart(2, "0")}</span>
          <h4>${escapeHtml(node.label)}</h4>
          <p>${escapeHtml(node.detail.what)}</p>
          <span class="fn-check"></span>
        `;
        nodeEl.addEventListener("click", () => onNodeClick(node));
        nodesEl.appendChild(nodeEl);
      });

      stageEl.appendChild(nodesEl);
      container.appendChild(stageEl);
    });
  }

  function renderSteps(container, cat, key, stages, onNodeClick) {
    container.innerHTML = "";
    const list = document.createElement("div");
    list.className = "roadmap-steps";
    let counter = 0;
    stages.forEach((stage) => {
      stage.forEach((node) => {
        counter++;
        const done = isLearned(cat, key, node.id);
        const row = document.createElement("div");
        row.className = "step-row glass";
        if (done) row.style.borderColor = "var(--aurora-teal)";
        row.innerHTML = `
          <span class="step-num">${String(counter).padStart(2, "0")}</span>
          <div class="step-body">
            <h4>${escapeHtml(node.label)}${done ? " ✓" : ""}</h4>
            <p>${escapeHtml(node.detail.what)}</p>
          </div>
        `;
        row.addEventListener("click", () => onNodeClick(node));
        list.appendChild(row);
      });
    });
    container.appendChild(list);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  return { renderFlow, renderSteps, isLearned, setLearned, countLearned };
})();
