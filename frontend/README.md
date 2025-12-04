# 🌤️ Project-2-Weather-App

A single-page weather forecast application that fetches live weather data from [OpenWeatherMap API](https://openweathermap.org/api), allowing users to:
- 🔍 Search for any city worldwide
- 📍 Use geolocation to get weather for current location
- 🌡️ View current conditions and 7-day forecast
- ⏰ See hourly forecasts for today and tomorrow
- ⭐ Save up to 4 favorite locations
- 🔄 Toggle between Celsius and Fahrenheit

## Live Site

**Render:** https://project-2-weather-app-m117.onrender.com

## Repository

**GitHub:** https://github.com/DaigaTahkapaa/Project-2-Weather-App

## Demo Video

**Hosted:** [Project-2-Weather-App-Video](https://laureauas-my.sharepoint.com/:v:/g/personal/dat00012_laurea_fi/IQDKU2PGtTfEQ7dIZx2iFhsKAZPScsxDrfDsduaflCElcjc?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=7XYtit)

Timestamps:
- 00:00 Intro
- 00:58 Project Overview
- 02:47 Demo
- 04:49 Conclusion

---

## Technologies Used

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (Grid, Custom Properties)
- **Backend:** Node.js, Express
- **APIs:** OpenWeatherMap (Geocoding, One Call 3.0, Reverse Geocoding)
- **Deployment:** Render.com
- **Icons:** Custom SVG sprite, svg icons from [Phosphor](https://phosphoricons.com/)

---

## Key Features

- **City Search with Autocomplete:** Type a city name and get suggestions from the [Geocoding API](https://openweathermap.org/api/geocoding-api). Handles duplicates and shows state/country to tell apart locations with same name.
- **Geolocation:** Click the pin icon to automatically detect your location and fetch local weather.
- **Current Weather:** Displays temperature, feels-like, weather description, precipitation (rain/snow), and wind speed/direction.
- **7-Day Forecast:** Daily high/low temperatures, precipitation amounts, chance of precipitation, and wind conditions.
- **Hourly Forecast Modal:** Click "hourly forecast" on today or tomorrow to see hour-by-hour breakdown.
- **Favorites System:** Star any location to save it (max 4). Favorites persist in `localStorage` - and display mini weather cards showing the last refreshed time — both your local time and the corresponding time at that location.
(e.g., if you refresh at 12:00 in Finland, Canberra’s card will show 12:00 and (21:00)).
- **Unit Toggle:** Switch between metric (°C, m/s) and imperial (°F, mph). Preference persists across sessions.
- **Temperature Color Coding:** Temperatures are color-coded from blue (freezing) to red (hot) for quick visual scanning.
- **Responsive Layout:** Works on desktop and mobile screens.

---

## APIs Used

### OpenWeatherMap (3 endpoints via backend proxy)

| Endpoint | Purpose |
|----------|---------|
| [**Geocoding API**](https://openweathermap.org/api/geocoding-api) | Converts city names to lat/lon coordinates |
| [**Reverse Geocoding API**](https://openweathermap.org/api/geocoding-api) | Converts coordinates to city name (for geolocation) |
| [**One Call API 3.0**](https://openweathermap.org/api) | Fetches current, hourly, and daily weather data |

All API calls go through an Express proxy server (`/server`) to keep the API key secure and not exposed in the frontend.

---

## How to Run Locally

### Prerequisites
- Node.js (v18 or later recommended)
- An OpenWeatherMap API key (free tier works)

### Step 1 — Clone the repository

```bash
git clone https://github.com/DaigaTahkapaa/Project-2-Weather-App.git
cd Project-2-Weather-App
```

### Step 2 — Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in the `server/` folder:

```env
OPENWEATHER_API_KEY=your_api_key_here
PORT=3000
```

### Step 3 — Start the server

```bash
node index.js
```

The server will start at `http://localhost:3000` and serve the frontend files automatically.

### Step 4 — Open in browser

Navigate to `http://localhost:3000` to use the app.

---

## Project Structure

```
Project-2-Weather-App/
├── frontend/
|   ├── assets/
|   |   └──sprite.svg   # SVG sprite for icons
│   ├── app.js          # All frontend JavaScript
│   ├── index.html      # Main HTML page
│   ├── README.md       # This file
│   └── style.css       # Styles with CSS custom properties
├── screenshots/        # Screenshots for README
├── server/
│   ├── index.js        # Express proxy server
│   ├── package.json    # Server dependencies
│   └── .env            # API key (not committed)
└── .gitignore
```

---

## Screenshots

**Initial view — Freshly opened app with search bar ready.**
| Desktop | Mobile |
|---------|--------|
| ![Initial desktop](/screenshots/Desktop-initial.png) | ![Initial mobile](/screenshots/Mobile-initial.jfif) |

**Search in action — Entering a location to fetch weather data.**
| Desktop | Mobile |
|---------|--------|
| ![Search desktop](/screenshots/Desktop-search.png) | ![Search mobile](/screenshots/Mobile-search.jfif) |

**Current weather card — Snapshot of temperature, conditions, and times for the selected location.**
| Desktop | Mobile |
|---------|--------|
| ![Current desktop](/screenshots/Desktop-current-weather-card.png) | ![Current mobile](/screenshots/Mobile-current.jfif) |

**7‑day forecast — Extended outlook showing daily highs and lows.**
| Desktop | Mobile |
|---------|--------|
| ![7-day desktop](/screenshots/Desktop-7-day-forcast.png) | ![7-day mobile](/screenshots/Mobile-daily.jfif) |

**Hourly forecast — Detailed breakdown of temperature and conditions throughout the day.**
| Desktop | Mobile |
|---------|--------|
| ![Hourly desktop](/screenshots/Desktop-h-forecast-modal.png) | ![Hourly mobile](/screenshots/Mobile-modal.jfif) |

**Favorites saved — Starred locations displayed with mini cards and custom temperature color scale.**
| Desktop | Mobile |
|---------|--------|
| ![Favorites desktop](/screenshots/Desktop-Favourites.png) | ![Favorites mobile](/screenshots/Mobile-favorites.jfif) |

**Unit toggle — Switching between °C and °F.**
| Desktop | Mobile |
|---------|--------|
| ![Unit toggle desktop](/screenshots/Desktop-imperial.png) | ![Unit toggle mobile](/screenshots/Mobile-imperial.jfif) |

---

## Self-Assessment (35 points total)

### 1. Core Functionality and Usability (10 points)

| Criterion | Points | Notes |
|-----------|--------|-------|
| **Primary user stories** | 4/4 | User can search cities, view weather, save favorites, use geolocation, toggle units—all without blockers |
| **Result quality** | 3/3 | Correct weather data displayed including current conditions, 7-day forecast, hourly data |
| **Error and edge cases** | 2/2 | Handles "no results", API errors, geolocation denied/timeout with clear messages |
| **Retry and navigation** | 1/1 | User can search again, clear input, refresh weather without page reload |

**Subtotal:** 10/10

### 2. API Integration and Data Handling (8 points)

| Criterion | Points | Notes |
|-----------|--------|-------|
| **Request construction** | 3/3 | Correct endpoints, query params, API key passed via proxy |
| **Parsing and selection** | 2/2 | Extracts relevant fields (temp, weather conditions, wind, precipitation), ignores noise |
| **Error handling for API** | 2/2 | Failed responses show user-friendly messages, doesn't break UI |
| **Polite usage** | 1/1 | Debounced search input, refresh button cooldown, staggered favorite refreshes |

**Subtotal:** 8/8

### 3. Front-End Layout and Interaction (5 points)

| Criterion | Points | Notes |
|-----------|--------|-------|
| **Layout and grouping** | 2/2 | Clear sections: search, current weather, forecast, favorites |
| **Interaction** | 1/1 | Loading states, instant UI updates, no page reloads |
| **Responsiveness** | 1/1 | Works on desktop and narrower screens, grid adjusts |
| **Visual consistency** | 1/1 | Consistent colors via CSS variables, icons from SVG sprite |

**Subtotal:** 5/5

### 4. Code Quality and Architecture (5 points)

| Criterion | Points | Notes |
|-----------|--------|-------|
| **Structure** | 2/2 | Frontend/server separation, organized sections in app.js with comments |
| **Naming and comments** | 1/1 | Descriptive function names, JSDoc comments, section headers |
| **Logic and flow** | 0.5/1 | Functions are focused, data flow is clear (fetch → parse → render) |
| **Defensive coding** | 0.5/1 | Null checks, try/catch blocks, safe array access |

**Subtotal:** 4/5

### 5. Documentation (2 points)

| Criterion | Points | Notes |
|-----------|--------|-------|
| **README essentials** | 1/1 | Live URL, setup instructions, feature list, API notes |
| **Clarity and reflection** | 1/1 | Reflection section with learnings and limitations |

**Subtotal:** 2/2

### 6. Demo Video and Git Portfolio (5 points)

| Criterion | Points | Notes |
|-----------|--------|-------|
| **Video structure and clarity** | 2/2 | Explains problem, API choice, solution, demo |
| **Evidence in video** | 1/1 | Shows live app, key flows, results |
| **Git portfolio quality** | 1/1 | Public repo, .gitignore excludes node_modules and .env |
| **Links and access** | 1/1 | README links to video and repo |

**Subtotal:** 5/5 with penalty for video being late 1 day 4.8/5

---

### **Total Self-Assessment: 33.8/35**

---

## Reflection

### What I Learned

Building this weather app reinforced several key concepts:

1. **Working with multiple APIs:** The OpenWeatherMap ecosystem requires chaining API calls—first geocoding to get coordinates, then weather data. Managing this flow and handling cases where one call depends on another was a valuable exercise.

2. **Proxy servers for API security:** Exposing API keys in frontend code is a security risk. Setting up an Express proxy to handle API calls server-side keeps the key secure while allowing the frontend to make requests freely.

3. **Timezone handling:** Displaying "local time" for a weather location (not the user's timezone) was trickier than expected. OpenWeatherMap provides `timezone_offset` in seconds, which needs to be applied correctly to timestamps.

4. **Debouncing and rate limiting:** To avoid hammering the API, I implemented debounced search (waits 350ms after typing stops) and a refresh button cooldown (10 seconds). These patterns improve UX and reduce unnecessary API calls.

5. **Accessibility considerations:** ARIA attributes for the autocomplete (`role="listbox"`, `aria-selected`), keyboard navigation, and screen-reader labels make the app usable for more people.

### Known Limitations

- **Location Suggestions:** Currently powered by the OpenWeather Geocoding API. Suggestions only appear for exact string matches—partial or misspelled inputs return no results. For example, typing "Rovanie" yields nothing; you must enter the full "Rovaniemi" to see it suggested.
- **Duplicate Location Handling:** Locations with the same name, country, and state but slightly different coordinates are deduplicated by keeping only the first result. Without a map picker, there's no practical way to distinguish them—this was deemed acceptable for the project scope.
- **Responsive Layout:** Works on desktop and mobile screens, but not perfect. Ran out of time to tweak details for smaller screen layouts. Behavior is acceptable (tested on personal phones and browser developer tools).
- **Accessibility (work in progress):** Basic semantic markup and ARIA labels are present, but the implementation hasn't been thoroughly tested. Keyboard navigation and screen-reader support would need deeper review with more time.
- **Render Cold Starts:** On Render's free tier, backend services spin down after inactivity. The next request triggers a cold start, which can delay responses by 30–60 seconds. This makes the app feel sluggish if it hasn't been used recently.
- **No offline support:** The app requires an internet connection. A service worker could cache recent weather data.
- **API rate limits:** OpenWeatherMap's free tier has call limits. Heavy usage could hit these limits.
- **No weather alerts:** The One Call API provides alerts, but they're not displayed.
- **Single language:** UI is English-only; OpenWeatherMap supports localized weather descriptions.
- **No dark mode:** Could be added with CSS custom properties and a toggle.

### If I Had More Time

1. Implement a more flexible autocomplete solution with typo-tolerant, progressive suggestions
2. Add a map picker for selecting between duplicate locations with different coordinates
3. Fine-tune responsive layouts for smaller screens
4. Thoroughly test and improve accessibility (keyboard navigation, screen-reader compatibility)
5. Add drag-and-drop to reorder favorite cards
6. Add weather alerts display
7. Implement dark/light theme toggle
8. Use weather icon set that would allow personal styling
9. Add a "recent searches" history
10. Add proper TypeScript for better type safety
11. Set up ESLint/Prettier with pre-commit hooks

---

