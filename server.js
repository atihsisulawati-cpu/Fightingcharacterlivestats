const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "stats.json");
const ACTIVE_TIME = 45 * 1000;

let totalVisits = 0;
const visitors = new Map();

try {
  if (fs.existsSync(DATA_FILE)) {
    totalVisits =
      Number(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")).totalVisits) || 0;
  }
} catch (e) {
  console.log("Statistik dimulai dari nol.");
}

function cleanup() {
  const now = Date.now();
  for (const [id, time] of visitors) {
    if (now - time > ACTIVE_TIME) visitors.delete(id);
  }
}

function saveStats() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ totalVisits }, null, 2));
  } catch (e) {
    console.error("Gagal menyimpan statistik:", e.message);
  }
}

app.post("/api/heartbeat", (req, res) => {
  const id = String(req.body?.sessionId || "");

  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id)) {
    return res.status(400).json({ error: "Session ID tidak valid" });
  }

  cleanup();

  if (!visitors.has(id)) {
    totalVisits++;
    saveStats();
  }

  visitors.set(id, Date.now());
  res.json({ ok: true });
});

app.get("/api/stats", (req, res) => {
  cleanup();
  res.set("Cache-Control", "no-store");
  res.json({
    activeVisitors: visitors.size,
    totalVisits,
    updatedAt: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "online" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Fighting Character Live Stats server berjalan.");
  console.log("Port:", PORT);
});