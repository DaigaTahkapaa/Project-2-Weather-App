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

// --- Time helpers for OpenWeather One Call (dt is seconds) ---
// Convert OpenWeather dt (seconds) + timezone offset (seconds) -> JS Date
function toLocalDate(dtSeconds, timezoneOffsetSeconds = 0) {
  // dtSeconds + timezoneOffsetSeconds -> seconds since epoch in target timezone
  return new Date((Number(dtSeconds) + Number(timezoneOffsetSeconds)) * 1000);
}

// 1) Daily: short weekday + Month name + day + year
// Example: "Fri, November 28, 2025"
function formatDaily(dtSeconds, timezoneOffsetSeconds = 0, locale = "en-US") {
  const d = toLocalDate(dtSeconds, timezoneOffsetSeconds);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// 2) Current full: Month day year + time HH:MM:SS and raw timestamp (ms)
// Example.formatted: "November 28 2025 00:00:00"
function formatCurrentFull(
  dtSeconds,
  timezoneOffsetSeconds = 0,
  locale = "en-US"
) {
  const d = toLocalDate(dtSeconds, timezoneOffsetSeconds);
  const datePart = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC", // not using IANA timezone; we've already applied offset
  }).format(new Date(d.toISOString())); // safe canonicalization
  return { formatted: `${datePart} ${timePart}`, timestampMs: d.getTime() };
}

// 3) Hourly compact: short weekday, full month name, day, HH:MM
// Example: "Fri, November 28 12:00"
function formatHourly(dtSeconds, timezoneOffsetSeconds = 0, locale = "en-US") {
  const d = toLocalDate(dtSeconds, timezoneOffsetSeconds);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// Convert winf direction degrees to compass wind direction
function windDirection(deg) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  // 360° / 16 = 22.5° per sector
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
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

// Helper: format only time (HH:MM:SS) for a dt + timezone offset (place local time)
function formatTimeOnly(
  dtSeconds,
  timezoneOffsetSeconds = 0,
  locale = "en-US"
) {
  const d = toLocalDate(dtSeconds, timezoneOffsetSeconds);
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(d.toISOString()));
}

// Helper: format a dtSeconds into the user's local date+time string (their timezone)
function formatUserLocalFromDt(
  dtSeconds,
  locale = navigator.language || "en-US"
) {
  const d = new Date(Number(dtSeconds) * 1000);
  const datePart = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart} ${timePart} (Local time)`;
}

// Format a millisecond timestamp to user-local date/time string
function formatUserLocalFromMs(ms, locale = navigator.language || "en-US") {
  const d = new Date(Number(ms));
  const datePart = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart} ${timePart} (Local time)`;
}

// Format user-local full datetime without suffix
function formatUserLocalFullFromMs(ms, locale = navigator.language || "en-US") {
  const d = new Date(Number(ms));
  const datePart = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart} ${timePart}`;
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
// Refresh control state: track when refresh is disabled until (ms) and last refresh timestamp (ms)
let refreshDisabledUntil = 0;
let lastRefreshTs = 0; // time when manual refresh was initiated (ms)
let lastFetchedTs = 0; // time when any successful fetch returned (ms)

// --- Time helpers for OpenWeather One Call (dt is seconds) ---
function toLocalDate(dtSeconds, timezoneOffsetSeconds = 0) {
  return new Date((Number(dtSeconds) + Number(timezoneOffsetSeconds)) * 1000);
}

function formatDaily(dtSeconds, timezoneOffsetSeconds = 0, locale = "en-US") {
  const d = toLocalDate(dtSeconds, timezoneOffsetSeconds);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function formatCurrentFull(
  dtSeconds,
  timezoneOffsetSeconds = 0,
  locale = "en-US"
) {
  const d = toLocalDate(dtSeconds, timezoneOffsetSeconds);
  const datePart = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(d.toISOString()));
  return { formatted: `${datePart} ${timePart}`, timestampMs: d.getTime() };
}

function formatHourly(dtSeconds, timezoneOffsetSeconds = 0, locale = "en-US") {
  const d = toLocalDate(dtSeconds, timezoneOffsetSeconds);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

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

// --- Render current weather card ---
function renderCurrentWeather(payload, location = {}) {
  const el = document.getElementById("current-weather");
  if (!el) return;
  if (!payload || !payload.current) {
    el.innerHTML =
      '<div class="controls-panel">No weather data available.</div>';
    return;
  }

  const tz = payload.timezone_offset || 0;
  const current = payload.current;
  const iconCode =
    current.weather && current.weather[0] && current.weather[0].icon;
  const description =
    current.weather && current.weather[0] && current.weather[0].description;
  const temp = current.temp;
  const feels = current.feels_like;
  const rainVal =
    (current.rain && (current.rain["1h"] || current.rain["1h"])) || 0;
  const snowVal =
    (current.snow && (current.snow["1h"] || current.snow["1h"])) || 0;
  const precip = (Number(rainVal) || 0) + (Number(snowVal) || 0);
  const windSpeed = current.wind_speed;
  const windGust = current.wind_gust || 0;
  const windDeg = current.wind_deg || 0;

  const unit = getSelectedUnit() || "metric";
  const tempUnit = unit === "metric" ? "°C" : "°F";
  const windUnit = unit === "metric" ? "m/s" : "mph";

  const nameText = location.name || "";
  const countryText = location.country
    ? regionNames.of(location.country) || location.country
    : "";
  const stateText = location.state ? `, ${location.state}` : "";

  // place-local time for title (time only)
  const placeTimeOnly = formatTimeOnly(current.dt, tz);
  // Use the payload's timestamp (`current.dt`) for displayed times so both
  // the user's local representation and the place-local time come from the
  // same source (avoid a few-second skew caused by fetch/roundtrip timing).
  const payloadMs = Number(current.dt) * 1000;
  const lastUpdatedUser = formatUserLocalFromMs(payloadMs);
  const userLocalFull = formatUserLocalFullFromMs(payloadMs);
  const refreshDisabled = Date.now() < (refreshDisabledUntil || 0);

  const iconUrl = iconCode
    ? `https://openweathermap.org/img/wn/${iconCode}@4x.png`
    : "";

  el.innerHTML = `
    <div class="weather-card__header">
      <div class="weather-card__header-left">
        <div>
          <h3 class="weather-card__title">${escapeHtml(nameText)}</h3>
          <div class="weather-card__subtitle">${escapeHtml(
            countryText
          )}${escapeHtml(stateText)}</div>
        </div>
      </div>
      <div>
        <button class="weather-card__refresh" aria-label="Refresh weather" id="weather-refresh-btn" ${
          refreshDisabled ? "disabled" : ""
        }>
          <svg class="icon" width="20" height="20"><use href="assets/sprite.svg#icon-refresh"></use></svg>
        </button>
      </div>
    </div>
    <div class="weather-card__meta-row"><strong>Current weather</strong> (Last updated: ${escapeHtml(
      userLocalFull
    )} (Local time ${escapeHtml(placeTimeOnly)}))</div>
    <div class="weather-card__body">
      <div class="weather-symbol">
        ${
          iconUrl
            ? `<img class="weather-symbol__img" src="${iconUrl}" alt="${escapeHtml(
                description || ""
              )}">`
            : ""
        }
      </div>
      <div>
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="icon"><use href="assets/sprite.svg#icon-thermometer"></use></svg>
          <div class="weather-main-temp">${Math.round(
            temp
          )}<span class="temperature__degree">${tempUnit}</span></div>
        </div>
        <div class="weather-feels">Feels like ${Math.round(
          feels
        )}${tempUnit}</div>
        <div style="height:8px"></div>
        <div class="weather-details">
          <div class="weather-detail">
            <svg class="icon"><use href="assets/sprite.svg#icon-drop"></use></svg>
            <div>${precip} mm</div>
          </div>
          <div class="weather-detail">
            <svg class="icon"><use href="assets/sprite.svg#icon-wind"></use></svg>
            <div><strong>${windSpeed}</strong><div style="font-size:0.85rem">(${windGust}) ${windUnit}</div></div>
            <div class="wind-arrow" style="transform: rotate(${windDeg}deg)"><svg class="icon"><use href="assets/sprite.svg#icon-arrow-down"></use></svg></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // wire refresh with a short cooldown (10s) to avoid spamming the API
  const refreshBtn = document.getElementById("weather-refresh-btn");
  if (refreshBtn) {
    // helper to set cooldown using global state and update any current DOM button by id
    const setCooldown = (ms = 10000) => {
      const now = Date.now();
      refreshDisabledUntil = now + ms;
      lastRefreshTs = now;
      // set disabled on whatever button currently exists
      const curBtn = document.getElementById("weather-refresh-btn");
      if (curBtn) {
        try {
          curBtn.setAttribute("disabled", "true");
        } catch (e) {}
        curBtn.classList.add("disabled");
      }
      // clear cooldown after ms and re-enable the button in DOM if present
      setTimeout(() => {
        refreshDisabledUntil = 0;
        const b = document.getElementById("weather-refresh-btn");
        if (b) {
          try {
            b.removeAttribute("disabled");
          } catch (e) {}
          b.classList.remove("disabled");
        }
      }, ms);
    };

    refreshBtn.addEventListener("click", () => {
      // if disabled, ignore
      if (refreshBtn.hasAttribute("disabled")) return;
      if (
        lastSelectedLocation &&
        lastSelectedLocation.lat &&
        lastSelectedLocation.lon
      ) {
        // set cooldown immediately and start fetch
        setCooldown(10000); // 10 seconds
        fetchWeather(
          lastSelectedLocation.lat,
          lastSelectedLocation.lon,
          lastSelectedLocation
        );
      }
    });
  }
}

// small helper to escape text into HTML
function escapeHtml(s) {
  return String(s || "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
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
  // Immediately fetch weather for the selected location and log + render it.
  // store last selected for refresh
  lastSelectedLocation = sel;
  // pass the full selected object so renderCurrentWeather can show name/country/state
  fetchWeather(sel.lat, sel.lon, sel);
}

// Fetch weather from the backend proxy and log the full response.
async function fetchWeather(lat, lon, location = null) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.error("fetchWeather: invalid lat/lon", lat, lon);
    return null;
  }
  const units = getSelectedUnit() || "metric";
  const exclude = "minutely";
  const url = `http://localhost:3000/api/weather?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&units=${encodeURIComponent(
    units
  )}&exclude=${encodeURIComponent(exclude)}`;
  console.log("fetchWeather ->", url);
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Weather proxy returned", resp.status);
      return null;
    }
    const json = await resp.json();
    console.log("Weather response:", json);
    // record that we successfully fetched new data now
    try {
      lastFetchedTs = Date.now();
    } catch (e) {}
    // render current weather card using returned payload
    // prefer explicit location argument, fall back to lastSelectedLocation or lat/lon
    const loc = location || lastSelectedLocation || { lat, lon };
    renderCurrentWeather(json, loc);
    return json;
  } catch (err) {
    console.error("fetchWeather error", err);
    return null;
  }
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

// ===== Unit toggle (°C / °F) =====
// Default unit is 'metric'. Persist selection in localStorage so it "keeps" between reloads.
let currentUnit = localStorage.getItem("weather_unit") || "metric";
const unitToggle = document.querySelector(".unit-toggle");

// store last selected location for refresh
let lastSelectedLocation = null;

function applyUnitToUI(unit) {
  if (!unitToggle) return;
  const buttons = unitToggle.querySelectorAll(".unit-btn");
  buttons.forEach((btn) => {
    const u = btn.getAttribute("data-unit");
    const isActive = u === unit;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

function setUnit(unit) {
  if (unit !== "metric" && unit !== "imperial") return;
  currentUnit = unit;
  localStorage.setItem("weather_unit", unit);
  applyUnitToUI(unit);
}

// Initialize UI on load
applyUnitToUI(currentUnit);

// Delegate clicks inside unitToggle
if (unitToggle) {
  unitToggle.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".unit-btn");
    if (!btn) return;
    const unit = btn.getAttribute("data-unit");
    setUnit(unit);
  });
}

// Getter for other code to use when making weather API calls
function getSelectedUnit() {
  return currentUnit;
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
