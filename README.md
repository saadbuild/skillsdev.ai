# skillsdev.ai — Full-Stack Edition

A complete website for exploring freelance **Skills**, **Languages**, and **Tools**
through interactive roadmap diagrams — with a real Node/Express backend and an
**AI agent (SkillBot)** built in.

- **Frontend:** Aurora-themed, glassmorphic UI (vanilla HTML/CSS/JS, no build step) —
  animated aurora background, a browsable catalogue, flowchart *and* step-list
  roadmap views, a topic detail drawer, a "Find My Path" recommendation tool,
  live search, and a floating AI chat widget.
- **Backend:** Node.js + Express REST API serving all content, a recommendation
  engine, and a chat endpoint for SkillBot.
- **AI agent:** SkillBot always answers using this site's own knowledge base
  (15 skills, 8 languages, 15 tools, 270+ roadmap topics). If you add an
  Anthropic API key, it upgrades to a full conversational LLM that reasons
  over that same knowledge base — otherwise it runs 100% free, offline-capable
  local keyword matching. No feature is ever broken by not having a key.

---

## 1. Run it

```bash
npm install
npm start
```

Then open **http://localhost:3000** — the frontend and API are served from
the same process (no CORS setup needed).

Requires Node.js 18+.

### Enable the full LLM-powered AI agent (optional)

By default SkillBot uses fast local matching against the site's database —
free, no setup, works offline. To upgrade it to a real conversational LLM:

1. Copy `.env.example` to `.env`
2. Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart the server (`npm start`)

The `/api/health` endpoint reports which mode is active, and the chat panel
header updates to say "Claude, grounded on site data" once it's on.

---

## 2. What's inside

```
package.json
.env.example
server/
  index.js          Express app: mounts the API, serves the frontend, health check
  data.js           ALL content — every skill/language/tool, roadmap stages,
                     topic explanations, FAQ, and recommendation rules
  chatEngine.js      SkillBot: local knowledge-base matching + optional LLM call
  routes/
    api.js           REST endpoints (see below)
public/
  index.html         Single-page app shell (hash-routed)
  css/style.css       Aurora design system: tokens, animated background, components
  js/
    api.js            Fetch wrapper for the backend
    flowchart.js       Renders roadmap stages as a flowchart or a step list;
                        tracks "learned" progress in localStorage
    views.js           Router + all page views (home, browse, roadmap, find-path, help, search)
    chat.js             SkillBot widget UI
    main.js             Bootstraps everything, animates the hero diagram
```

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/meta` | Category labels, counts, "Find My Path" interest options |
| GET | `/api/items/:cat` | All items in `skills` \| `languages` \| `tools` |
| GET | `/api/item/:cat/:key` | One item's summary card |
| GET | `/api/roadmap/:cat/:key` | Full roadmap (stages + every topic's detail) |
| GET | `/api/topic/:cat/:key/:nodeId` | One roadmap topic's detail |
| GET | `/api/search?q=` | Search across every item and topic |
| POST | `/api/recommend` | Body `{ interests: [ids] }` → suggested skill/language/tool |
| POST | `/api/chat` | Body `{ message, history }` → SkillBot's reply |
| GET | `/api/health` | Server status + current AI mode |

---

## 3. Adding or editing content

Everything content-related lives in **`server/data.js`** — every skill,
language, tool, its roadmap stages, topic explanations, the chatbot FAQ, and
the recommendation rules. You don't need to touch any route, view, or
rendering file to add a new roadmap. Follow the existing `N(id, label, what,
how, used, tools)` helper pattern used throughout the file for each roadmap
node, and add a new top-level key under `DATA.skills`, `DATA.languages`, or
`DATA.tools` following the shape of its neighbors.

The frontend never hardcodes content — it fetches everything from the API,
so any change to `data.js` shows up immediately after a server restart.

---

## 4. Deploying

This is a normal Node/Express app — deploy it anywhere that runs Node
(Render, Railway, Fly.io, a VPS with PM2, etc.):

```bash
npm install --production
ANTHROPIC_API_KEY=sk-ant-... PORT=3000 npm start
```

There's no database and no build step — `server/data.js` is the entire data
layer, and the frontend is static files served by Express.

---

## 5. Progress tracking

Ticking "Mark this topic as learned" in a roadmap's topic drawer saves that
per browser in `localStorage` — progress persists between visits on the same
device without needing user accounts. This is intentionally client-side and
free; wiring it to real accounts would mean adding a database and auth,
which this template deliberately keeps out to stay zero-cost to run.

---

## Contact

saaadi9056@gmail.com
