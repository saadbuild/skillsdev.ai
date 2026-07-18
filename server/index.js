require("dotenv").config();
const path = require("path");
const express = require("express");
const apiRouter = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "200kb" }));

// Simple request log
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use("/api", apiRouter);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiMode: process.env.ANTHROPIC_API_KEY ? "llm+local" : "local-only",
    time: new Date().toISOString(),
  });
});

// Static Aurora frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// SPA-style fallback for any non-API route
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

if (require.main === module) {
  app.listen(PORT, () => { ... });
}
module.exports = app;
