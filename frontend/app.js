// =====================================================================
// === 1. DOM ELEMENT REFERENCES: Connect JavaScript to HTML elements ===
// =====================================================================

//grid: container for displaying country cards
const grid = document.getElementById("grid");
//q: search input field
const q = document.getElementById("q");
//status: area for showing messages
const statusMessage = document.getElementById("status");

// =====================================================================
// === 2. HELPER FUNCTIONS ===
// =====================================================================

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

// Remove exact-duplicate locations (same name + country + state), keep the first.
function dedupeLocations(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const name = String(it.name || "")
      .trim()
      .toLowerCase();
    const country = String(it.country || "")
      .trim()
      .toLowerCase();
    const state = String(it.state || "")
      .trim()
      .toLowerCase();
    const key = `${name}|${country}|${state}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// Call the server proxy to get locations for a query string.
// For now this just logs the parsed JSON to the console.
async function GetLocations(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return null;
  // prevent race conditions: track lastQuery and use AbortController
  lastQuery = trimmed;

  // abort previous request if still pending
  if (geocodeController) {
    geocodeController.abort();
  }
  geocodeController = new AbortController();
  const { signal } = geocodeController;

  try {
    // update status to searching
    if (statusMessage) {
      statusMessage.textContent = `Searching for "${trimmed}"...`;
      statusMessage.setAttribute("aria-live", "polite");
      statusMessage.classList.remove("status-warning");
    }

    const url = `http://localhost:3000/api/geocode?q=${encodeURIComponent(
      trimmed
    )}`;
    console.log("GetLocations ->", url);
    const resp = await fetch(url, { signal });
    console.log("GetLocations <- status", resp.status, "for", trimmed);
    if (!resp.ok) {
      console.error("Geocode proxy returned", resp.status);
      if (trimmed === lastQuery) {
        if (statusMessage) {
          statusMessage.textContent =
            "Failed to fetch locations. Please try again.";
          statusMessage.setAttribute("aria-live", "assertive");
          statusMessage.classList.add("status-warning");
        }
        clearSuggestions();
      }
      return null;
    }
    const json = await resp.json();
    // dedupe identical name+country+state entries before using
    const deduped = dedupeLocations(json);
    // only render if query remains current
    if (trimmed === lastQuery) {
      if (Array.isArray(deduped) && deduped.length === 0) {
        // no matching locations
        if (statusMessage) {
          statusMessage.textContent =
            "There are no locations matching your search term";
          statusMessage.setAttribute("aria-live", "assertive");
          statusMessage.classList.add("status-warning");
        }
        renderSuggestions(deduped);
      } else {
        // success: clear status and show suggestions
        if (statusMessage) {
          statusMessage.textContent = "";
          statusMessage.setAttribute("aria-live", "polite");
          statusMessage.classList.remove("status-warning");
        }
        renderSuggestions(deduped);
      }
    }
    return deduped;
  } catch (err) {
    if (err.name === "AbortError") {
      // expected when a newer request started; ignore silently
      console.log("GetLocations aborted for", trimmed);
      return null;
    }
    console.error("GetLocations network/error:", err);
    if (trimmed === lastQuery) {
      if (statusMessage) {
        statusMessage.textContent =
          "Failed to fetch locations. Please try again.";
        statusMessage.setAttribute("aria-live", "assertive");
        statusMessage.classList.add("status-warning");
      }
      clearSuggestions();
    }
    return null;
  } finally {
    // clear controller if it is the same one we created
    if (geocodeController && geocodeController.signal === signal) {
      geocodeController = null;
    }
  }
}

// ---- Suggestions UI state & helpers ----
let currentSuggestions = [];
let highlightedIndex = -1;
let geocodeController = null;
let lastQuery = "";
const suggestionsEl = document.getElementById("suggestions");

function clearSuggestions() {
  if (!suggestionsEl) return;
  suggestionsEl.innerHTML = "";
  suggestionsEl.style.display = "none";
  q.setAttribute("aria-expanded", "false");
  q.removeAttribute("aria-activedescendant");
  currentSuggestions = [];
  highlightedIndex = -1;
}

function renderSuggestions(items = []) {
  if (!suggestionsEl) return;
  suggestionsEl.innerHTML = "";
  currentSuggestions = Array.isArray(items) ? items : [];

  if (currentSuggestions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "suggestion-item";
    empty.textContent = "No matches";
    empty.setAttribute("role", "option");
    empty.setAttribute("aria-selected", "false");
    suggestionsEl.appendChild(empty);
    suggestionsEl.style.display = "block";
    q.setAttribute("aria-expanded", "true");
    return;
  }

  currentSuggestions.forEach((it, idx) => {
    const el = document.createElement("div");
    el.className = "suggestion-item";
    el.setAttribute("role", "option");
    el.setAttribute("data-idx", String(idx));
    el.setAttribute("id", `suggestion-${idx}`);
    el.setAttribute("aria-selected", "false");
    const countryText = it.country
      ? regionNames.of(it.country) || it.country
      : "";
    const stateText = it.state ? `, ${it.state}` : "";
    el.innerHTML = `<span class="loc-name">${it.name}</span><span class="loc-meta">${countryText}${stateText}</span>`;
    el.addEventListener("click", () => selectSuggestion(idx));
    el.addEventListener("mousemove", () => setHighlight(idx));
    suggestionsEl.appendChild(el);
  });

  suggestionsEl.style.display = "block";
  q.setAttribute("aria-expanded", "true");
  highlightedIndex = -1;
}

function setHighlight(index) {
  if (!suggestionsEl) return;
  const items = suggestionsEl.querySelectorAll(".suggestion-item");
  items.forEach((el) => el.classList.remove("highlighted"));
  items.forEach((el) => el.setAttribute("aria-selected", "false"));
  if (index >= 0 && index < items.length) {
    items[index].classList.add("highlighted");
    items[index].setAttribute("aria-selected", "true");
    q.setAttribute("aria-activedescendant", items[index].id);
    highlightedIndex = index;
    items[index].scrollIntoView({ block: "nearest" });
  } else {
    q.removeAttribute("aria-activedescendant");
    highlightedIndex = -1;
  }
}

function selectSuggestion(index) {
  if (!currentSuggestions || index < 0 || index >= currentSuggestions.length)
    return;
  const sel = currentSuggestions[index];
  q.value = `${sel.name}${sel.country ? ", " + sel.country : ""}${
    sel.state ? ", " + sel.state : ""
  }`;
  clearSuggestions();
  // You can now call your weather lookup with sel.lat / sel.lon
  console.log("Selected location:", sel);
}

// Keyboard interaction for input
q.addEventListener("keydown", (ev) => {
  if (!suggestionsEl || suggestionsEl.style.display === "none") return;
  const items = suggestionsEl.querySelectorAll(".suggestion-item");
  if (!items.length) return;

  if (ev.key === "ArrowDown") {
    ev.preventDefault();
    const next = highlightedIndex + 1 < items.length ? highlightedIndex + 1 : 0;
    setHighlight(next);
  } else if (ev.key === "ArrowUp") {
    ev.preventDefault();
    const next =
      highlightedIndex - 1 >= 0 ? highlightedIndex - 1 : items.length - 1;
    setHighlight(next);
  } else if (ev.key === "Enter") {
    ev.preventDefault();
    if (highlightedIndex >= 0) {
      selectSuggestion(highlightedIndex);
    } else {
      clearSuggestions();
    }
  } else if (ev.key === "Escape") {
    clearSuggestions();
  }
});

// Close suggestions when clicking outside
document.addEventListener("click", (ev) => {
  if (!suggestionsEl) return;
  if (ev.target === q || suggestionsEl.contains(ev.target)) return;
  clearSuggestions();
});

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
  if (!value) {
    clearSuggestions();
    if (statusMessage) {
      statusMessage.textContent = "";
      statusMessage.setAttribute("aria-live", "polite");
      statusMessage.classList.remove("status-warning");
    }
    return;
  }
  GetLocations(value);
}, 350);
