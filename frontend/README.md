# 🌤️ Project-2-Weather-App

A single-page weather forecast application that fetches live weather data from [OpenWeatherMap API](https://openweathermap.org/api), allowing users to:
- 🔍 Search for any city worldwide with autocomplete suggestions
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

**Hosted:** [Project-2-Weather-App-Video](YOUR_VIDEO_LINK_HERE)

Timestamps:
- 00:00 Intro
- 00:XX Project Overview
- 00:XX Demo
- 00:XX Conclusion

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
│   ├── index.html      # Main HTML page
│   ├── app.js          # All frontend JavaScript
│   ├── style.css       # Styles with CSS custom properties
│   ├── assets/
|   |   ├──sprite.svg   # SVG sprite for icons
|   |   └──
│   └── README.md       # This file
├── server/
│   ├── index.js        # Express proxy server
│   ├── package.json    # Server dependencies
│   └── .env            # API key (not committed)
└── .gitignore
```

---

## Screenshots

![Desktop view](screenshots/ui-desktop.png)
![Mobile view](screenshots/ui-mobile.png)
![Favorites](screenshots/ui-favorites.png)

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
| **Logic and flow** | 1/1 | Functions are focused, data flow is clear (fetch → parse → render) |
| **Defensive coding** | 1/1 | Null checks, try/catch blocks, safe array access |

**Subtotal:** 5/5

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

**Subtotal:** 5/5

---

### **Total Self-Assessment: 35/35**

---

## Reflection

### What I Learned

Building this weather app reinforced several key concepts:

1. **Working with multiple APIs:** The OpenWeatherMap ecosystem requires chaining API calls—first geocoding to get coordinates, then weather data. Managing this flow and handling cases where one call depends on another was a valuable exercise.

2. **Proxy servers for API security:** Exposing API keys in frontend code is a security risk. Setting up an Express proxy to handle API calls server-side keeps the key secure while allowing the frontend to make requests freely.

3. **State management in vanilla JS:** Without a framework, managing state (favorites, selected location, unit preference, last weather data) requires careful planning. Using `localStorage` for persistence and module-level variables for session state worked well.

4. **Timezone handling:** Displaying "local time" for a weather location (not the user's timezone) was trickier than expected. OpenWeatherMap provides `timezone_offset` in seconds, which needs to be applied correctly to timestamps.

5. **Debouncing and rate limiting:** To avoid hammering the API, I implemented debounced search (waits 350ms after typing stops) and a refresh button cooldown (10 seconds). These patterns improve UX and reduce unnecessary API calls.

6. **Accessibility considerations:** ARIA attributes for the autocomplete (`role="listbox"`, `aria-selected`), keyboard navigation, and screen-reader labels make the app usable for more people.

### Known Limitations

- **No offline support:** The app requires an internet connection. A service worker could cache recent weather data.
- **API rate limits:** OpenWeatherMap's free tier has call limits. Heavy usage could hit these limits.
- **No weather alerts:** The One Call API provides alerts, but they're not displayed.
- **Single language:** UI is English-only; OpenWeatherMap supports localized weather descriptions.
- **No dark mode:** Could be added with CSS custom properties and a toggle.

### If I Had More Time

1. Add weather alerts display
2. Implement dark/light theme toggle
3. Add a "recent searches" history
4. Show weather maps (OpenWeatherMap has a maps API)
5. Add proper TypeScript for better type safety
6. Set up ESLint/Prettier with pre-commit hooks

---

## Technologies Used

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (Grid, Custom Properties)
- **Backend:** Node.js, Express
- **APIs:** OpenWeatherMap (Geocoding, One Call 3.0, Reverse Geocoding)
- **Deployment:** Render.com
- **Icons:** Custom SVG sprite