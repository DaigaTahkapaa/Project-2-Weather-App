// Minimal Express proxy for OpenWeather (geocode + weather)
import express from "express";
import fetch from "node-fetch"; // if Node < 18; otherwise use global fetch
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
// Enable CORS for cross-origin requests from your frontend dev server
app.use(cors());
const PORT = process.env.PORT || 3000;
const KEY = process.env.OPENWEATHER_API_KEY;
if (!KEY) {
  console.warn("OPENWEATHER_API_KEY is not set in env; proxy will fail.");
}

// server/index.js
app.get("/api/geocode", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Missing query param q" });

  // hard-code the limit on server side:
  const limit = 5;

  // Build the upstream URL using URL and URLSearchParams to ensure proper encoding:
  const upstream = new URL("https://api.openweathermap.org/geo/1.0/direct");
  upstream.search = new URLSearchParams({
    q, // raw string from req.query (will be encoded by URLSearchParams in app.js)
    limit: String(limit), // server-enforced
    appid: KEY, // secret from process.env
  }).toString();

  try {
    const r = await fetch(upstream.toString());
    if (!r.ok)
      return res
        .status(502)
        .json({ error: "Upstream error", status: r.status });
    const json = await r.json();
    // Return only the needed fields (name, lat, lon, country, state).
    res.json(
      json.map((item) => ({
        name: item.name,
        lat: item.lat,
        lon: item.lon,
        country: item.country,
        state: item.state || null,
      }))
    );
  } catch (err) {
    console.error("Proxy error", err);
    res.status(500).json({ error: "Proxy failed" });
  }
});

// Proxy to OpenWeather One Call (returns full weather payload). Backend adds the API key.
app.get("/api/weather", async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const units = String(req.query.units || "metric");
  const exclude = String(req.query.exclude || "minutely");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "Missing or invalid lat/lon" });
  }

  const upstream = new URL("https://api.openweathermap.org/data/3.0/onecall");
  upstream.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    units: units,
    exclude: exclude,
    appid: KEY,
  }).toString();

  try {
    const r = await fetch(upstream.toString());
    if (!r.ok)
      return res
        .status(502)
        .json({ error: "Upstream error", status: r.status });
    const json = await r.json();
    // Return full payload (no mapping) — frontend will decide what to read.
    res.json(json);
  } catch (err) {
    console.error("Weather proxy error", err);
    res.status(500).json({ error: "Proxy failed" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});
