// =====================================================================
// === 1. DOM ELEMENT REFERENCES ===
// === q, statusMessage, suggestionsEl, unitToggle ===
// =====================================================================
// These are references to HTML elements we need to interact with.
// We grab them once at the start so we can use them throughout the app.

// The main search input where users type location names
const q = document.getElementById("q");

// Area for displaying status messages (e.g., "Searching...", "No results")
const statusMessage = document.getElementById("status");

// Container that shows the dropdown list of location suggestions
const suggestionsEl = document.getElementById("suggestions");

// Container holding the °C / °F toggle buttons
const unitToggle = document.querySelector(".unit-toggle");

// =====================================================================
// === 2. CONSTANTS ===
// === regionNames, PRECIP_WEATHER_IDS, REFRESH_COOLDOWN_MS ===
// =====================================================================
// Constants are values that never change during the app's lifetime.
// Using UPPERCASE_NAMES is a common convention for constants.

// Intl.DisplayNames converts country codes (e.g., "US") to full names ("United States")
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// OpenWeather API uses numeric IDs to identify weather conditions.
// These IDs represent precipitation types (rain, snow, showers, sleet, etc.)
// We use this list to check if current weather includes precipitation.
const PRECIP_WEATHER_IDS = [
  500,
  501,
  502,
  503,
  504,
  511,
  520,
  521,
  522,
  531, // rain/shower codes
  600,
  601,
  602,
  611,
  612,
  613,
  615,
  616,
  620,
  621,
  622, // snow/sleet/hail
];

// How long (in milliseconds) users must wait between refresh clicks.
// 10000ms = 10 seconds. Prevents excessive API calls.
const REFRESH_COOLDOWN_MS = 10000;

// =====================================================================
// === 3. STATE VARIABLES ===
// === currentSuggestions, highlightedIndex, geocodeController, ===
// === lastQuery, refreshDisabledUntil, lastFetchedTs, ===
// === currentUnit, lastSelectedLocation ===
// =====================================================================
// State variables track the current "state" of the app.
// Unlike constants, these values change as the user interacts with the app.
// We use "let" instead of "const" because their values will be reassigned.

// --- Autocomplete/Suggestions State ---
// Array of location objects returned from the geocoding API
let currentSuggestions = [];
// Which suggestion is currently highlighted (-1 means none)
let highlightedIndex = -1;
// AbortController lets us cancel in-flight fetch requests if user types again
let geocodeController = null;
// Stores the last search query to avoid race conditions with async responses
let lastQuery = "";

// --- Refresh Button State ---
// Timestamp (ms) until which the refresh button stays disabled
let refreshDisabledUntil = 0;
// Timestamp (ms) of the last successful weather fetch
let lastFetchedTs = 0;

// --- Unit Preference State ---
// "metric" (°C, m/s) or "imperial" (°F, mph)
// localStorage persists this across browser sessions
let currentUnit = localStorage.getItem("weather_unit") || "metric";

// --- Location State ---
// Stores the last selected location so we can refresh its weather
let lastSelectedLocation = null;

// --- Weather Data State ---
// Stores the last fetched weather payload for hourly data access
let lastWeatherPayload = null;

// =====================================================================
// === 4. UTILITY FUNCTIONS ===
// === debounce, escapeHtml, dedupeLocations ===
// =====================================================================
// Small helper functions that perform common tasks.
// These are "pure" functions - they take input and return output
// without modifying any global state.

/**
 * Debounce limits how often a function can be called.
 * Example: If user types "London" quickly, we don't want 6 API calls.
 * Debounce waits until typing stops for `wait` ms, then calls once.
 * @param {Function} fn - The function to debounce
 * @param {number} wait - Milliseconds to wait before calling fn
 * @returns {Function} A debounced version of fn
 */
function debounce(fn, wait = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Escapes special HTML characters to prevent XSS (cross-site scripting) attacks.
 * Always use this when inserting user-provided or API data into HTML.
 * Example: "<script>" becomes "&lt;script&gt;"
 * @param {string} s - The string to escape
 * @returns {string} The escaped string safe for HTML insertion
 */
function escapeHtml(s) {
  return String(s || "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

/**
 * Removes duplicate locations from the API response.
 * The geocoding API sometimes returns the same place multiple times.
 * We keep only the first occurrence of each unique name+country+state combo.
 * @param {Array} items - Array of location objects from the API
 * @returns {Array} Filtered array with duplicates removed
 */
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

// =====================================================================
// === 5. FORMATTING FUNCTIONS ===
// === toLocalDate, formatTimeOnly, formatUserLocalFullFromMs, ===
// === formatCompactDate, isSameLocalDate, unitLabel, windUnitLabel, ===
// === tempColorClass, mmToInches, windDirection ===
// =====================================================================
// Functions that format data for display (dates, times, units, etc.)
// These make raw API data human-readable.

/**
 * Converts OpenWeather timestamp to a JavaScript Date in the location's timezone.
 *
 * OpenWeather gives us:
 * - dt: Unix timestamp in seconds (not milliseconds like JS uses)
 * - timezone_offset: Seconds offset from UTC for the location
 *
 * We add these together and multiply by 1000 (to get milliseconds).
 * The returned Date uses UTC methods to represent the location's local time.
 *
 * @param {number} dtSeconds - Unix timestamp in seconds from API
 * @param {number} timezoneOffsetSeconds - Timezone offset in seconds
 * @returns {Date} JavaScript Date representing local time at that location
 */
function toLocalDate(dtSeconds, timezoneOffsetSeconds = 0) {
  return new Date((Number(dtSeconds) + Number(timezoneOffsetSeconds)) * 1000);
}

/**
 * Formats a timestamp as time only (e.g., "14:30:00") in the location's timezone.
 * Used to show "Local time" in the weather card.
 * @param {number} dtSeconds - Unix timestamp in seconds
 * @param {number} timezoneOffsetSeconds - Location's timezone offset in seconds
 * @param {string} locale - Locale for formatting (default: "en-US")
 * @returns {string} Formatted time string like "14:30:00"
 */
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

/**
 * Formats a timestamp in the USER's local timezone (not the weather location's).
 * Used for "Last updated" to show when data was fetched in the user's time.
 * Example output: "December 2, 2025 14:30:00"
 * @param {number} ms - Timestamp in milliseconds
 * @param {string} locale - User's locale for formatting
 * @returns {string} Full date and time string
 */
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

/**
 * Formats a date in compact form for the 7-day forecast.
 * Example output: "Mon, Dec 2"
 * @param {number} dtSeconds - Unix timestamp in seconds
 * @param {number} tz - Timezone offset in seconds
 * @returns {string} Compact date string like "Mon, Dec 2"
 */
function formatCompactDate(dtSeconds, tz) {
  const d = toLocalDate(dtSeconds, tz);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(d);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(d);
  return `${weekday}, ${month} ${d.getUTCDate()}`;
}

/**
 * Checks if two dates represent the same calendar day.
 * Used to determine if a forecast day is "Today" or "Tomorrow".
 * Uses UTC methods because our dates store local time in UTC fields.
 * @param {Date} a - First date to compare
 * @param {Date} b - Second date to compare
 * @returns {boolean} True if same year, month, and day
 */
function isSameLocalDate(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/**
 * Converts short unit abbreviations to full words for screen readers.
 * Example: "mm" becomes "millimeters" for the title/aria-label attributes.
 * This improves accessibility for users with assistive technologies.
 * @param {string} u - Short unit string (mm, in, mm/h, in/h)
 * @returns {string} Full unit name for accessibility
 */
function unitLabel(u) {
  switch (u) {
    case "mm":
      return "millimeters";
    case "mm/h":
      return "millimeters per hour";
    case "in/h":
      return "inches per hour";
    case "in":
      return "inches";
    default:
      return String(u || "");
  }
}

/**
 * Converts wind speed unit abbreviations to full words for screen readers.
 * @param {string} u - Short unit string (m/s, mph, km/h)
 * @returns {string} Full unit name for accessibility
 */
function windUnitLabel(u) {
  switch (u) {
    case "m/s":
      return "meters per second";
    case "mph":
      return "miles per hour";
    case "km/h":
      return "kilometers per hour";
    default:
      return String(u || "");
  }
}

/**
 * Returns a CSS class name for color-coding temperatures.
 * Converts to Celsius internally if needed, then returns:
 * - temp-freezing: below -10°C (very cold, blue)
 * - temp-cold: -10°C to 0°C (cold)
 * - temp-neutral: exactly 0°C
 * - temp-warm: 0°C to 15°C (mild)
 * - temp-hot: above 15°C (warm/hot, orange/red)
 * @param {number} tempValue - Temperature value
 * @param {boolean} isMetric - True if value is Celsius, false if Fahrenheit
 * @returns {string} CSS class name for styling
 */
function tempColorClass(tempValue, isMetric = true) {
  const celsius = isMetric ? tempValue : ((tempValue - 32) * 5) / 9;
  if (celsius < -10) return "temp-freezing";
  if (celsius < 0) return "temp-cold";
  if (celsius === 0) return "temp-neutral";
  if (celsius <= 15) return "temp-warm";
  return "temp-hot";
}

/**
 * Converts millimeters to inches for imperial unit users.
 * 1 inch = 25.4 millimeters
 * @param {number} mm - Value in millimeters
 * @returns {string} Value in inches, rounded to 1 decimal place
 */
function mmToInches(mm) {
  return (Number(mm || 0) / 25.4).toFixed(1);
}

/**
 * Converts wind direction from degrees to compass direction.
 * 0° = North, 90° = East, 180° = South, 270° = West
 * Divides the compass into 16 directions (N, NNE, NE, ENE, E, etc.)
 * @param {number} deg - Wind direction in degrees (0-360)
 * @returns {Object} Object with `short` ("NNE") and `full` ("North-Northeast")
 */
function windDirection(deg) {
  const directions = [
    { short: "N", full: "North" },
    { short: "NNE", full: "North-Northeast" },
    { short: "NE", full: "Northeast" },
    { short: "ENE", full: "East-Northeast" },
    { short: "E", full: "East" },
    { short: "ESE", full: "East-Southeast" },
    { short: "SE", full: "Southeast" },
    { short: "SSE", full: "South-Southeast" },
    { short: "S", full: "South" },
    { short: "SSW", full: "South-Southwest" },
    { short: "SW", full: "Southwest" },
    { short: "WSW", full: "West-Southwest" },
    { short: "W", full: "West" },
    { short: "WNW", full: "West-Northwest" },
    { short: "NW", full: "Northwest" },
    { short: "NNW", full: "North-Northwest" },
  ];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

// =====================================================================
// === 6. DATA FETCHING ===
// === GetLocations, fetchWeather ===
// =====================================================================
// Functions that make HTTP requests to our backend API proxy.
// The proxy adds the API key server-side so it's not exposed in the browser.

/**
 * Fetches location suggestions from the geocoding API.
 * Called as user types in the search box (debounced).
 *
 * Features:
 * - Aborts previous request if user types again (prevents race conditions)
 * - Shows loading/error states in the status message
 * - Deduplicates results before displaying
 *
 * @param {string} query - The search term (city name)
 * @returns {Array|null} Array of location objects, or null on error
 */
async function GetLocations(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return null;
  lastQuery = trimmed;

  if (geocodeController) {
    geocodeController.abort();
  }
  geocodeController = new AbortController();
  const { signal } = geocodeController;

  try {
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
    const deduped = dedupeLocations(json);

    if (trimmed === lastQuery) {
      if (Array.isArray(deduped) && deduped.length === 0) {
        if (statusMessage) {
          statusMessage.textContent =
            "There are no locations matching your search term";
          statusMessage.setAttribute("aria-live", "assertive");
          statusMessage.classList.add("status-warning");
        }
        renderSuggestions(deduped);
      } else {
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
    if (geocodeController && geocodeController.signal === signal) {
      geocodeController = null;
    }
  }
}

/**
 * Fetches weather data for a specific location.
 * Uses latitude/longitude from the selected location.
 *
 * The API returns:
 * - current: Current weather conditions
 * - hourly: Hour-by-hour forecast (48 hours)
 * - daily: Day-by-day forecast (7 days)
 *
 * @param {number} lat - Latitude of the location
 * @param {number} lon - Longitude of the location
 * @param {Object} location - Location object with name, country, state for display
 * @returns {Object|null} Weather data object, or null on error
 */
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
    lastFetchedTs = Date.now();
    lastWeatherPayload = json; // Store for hourly modal access
    const loc = location || lastSelectedLocation || { lat, lon };
    renderCurrentWeather(json, loc);
    return json;
  } catch (err) {
    console.error("fetchWeather error", err);
    return null;
  }
}

// =====================================================================
// === 7. RENDERING FUNCTIONS ===
// === renderSuggestions, renderCurrentWeather, renderHourlyModal ===
// =====================================================================
// Functions that create and insert HTML into the page.
// They take data and turn it into visible UI elements.

/**
 * Renders the autocomplete dropdown with location suggestions.
 * Creates clickable items that users can select with mouse or keyboard.
 *
 * Accessibility features:
 * - ARIA roles (listbox/option) for screen readers
 * - aria-selected to indicate highlighted item
 * - Keyboard navigation support (arrow keys, Enter, Escape)
 *
 * @param {Array} items - Array of location objects to display
 */
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

/**
 * Renders the main weather display including current conditions and 7-day forecast.
 * This is the largest function - it builds the entire weather card HTML.
 *
 * Displays:
 * - Location name and country
 * - Current temperature, feels-like, description
 * - Precipitation amount and type (rain/snow)
 * - Wind speed, gusts, and direction
 * - 7-day forecast with daily highs/lows
 * - Refresh button with cooldown timer
 *
 * @param {Object} payload - Weather data from the API
 * @param {Object} location - Location info (name, country, state, lat, lon)
 */
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

  const descriptionsList = Array.isArray(current.weather)
    ? current.weather
        .map((w) => w && w.description)
        .filter(Boolean)
        .join(", ")
    : "";
  const precipDescriptionsList = Array.isArray(current.weather)
    ? current.weather
        .filter(
          (w) =>
            w &&
            Number.isFinite(Number(w.id)) &&
            PRECIP_WEATHER_IDS.includes(Number(w.id))
        )
        .map((w) => w && w.description)
        .filter(Boolean)
        .join(", ")
    : "";

  const temp = current.temp;
  const feels = current.feels_like;
  const rainVal = (current.rain && current.rain["1h"]) || 0;
  const snowVal = (current.snow && current.snow["1h"]) || 0;
  const precip = rainVal + snowVal;
  const windSpeed = Math.round(current.wind_speed);
  const windGust = Math.round(current.wind_gust || 0);
  const windDeg = current.wind_deg || 0;

  const unit = getSelectedUnit() || "metric";
  const hasSnow = !!current.snow;
  const precipIconName = hasSnow ? "icon-snowflake" : "icon-drop";
  const precipUnit = unit === "metric" ? "mm/h" : "in/h";
  let precipValue = precip;
  if (unit !== "metric") {
    precipValue = (precipValue / 25.4).toFixed(1);
  } else {
    precipValue = precipValue.toFixed(1);
  }
  const precipIconSvg = `<svg class="icon"><use href="assets/sprite.svg#${precipIconName}"></use></svg>`;

  const tempUnit = unit === "metric" ? "°C" : "°F";
  const windUnit = unit === "metric" ? "m/s" : "mph";
  const tempUnitLabel =
    tempUnit === "°C" ? "degrees Celsius" : "degrees Fahrenheit";

  const nameText = location.name || "";
  const countryText = location.country
    ? regionNames.of(location.country) || location.country
    : "";
  const stateText = location.state ? `, ${location.state}` : "";

  const payloadMs = Number(current.dt) * 1000;
  const displayUserMs = lastFetchedTs || payloadMs;
  const placeTimeOnly = formatTimeOnly(displayUserMs / 1000, tz);
  const userLocalFull = formatUserLocalFullFromMs(displayUserMs);
  const refreshDisabled = Date.now() < (refreshDisabledUntil || 0);
  const iconUrlCurrent = iconCode
    ? `https://openweathermap.org/img/wn/${iconCode}@4x.png`
    : "";

  const dir = windDirection(windDeg);
  const shortDirection = dir.short;
  const fullDirectionName = dir.full;

  const dailyArr = Array.isArray(payload.daily)
    ? payload.daily.slice(0, 7)
    : [];
  const dailyPrecipUnit = unit === "metric" ? "mm" : "in";

  const nowLocal = toLocalDate(Math.floor(Date.now() / 1000), tz);
  const tomorrow = new Date(nowLocal.getTime());
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const dailyItemsHtml = dailyArr
    .map((dItem, idx) => {
      const dateBase = formatCompactDate(dItem.dt, tz);
      const itemDate = toLocalDate(dItem.dt, tz);
      let dateLabel = dateBase;
      if (isSameLocalDate(itemDate, nowLocal)) {
        dateLabel = `Today (${dateBase})`;
      } else if (isSameLocalDate(itemDate, tomorrow)) {
        dateLabel = `Tomorrow (${dateBase})`;
      }

      const iconCode =
        dItem.weather && dItem.weather[0] && dItem.weather[0].icon;
      const iconUrl = iconCode
        ? `https://openweathermap.org/img/wn/${iconCode}@2x.png`
        : "";

      const tmin =
        dItem.temp && Number.isFinite(Number(dItem.temp.min))
          ? Math.round(dItem.temp.min)
          : 0;
      const tmax =
        dItem.temp && Number.isFinite(Number(dItem.temp.max))
          ? Math.round(dItem.temp.max)
          : 0;

      const rainVal = Number(dItem.rain) || 0;
      const snowVal = Number(dItem.snow) || 0;
      const precipRaw = rainVal + snowVal;
      let precipDisplay = "0.0";
      if (unit !== "metric") {
        precipDisplay = String(mmToInches(precipRaw));
      } else {
        precipDisplay = precipRaw.toFixed(1);
      }

      const pop = dItem.pop != null ? Math.round(Number(dItem.pop) * 100) : 0;
      const wind_s =
        dItem.wind_speed != null ? Math.round(dItem.wind_speed) : 0;
      const wind_deg = dItem.wind_deg != null ? dItem.wind_deg : 0;
      const wdir = windDirection(wind_deg);

      const showHourly =
        isSameLocalDate(itemDate, nowLocal) ||
        isSameLocalDate(itemDate, tomorrow);

      return `
        <li class="daily-weather-list-item">
          <div class="daily-weather-list-item__date">${escapeHtml(
            dateLabel
          )}</div>
          <div class="daily-weather-list-item__icon">${
            iconUrl
              ? `<img src="${iconUrl}" alt="${escapeHtml(
                  (dItem.weather &&
                    dItem.weather[0] &&
                    dItem.weather[0].description) ||
                    ""
                )}">`
              : ""
          }</div>
          <div class="daily-weather-list-item__temp"><strong>
            <span class="temp-min ${tempColorClass(
              tmin,
              unit === "metric"
            )}">${escapeHtml(String(tmin))}</span></strong>
            <span class="temp-slash">/<strong></span>
            <span class="temp-max ${tempColorClass(
              tmax,
              unit === "metric"
            )}">${escapeHtml(String(tmax))}</span></strong>
            <span class="weather-card__temp-unit" aria-label="${escapeHtml(
              tempUnitLabel
            )}">${escapeHtml(tempUnit)}</span>
          </div>
          <div class="daily-weather-list-item__precip">
            <span>${escapeHtml(precipDisplay)} <abbr title="${escapeHtml(
        unitLabel(dailyPrecipUnit)
      )}">${escapeHtml(dailyPrecipUnit)}</abbr></span>
          </div>
          <div class="daily-weather-list-item__pop"><span>${escapeHtml(
            String(pop)
          )} %</span></div>
          <div class="daily-weather-list-item__wind">
            <span class="wind-speed">${escapeHtml(
              String(wind_s)
            )} <abbr title="${escapeHtml(
        windUnitLabel(windUnit)
      )}">${escapeHtml(windUnit)}</abbr></span>
            <div class="wind-arrow" data-rotate="${escapeHtml(
              String(wind_deg)
            )}">
              <svg class="icon" style="transform: rotate(${wind_deg}deg)"><use href="assets/sprite.svg#icon-arrow-down"></use></svg>
            </div>
            <span class="wind-dir">from <span aria-label="${escapeHtml(
              wdir.full
            )}">${escapeHtml(wdir.short)}</span></span>
          </div>
          ${
            showHourly
              ? `<div class="daily-weather-list-item__h_button"><button class="h-btn" data-day-index="${idx}"><div>hourly forecast</div></button></div>`
              : ""
          }
        </li>
      `;
    })
    .join("\n");

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
    <div class="weather-card__meta-row"><strong>Current weather - ${escapeHtml(
      descriptionsList || "No description"
    )} -</strong> (Last updated: ${escapeHtml(
    userLocalFull
  )} (Local time ${escapeHtml(placeTimeOnly)})) </div>
    <div class="weather-card__body">
      <div class="weather-card__tile">
        <div class="weather-card__tile-top-row">
          <div class="weather-card__tile-icon">${
            iconUrlCurrent
              ? `<img class="weather-symbol__img" src="${iconUrlCurrent}" alt="${escapeHtml(
                  description || ""
                )}">`
              : ""
          }</div>
          <div class="weather-card__tile-main-info"></div>
        </div>
      </div>

      <div class="weather-card__tile">
        <div class="weather-card__tile-top-row">
          <div class="weather-card__tile-icon">
            <svg class="icon"><use href="assets/sprite.svg#icon-thermometer"></use></svg>
          </div>
          <div class="weather-card__tile-main-info ${tempColorClass(
            Math.round(temp),
            unit === "metric"
          )}">
            ${Math.round(
              temp
            )}<span class="weather-card__temp-unit" aria-label="${escapeHtml(
    tempUnitLabel
  )}">${tempUnit}</span>
          </div>
        </div>
        <div class="weather-card__tile-bottom-row">
          <div class="weather-card__tile-support-info ${tempColorClass(
            Math.round(feels),
            unit === "metric"
          )}">
            Feels like ${Math.round(feels)}${tempUnit}
          </div>
        </div>
      </div>

      <div class="weather-card__tile">
        <div class="weather-card__tile-top-row">
          <div class="weather-card__tile-icon">${precipIconSvg}</div>
          <div class="weather-card__tile-main-info">
            ${precipValue}
            <abbr title="${escapeHtml(unitLabel(precipUnit))}">${escapeHtml(
    precipUnit
  )}</abbr>
          </div>
        </div>
        <div class="weather-card__tile-bottom-row">
          <div class="weather-card__tile-support-info">${escapeHtml(
            precipDescriptionsList || "No precipitation"
          )}</div>
        </div>
      </div>

      <div class="weather-card__tile">
        <div class="weather-card__tile-top-row">
          <div class="weather-card__tile-icon">
            <svg class="icon"><use href="assets/sprite.svg#icon-wind"></use></svg>
          </div>
          <div class="weather-card__tile-main-info">${windSpeed}<abbr title="${escapeHtml(
    windUnitLabel(windUnit)
  )}"> ${escapeHtml(windUnit)}</abbr></div>
        </div>
        <div class="weather-card__tile-bottom-row">
          <div class="weather-card__tile-support-info">
            (${windGust}) <abbr title="${escapeHtml(
    windUnitLabel(windUnit)
  )}">${escapeHtml(windUnit)}</abbr>
          </div>
          <div class="weather-card__tile-support-info">
            <div class="weather-card__wind-arrow">
              <svg class="icon" style="transform: rotate(${windDeg}deg)">
                <use href="assets/sprite.svg#icon-arrow-down"></use>
              </svg>
            </div>
            from
            <span aria-label="${escapeHtml(fullDirectionName)}">${escapeHtml(
    shortDirection
  )}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const dailyHtml = `
      <div class="weather-card__meta-row"><strong>Forecast for 7 days</strong></div>
      <div class="daily-weather-list">
        <div class="daily-weather-list__headers">
          <div class="daily-weather-list__forecast-headers">
            <span class="daily-weather-list__header">Weather</span>
            <span class="daily-weather-list__header">Temp. min/max</span>
            <span class="daily-weather-list__header">Precip.</span>
            <span class="daily-weather-list__header">Precip. chance</span>
            <span class="daily-weather-list__header">Wind</span>
          </div>
        </div>
        <ol class="daily-weather-list__daily">
          ${dailyItemsHtml}
        </ol>
      </div>
    `;
    el.insertAdjacentHTML("beforeend", dailyHtml);
  } catch (e) {
    console.error("Failed to render daily forecast:", e);
  }

  // Wire refresh button with cooldown
  const refreshBtn = document.getElementById("weather-refresh-btn");
  if (refreshBtn) {
    const setCooldown = (ms = REFRESH_COOLDOWN_MS) => {
      const now = Date.now();
      refreshDisabledUntil = now + ms;
      const curBtn = document.getElementById("weather-refresh-btn");
      if (curBtn) {
        try {
          curBtn.setAttribute("disabled", "true");
        } catch (e) {}
        curBtn.classList.add("disabled");
      }
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
      if (refreshBtn.hasAttribute("disabled")) return;
      if (
        lastSelectedLocation &&
        lastSelectedLocation.lat &&
        lastSelectedLocation.lon
      ) {
        setCooldown();
        fetchWeather(
          lastSelectedLocation.lat,
          lastSelectedLocation.lon,
          lastSelectedLocation
        );
      }
    });
  }

  // Wire hourly forecast buttons to open the modal
  const hourlyBtns = el.querySelectorAll(".h-btn[data-day-index]");
  hourlyBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dayIndex = parseInt(btn.getAttribute("data-day-index"), 10);
      if (!isNaN(dayIndex)) {
        renderHourlyModal(dayIndex);
      }
    });
  });
}

/**
 * Formats an hour (0-23) as a readable time string.
 * Example: 9 -> "09:00", 14 -> "14:00"
 * @param {number} hour - Hour value (0-23)
 * @returns {string} Formatted time like "09:00"
 */
function formatHour(hour) {
  return String(hour).padStart(2, "0") + ":00";
}

/**
 * Renders and opens the hourly forecast modal for a specific day.
 * Filters hourly data to show only hours belonging to the selected day.
 *
 * @param {number} dayIndex - Index of the day (0 = today, 1 = tomorrow, etc.)
 */
function renderHourlyModal(dayIndex) {
  const modal = document.getElementById("hourly-modal");
  if (!modal || !lastWeatherPayload || !lastWeatherPayload.hourly) {
    console.error("Cannot render hourly modal: missing modal element or data");
    return;
  }

  const tz = lastWeatherPayload.timezone_offset || 0;
  const dailyArr = lastWeatherPayload.daily || [];
  const hourlyArr = lastWeatherPayload.hourly || [];

  // Get the selected day's data for the header
  const selectedDay = dailyArr[dayIndex];
  if (!selectedDay) {
    console.error("No daily data for index", dayIndex);
    return;
  }

  // Get the date for the selected day
  const dayDate = toLocalDate(selectedDay.dt, tz);
  const dateLabel = formatCompactDate(selectedDay.dt, tz);

  // Determine if this is "Today" or "Tomorrow"
  const nowLocal = toLocalDate(Math.floor(Date.now() / 1000), tz);
  const tomorrow = new Date(nowLocal.getTime());
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  let headerLabel = dateLabel;
  if (isSameLocalDate(dayDate, nowLocal)) {
    headerLabel = `Today, ${dateLabel}`;
  } else if (isSameLocalDate(dayDate, tomorrow)) {
    headerLabel = `Tomorrow, ${dateLabel}`;
  }

  // Filter hourly data to only include hours for the selected day
  const filteredHourly = hourlyArr.filter((h) => {
    const hourDate = toLocalDate(h.dt, tz);
    return isSameLocalDate(hourDate, dayDate);
  });

  if (filteredHourly.length === 0) {
    console.warn("No hourly data available for day index", dayIndex);
    return;
  }

  // Get current unit preferences
  const unit = getSelectedUnit() || "metric";
  const tempUnit = unit === "metric" ? "°C" : "°F";
  const tempUnitLabel =
    tempUnit === "°C" ? "degrees Celsius" : "degrees Fahrenheit";
  const precipUnit = unit === "metric" ? "mm/h" : "in/h";
  const windUnit = unit === "metric" ? "m/s" : "mph";

  // Build table rows for each hour
  const rowsHtml = filteredHourly
    .map((h) => {
      const hourDate = toLocalDate(h.dt, tz);
      const hour = hourDate.getUTCHours();
      const timeStr = formatHour(hour);

      // Weather icon
      const iconCode = h.weather && h.weather[0] && h.weather[0].icon;
      const iconUrl = iconCode
        ? `https://openweathermap.org/img/wn/${iconCode}.png`
        : "";
      const weatherDesc =
        (h.weather && h.weather[0] && h.weather[0].description) || "";

      // Temperature
      const temp = Math.round(h.temp);

      // Precipitation (rain + snow, same logic as daily)
      const rainVal = (h.rain && h.rain["1h"]) || 0;
      const snowVal = (h.snow && h.snow["1h"]) || 0;
      const precipRaw = rainVal + snowVal;
      let precipDisplay = "0.0";
      if (unit !== "metric") {
        precipDisplay = (precipRaw / 25.4).toFixed(1);
      } else {
        precipDisplay = precipRaw.toFixed(1);
      }

      // Wind
      const windSpeed = Math.round(h.wind_speed || 0);
      const windDeg = h.wind_deg || 0;
      const wdir = windDirection(windDeg);

      return `
        <tr>
          <td><time datetime="${escapeHtml(timeStr)}">${escapeHtml(
        timeStr
      )}</time></td>
          <td>${
            iconUrl
              ? `<img class="hourly-weather-table__icon" src="${iconUrl}" alt="${escapeHtml(
                  weatherDesc
                )}">`
              : ""
          }</td>
          <td class="${tempColorClass(temp, unit === "metric")}">
            ${escapeHtml(String(temp))}<span aria-label="${escapeHtml(
        tempUnitLabel
      )}">${escapeHtml(tempUnit)}</span>
          </td>
          <td>${escapeHtml(precipDisplay)} <abbr title="${escapeHtml(
        unitLabel(precipUnit)
      )}">${escapeHtml(precipUnit)}</abbr></td>
          <td>
            <div class="hourly-weather-table__wind">
              <span>${escapeHtml(String(windSpeed))} <abbr title="${escapeHtml(
        windUnitLabel(windUnit)
      )}">${escapeHtml(windUnit)}</abbr></span>
              <div class="hourly-weather-table__wind-arrow">
                <svg class="icon" style="transform: rotate(${windDeg}deg)">
                  <use href="assets/sprite.svg#icon-arrow-down"></use>
                </svg>
              </div>
              <span aria-label="${escapeHtml(wdir.full)}">${escapeHtml(
        wdir.short
      )}</span>
            </div>
          </td>
        </tr>
      `;
    })
    .join("\n");

  // Build the complete modal HTML
  modal.innerHTML = `
    <div class="modal-dialog__header">
      <div class="modal-dialog__header-content">
        <h2 id="hourly-modal-title">
          <time datetime="${dayDate.toISOString().split("T")[0]}">${escapeHtml(
    headerLabel
  )}</time>
        </h2>
        <button class="modal-dialog__close-button" aria-label="Close" id="hourly-modal-close">
          <svg width="24" height="24" viewBox="0 0 256 256" aria-hidden="true">
            <use href="assets/sprite.svg#icon-cross"></use>
          </svg>
        </button>
      </div>
    </div>
    <div class="hourly-weather-dialog">
      <div class="hourly-weather-dialog__table">
        <table class="hourly-weather-table">
          <caption class="sr-only">Hourly forecast for ${escapeHtml(
            headerLabel
          )}</caption>
          <thead>
            <tr>
              <th>Time</th>
              <th>Weather</th>
              <th>Temp</th>
              <th>Precip</th>
              <th>Wind</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Wire close button
  const closeBtn = document.getElementById("hourly-modal-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.close();
    });
  }

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.close();
    }
  });

  // Close on Escape key (browsers handle this automatically for <dialog>, but just in case)
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      modal.close();
    }
  });

  // Open the modal
  modal.showModal();
}

// =====================================================================
// === 8. UI STATE MANAGEMENT ===
// === clearSuggestions, setHighlight, selectSuggestion, ===
// === applyUnitToUI, setUnit, getSelectedUnit ===
// =====================================================================
// Functions that update the UI state (showing/hiding elements,
// managing active states, handling user selections).

/**
 * Hides the suggestions dropdown and resets related state.
 * Called when:
 * - User selects a suggestion
 * - User clicks outside the dropdown
 * - User presses Escape
 * - Search input is cleared
 */
function clearSuggestions() {
  if (!suggestionsEl) return;
  suggestionsEl.innerHTML = "";
  suggestionsEl.style.display = "none";
  q.setAttribute("aria-expanded", "false");
  q.removeAttribute("aria-activedescendant");
  currentSuggestions = [];
  highlightedIndex = -1;
}

/**
 * Highlights a suggestion item for keyboard navigation.
 * Updates visual styling and ARIA attributes.
 * Also scrolls the item into view if needed.
 * @param {number} index - Index of the item to highlight (-1 to clear)
 */
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

/**
 * Handles when user selects a location (by click or Enter key).
 * Updates the search input with the selected location name,
 * stores the location for refresh functionality, and fetches weather.
 * @param {number} index - Index of the selected suggestion
 */
function selectSuggestion(index) {
  if (!currentSuggestions || index < 0 || index >= currentSuggestions.length)
    return;
  const sel = currentSuggestions[index];
  q.value = `${sel.name}${sel.country ? ", " + sel.country : ""}${
    sel.state ? ", " + sel.state : ""
  }`;
  clearSuggestions();
  console.log("Selected location:", sel);
  lastSelectedLocation = sel;
  lastFetchedTs = Date.now();
  fetchWeather(sel.lat, sel.lon, sel);
}

/**
 * Updates the unit toggle buttons to show which unit is active.
 * Adds "active" class and aria-pressed="true" to the selected button.
 * @param {string} unit - "metric" or "imperial"
 */
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

/**
 * Changes the temperature/wind unit preference.
 * Saves to localStorage so it persists across browser sessions.
 * @param {string} unit - "metric" (°C, m/s) or "imperial" (°F, mph)
 */
function setUnit(unit) {
  if (unit !== "metric" && unit !== "imperial") return;
  currentUnit = unit;
  localStorage.setItem("weather_unit", unit);
  applyUnitToUI(unit);
}

/**
 * Returns the current unit preference.
 * @returns {string} "metric" or "imperial"
 */
function getSelectedUnit() {
  return currentUnit;
}

// =====================================================================
// === 9. EVENT LISTENERS & INITIALIZATION ===
// === addDebouncedInputListener, keyboard handlers, click handlers ===
// =====================================================================
// Event listeners respond to user actions (typing, clicking, key presses).
// This section sets up all the interactive behavior of the app.

/**
 * Helper to attach a debounced input listener to the search box.
 * Returns a cleanup function to remove the listener if needed.
 * @param {Function} callback - Function to call with the input value
 * @param {number} wait - Debounce delay in milliseconds
 * @returns {Function} Cleanup function to remove the listener
 */
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

// --- Keyboard Navigation for Autocomplete ---
// Allows users to navigate suggestions with arrow keys,
// select with Enter, and close with Escape.
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

// --- Click Outside Handler ---
// Closes the suggestions dropdown when user clicks anywhere else on the page.
document.addEventListener("click", (ev) => {
  if (!suggestionsEl) return;
  if (ev.target === q || suggestionsEl.contains(ev.target)) return;
  clearSuggestions();
});

// --- Unit Toggle Handler ---
// Switches between °C/°F when user clicks the toggle buttons.
// Also re-fetches weather to get data in the new units.
if (unitToggle) {
  unitToggle.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".unit-btn");
    if (!btn) return;
    const unit = btn.getAttribute("data-unit");
    setUnit(unit);
    if (
      lastSelectedLocation &&
      Number.isFinite(Number(lastSelectedLocation.lat)) &&
      Number.isFinite(Number(lastSelectedLocation.lon))
    ) {
      lastFetchedTs = Date.now();
      fetchWeather(
        Number(lastSelectedLocation.lat),
        Number(lastSelectedLocation.lon),
        lastSelectedLocation
      );
    }
  });
}

// --- Initialization ---
// Code that runs immediately when the script loads.

// Set the correct unit button as active based on saved preference
applyUnitToUI(currentUnit);

// Start listening for search input and fetch location suggestions
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
