/* File: app.js | Author: Your Name | Date: 03.11.2025 09:00 | Purpose: Handles API calls and UI updates */

/*// Modern approach used in this project: fetch + Promise + async/await
async function loadData() {                              // 13) Declare an async function so we can use await inside
  try {                                                  // 14) Start a try block to catch network or parsing errors
    const response = await fetch("some-url-here");       // 15) Send the request and pause here until the response arrives
    if (!response.ok) {                                  // 16) If HTTP status is NOT in the range 200-299
      console.log("Server returned error status:", response.status); // 17) Log the HTTP status code
      return;                                            // 18) Stop the function early because something went wrong
    }
    const data = await response.json();                  // 19) Read and parse the response body as JSON into a JavaScript object
    console.log("Parsed JSON object:", data);            // 20) Log the parsed object (easier to use than raw text)
  } catch (err) {                                        // 21) If fetch fails or JSON is invalid, execution jumps here
    console.log("Network error or invalid JSON:", err);  // 22) Log the error so the developer can inspect it
  }                                                      // 23) End of try-catch
}                                                        // 24) End of loadData function */

// =====================================================================
// === 1. DOM ELEMENT REFERENCES: Connect JavaScript to HTML elements ===
// =====================================================================
