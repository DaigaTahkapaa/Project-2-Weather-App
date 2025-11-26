// =====================================================================
// === 1. DOM ELEMENT REFERENCES: Connect JavaScript to HTML elements ===
// =====================================================================

//grid: container for displaying country cards
const grid = document.getElementById("grid");
//q: search input field
const q = document.getElementById("q");
//status: area for showing messages
const statusMessage = document.getElementById("status");

// API KEY
const OPENWEATHER_API_KEY = "";
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

// Build geocoding URL
function buildGeocodeUrl(query, limit = 5) {
  const encodedQuery = encodeURIComponent(query);
  return `https://api.openweathermap.org/geo/1.0/direct?q=${encodedQuery}&limit=${limit}&appid=${OPENWEATHER_API_KEY}`;
}

// Call to the geolocate API to get Latitude and Longitude information for call to the weather API
async function getLatLon(query) {
  const url = buildGeocodeUrl(query);
  if (statusMessage) {
    statusMessage.textContent = `Searching for "${query}"...`;
    statusMessage.setAttribute("aria-live", "polite");
    statusMessage.classList.remove("status-warning");
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.log("Server returned error status:", response.status);
      if (statusMessage) {
        statusMessage.textContent =
          "Failed to fetch locations. Please try again.";
        statusMessage.setAttribute("aria-live", "assertive");
        statusMessage.classList.add("status-warning");
      }
      return null;
    }

    const json = await response.json();

    if (Array.isArray(json) && json.length === 0) {
      if (statusMessage) {
        statusMessage.textContent =
          "There are no locations matching your search term";
        statusMessage.setAttribute("aria-live", "assertive");
        statusMessage.classList.add("status-warning");
      }
      console.log(`Geocode JSON for "${query}" is an empty array.`);
      return [];
    }

    // Success: clear any warning state
    if (statusMessage) {
      statusMessage.textContent = "";
      statusMessage.setAttribute("aria-live", "polite");
      statusMessage.classList.remove("status-warning");
    }

    console.log(`Geocode JSON for "${query}":`, json);
    return json;
  } catch (e) {
    console.log("Network error or invalid JSON: ", e);
    if (statusMessage) {
      statusMessage.textContent =
        "Failed to fetch locations. Please try again.";
      statusMessage.setAttribute("aria-live", "assertive");
      statusMessage.classList.add("status-warning");
    }
    return null;
  }
}

// Get value from the search field and use it to call geolocate API
// Debounced input: wait 350ms after typing stops, call getLatLon(), log JSON
const handleSearchInput = debounce(async (evt) => {
  const val = evt.target.value.trim();
  if (!val) return;
  // Use getLatLon's default limit (7). getLatLon already handles errors
  // and updates `statusMessage`, so we don't need an outer try/catch here.
  await getLatLon(val);
}, 350);

// Consolidated input handling:
// - If the field is emptied, immediately clear status and remove warning state.
// - Otherwise forward the event to the debounced handler to perform the geocode lookup.
if (q) {
  q.addEventListener("input", (e) => {
    const val = e.target.value;
    if (!val) {
      if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.setAttribute("aria-live", "polite");
        statusMessage.classList.remove("status-warning");
      }
      return;
    }
    // Non-empty: let the debounced handler run
    handleSearchInput(e);
  });
}
