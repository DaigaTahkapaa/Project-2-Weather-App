// =====================================================================
// === 1. DOM ELEMENT REFERENCES: Connect JavaScript to HTML elements ===
// =====================================================================

//grid: container for displaying country cards
const grid = document.getElementById("grid");
//q: search input field
const q = document.getElementById("q");
//status: area for showing messages
const statusMessage = document.getElementById("status");

// Country codes to full country names
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// Debounce utility to limit call frequency
function debounce(fn, wait = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

// Call the server proxy to get locations for a query string.
// For now this just logs the parsed JSON to the console.
async function GetLocations(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return null;

  try {
    const url = `http://localhost:3000/api/geocode?q=${encodeURIComponent(
      trimmed
    )}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Geocode proxy returned", resp.status);
      return null;
    }
    const json = await resp.json();
    console.log("GetLocations response:", json);
    return json;
  } catch (err) {
    console.error("GetLocations network/error:", err);
    return null;
  }
}

// Helper: attach a debounced listener to #q. Calls `callback(trimmedValue)` after `wait` ms of inactivity.
function addDebouncedInputListener(callback, wait = 350) {
  if (!q || typeof callback !== "function") return () => {};

  const handler = debounce((evt) => {
    const val =
      evt && evt.target && typeof evt.target.value === "string"
        ? evt.target.value.trim()
        : q.value.trim();
    callback(val);
  }, wait);

  q.addEventListener("input", handler);
  return () => q.removeEventListener("input", handler);
}

// Wire the debounced input to call GetLocations and log results (350ms)
addDebouncedInputListener((value) => {
  if (value) GetLocations(value);
}, 350);
