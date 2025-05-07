// index.js

// --- Helper function to update auth section visibility ---
function updateAuthSection() {
    const authButtons = document.querySelector('.auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const userEmailSpan = document.getElementById('user-email');

    if (!authButtons || !userProfile || !userEmailSpan) {
        console.error("Auth section elements not found.");
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));

    if (user && user.email) {
        // User is logged in
        authButtons.style.display = 'none'; // Hide login/register buttons
        userEmailSpan.textContent = user.email; // Display user's email
        userProfile.style.display = 'flex'; // Show user profile section
    } else {
        // User is not logged in
        authButtons.style.display = 'flex'; // Show login/register buttons
        userEmailSpan.textContent = ''; // Clear email
        userProfile.style.display = 'none'; // Hide user profile section
    }
}

// --- Logout Function ---
function logout() {
    localStorage.removeItem('user'); // Clear user data from local storage
    updateAuthSection(); // Update the UI to show login/register buttons
    // Optionally redirect to home page or show a logout message
    // window.location.href = "index.html";
    alert("You have been logged out."); // Simple alert for now
}

// --- Modal Handling ---
// Use CSS classes for modal visibility for smoother transitions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex'; // Ensure it's visible for transitions
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        // Wait for transition before hiding completely
        modal.addEventListener('transitionend', function handler() {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
            modal.removeEventListener('transitionend', handler);
        });
    }
}

function switchModal(currentModalId, targetModalId) {
    closeModal(currentModalId);
    // A small delay might be needed depending on transition duration
    setTimeout(() => {
        openModal(targetModalId);
    }, 200); // Adjust delay as needed based on your CSS transition time
}

// Close modal when clicking outside of the modal content
window.onclick = function (event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
        // Wait for transition before hiding completely
         event.target.addEventListener('transitionend', function handler() {
             if (!event.target.classList.contains('show')) {
                 event.target.style.display = 'none';
             }
             event.target.removeEventListener('transitionend', handler);
         });
    }
};


// --- Form Submission Handlers ---

// Register Form Submission
document.querySelector("#registerModal form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Get input values
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const bloodType = document.getElementById("register-blood").value;

    // Basic validation
    if (!name || !email || !password || !bloodType) {
        alert("Please fill in all registration fields.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, bloodType })
        });

        const data = await response.json();
        alert(data.message); // Show message from backend

        if (response.ok) {
            // Clear input fields
            event.target.reset(); // Reset the form

            // Close the register modal
            closeModal('registerModal');

            // Handle matched donors (as per your original logic, consider refining this)
            // This part might need adjustment depending on your backend's response after registration
            if (data.donors && Array.isArray(data.donors) && data.donors.length > 0) {
                 localStorage.setItem("matchedDonors", JSON.stringify(data.donors));
                 window.location.href = "donor.html"; // Redirect to donor page
            } else {
                // No donors found, redirect or stay on current page
                // window.location.href = "index.html"; // Example: Redirect to home
            }

        }
    } catch (error) {
        console.error("Error during registration:", error);
        alert("Registration failed. Please try again.");
    }
});

// Login Form Submission
document.querySelector("#loginModal form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent form from reloading the page

    // Get input values
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    // Validate input fields
    if (!email || !password) {
        alert("Please fill in both fields.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        alert(data.message); // Show message from backend

        if (response.ok) {
            // Assuming the backend returns user data including email on successful login
            if (data.user && data.user.email) {
                 // Store user data in local storage
                 localStorage.setItem("user", JSON.stringify(data.user));

                 // Update the UI to show the logged-in state
                 updateAuthSection();
            } else {
                 console.error("Login successful but user data or email is missing in the response:", data);
                 alert("Login successful, but couldn't retrieve user information.");
                 // You might still want to proceed or handle this case specifically
            }


            // Clear input fields
            event.target.reset(); // Reset the form

            // Close the login modal
            closeModal('loginModal');

            // Redirect to the homepage or dashboard
            // Use a small delay to allow the modal to close visually
             setTimeout(() => {
                 // Consider whether you need a full page reload or can update dynamically
                 // window.location.href = "index.html"; // Change to your dashboard URL if needed
                 // If staying on the page, the updateAuthSection() call handles the display
             }, 300); // Adjust delay

        } else {
            // Handle non-OK responses (e.g., invalid credentials)
             alert(data.message || "Login failed. Please check your credentials.");
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert("An error occurred during login. Please try again.");
    }
});

// Donate Form Submission
// Changed event listener target to the form itself
document.querySelector("#donateModal form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent form from reloading the page

    // Get input values
    const name = document.getElementById("donate-name").value.trim();
    const bloodType = document.getElementById("donate-blood").value;
    const location = document.getElementById("donate-location").value.trim();
    const date = document.getElementById("donate-date").value;
    const number = document.getElementById("donate-number").value.trim(); // Trim phone number too

    // Validate fields
    if (!name || !bloodType || !location || !date || !number) {
        alert("Please fill all donation fields.");
        return;
    }

    try {
        const response = await fetch("http://localhost:8080/donate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, bloodType, location, date, number })
        });

        const data = await response.json();

        alert(data.message); // Show message from backend

        if (response.ok) {
            // Clear form fields
            event.target.reset(); // Reset the form

            // Close modal
            closeModal('donateModal');
        }
    } catch (error) {
        console.error("Error submitting donation:", error);
        alert("Donation submission failed. Try again.");
    }
});


// Request Form Submission
// Changed event listener target to the form inside the modal
document.querySelector("#requestModal form").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("request-name").value.trim();
    const bloodType = document.getElementById("request-blood").value;
    const location = document.getElementById("request-location").value.trim();
    const units = document.getElementById("request-units").value; // Renamed variable to units
    const urgency = document.getElementById("request-urgency").value;

    // Retrieve user email from local storage if logged in
    const user = JSON.parse(localStorage.getItem('user'));
    const userEmail = user ? user.email : null;

    if (!name || !bloodType || !location || !units || !urgency) { // Used units variable
        alert("Please fill all request fields.");
        return;
    }

    if (!userEmail) {
         alert("Please log in to request blood.");
         // Optionally open the login modal here
         // openModal('loginModal');
         return;
    }


    try {
        const response = await fetch("http://localhost:8080/request-blood", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                bloodType,
                location,
                units, // Used units variable
                urgency,
                email: userEmail // Pass the actual user email
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message); // Show success message

            // Handle matched donors
            if (data.donors && Array.isArray(data.donors) && data.donors.length > 0) {
                localStorage.setItem("matchedDonors", JSON.stringify(data.donors));
                window.location.href = "donor.html"; // Redirect to donor page
            } else {
                alert("No matching donors available at the moment.");
                // Optionally, stay on the current page or redirect elsewhere
            }

            // Clear form and close modal
            event.target.reset(); // Reset the form
            closeModal("requestModal");

        } else {
             // Handle non-OK responses
             alert(data.message || "Blood request failed. Please try again.");
        }

    } catch (error) {
        console.error("Fetch failed:", error);
        alert("Something went wrong with the blood request. Please check your network or server.");
    }
});


// --- Blood Type Selection Logic ---
let selectedBloodGroup = null; // Use a single variable
const bloodTypeElements = document.querySelectorAll(".blood-type");

// Add click event to each blood group button
bloodTypeElements.forEach(el => {
    el.addEventListener("click", () => {
        // Remove highlight from all
        bloodTypeElements.forEach(item => item.classList.remove("selected"));

        // Add highlight to selected
        el.classList.add("selected");
        selectedBloodGroup = el.textContent.trim();
        console.log("Selected blood type:", selectedBloodGroup);
    });
});

// --- Hero Button Click Handlers ---
// Add event listeners after the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    const donateButton = document.getElementById("donateBtn");
    const requestButton = document.getElementById("requestBtn");
    const emergencyRequestButton = document.querySelector(".emergency-card .blood-actions .btn-primary"); // The request button in the card
    const logoutButton = document.getElementById('logout-button'); // Get the logout button

    // Update the auth section visibility on page load
    updateAuthSection();


    if (donateButton) {
        donateButton.addEventListener("click", function () {
            console.log("Hero Donate button clicked!");
            openModal("donateModal");
        });
    }

     // Handle both hero Request and emergency card Request buttons
    function handleRequestClick() {
        console.log("Request button clicked!");
        // Open the request modal, which will handle the form submission
        openModal("requestModal");
        // Note: The logic to redirect to donor.html based on selected blood type
        // from the grid needs to be handled by the form submission inside the modal
        // or a separate function triggered by clicking the Request button *after* selection.
        // Your current HTML and JS mix these concerns.
        // The current form submission logic redirects to donor.html if matches are found.
    }

    if (requestButton) {
        requestButton.addEventListener("click", handleRequestClick);
    }

     if (emergencyRequestButton) {
         emergencyRequestButton.addEventListener("click", function() {
             if (!selectedBloodGroup) {
                 alert("Please select a blood type from the grid first!");
                 return;
             }
             // If a type is selected, open the request modal.
             // The request form submission will then use this selected type (needs JS logic).
             // For now, we just open the modal.
             openModal("requestModal");

             // Optional: Pre-fill the blood type in the modal if selectedBloodGroup is set
             const requestBloodSelect = document.getElementById('request-blood');
             if (requestBloodSelect && selectedBloodGroup) {
                 requestBloodSelect.value = selectedBloodGroup;
             }
         });
     }

     // Add event listener for the logout button
     if (logoutButton) {
        logoutButton.addEventListener('click', logout);
     }


    // --- Leaflet Map Initialization ---
    // Map initialization code should be inside DOMContentLoaded
    let map;
    let markers = []; // Array to store markers

    try {
        // Check if the map div exists
        const mapElement = document.getElementById('map');
        if (mapElement) {
            // Check if Leaflet is loaded
            if (typeof L !== 'undefined') {
                map = L.map('map').setView([20.5937, 78.9629], 5); // India center
                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);
                console.log("Map initialized successfully");
            } else {
                console.error("Leaflet library not loaded.");
                // Optionally display a message to the user
                 if (mapElement.parentNode) {
                     mapElement.parentNode.innerHTML = "<p>Error loading map library. Please try refreshing the page.</p>";
                 }
            }
        } else {
             console.warn("Map element with ID 'map' not found.");
             // The map div might be inside a modal or another hidden element.
             // Ensure it's in the visible part of the DOM when initialized.
             // If it's in a modal, you might need to initialize it *after* the modal is shown.
        }

    } catch (e) {
        console.error("Error initializing map:", e);
         const mapElement = document.getElementById('map');
         if (mapElement && mapElement.parentNode) {
             mapElement.parentNode.innerHTML = `<p>Error initializing map: ${e.message}. Please try refreshing.</p>`;
         }
    }


     // --- Emergency Locator Search ---
    // Add event listener to the search button
    const searchButton = document.querySelector(".location-search button");
    if (searchButton) {
        searchButton.addEventListener("click", searchNearby);
    }

    function searchNearby() {
        // alert("Search button clicked!"); // Removed unnecessary alert
        const locationInput = document.getElementById("locationInput");
        const location = locationInput ? locationInput.value.trim() : '';

        if (!location) {
            alert("Please enter a location");
            return;
        }

        const resultsDiv = document.getElementById("searchResults");
         if (resultsDiv) {
             resultsDiv.innerHTML = "<p>Searching...</p>";
         }


        console.log("Sending search request for location:", location);

        // Make sure the map is initialized before attempting to use it
        if (!map) {
            console.error("Map not initialized, cannot perform search with map display.");
            if (resultsDiv) {
                resultsDiv.innerHTML = "<p>Map is not available. Search results may be limited.</p>";
            }
             // Still attempt to fetch data even if map fails
             fetchSearchData(location, resultsDiv);

            return;
        }

         // Attempt to get user's current location for distance sorting (Optional but good)
         navigator.geolocation.getCurrentPosition(async (position) => {
             const lat = position.coords.latitude;
             const lng = position.coords.longitude;
             console.log("User location:", lat, lng);
             await fetchSearchData(location, resultsDiv, lat, lng);
         }, async (error) => {
             console.warn("Could not get user location:", error.message);
             // Continue search without user location
             await fetchSearchData(location, resultsDiv);
         });
    }

    async function fetchSearchData(location, resultsDiv, userLat = null, userLng = null) {
         try {
             const response = await fetch("http://localhost:8080/search", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ location, lat: userLat, lng: userLng }) // Send user location if available
             });

             console.log("Response status:", response.status);
             if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
             }

             const data = await response.json();
             console.log("Received data:", data);

             const locationInput = document.getElementById("locationInput");
              if(locationInput) locationInput.value = ""; // Clear input

             // Clear previous markers
              if (map && markers && markers.length) {
                  markers.forEach(marker => map.removeLayer(marker));
              }
              markers = [];
              const validMarkers = []; // To store coordinates for fitting bounds

              if (!data || data.length === 0) {
                  if (resultsDiv) resultsDiv.innerHTML = "<p>No nearby locations found.</p>";
                  // Optionally reset map view if no results
                  if (map) map.setView([20.5937, 78.9629], 5); // Center back on India
                  return;
              }

              // Display results as cards
               if (resultsDiv) {
                   const html = data.map(item => `
                       <div class="result-card">
                           <h3>${item.name}</h3>
                           <p>${item.address}</p>
                           ${item.city ? `<p>City: ${item.city}</p>` : ''}
                       </div>
                   `).join("");
                   resultsDiv.innerHTML = html;
               }


              // Add markers to map
               if (map) {
                   data.forEach(item => {
                       if (item.lat && item.lng) {
                           try {
                               const marker = L.marker([item.lat, item.lng])
                                   .addTo(map)
                                   .bindPopup(`<b>${item.name}</b><br>${item.address || item.city || ''}`);
                               markers.push(marker);
                               validMarkers.push([item.lat, item.lng]);
                           } catch (e) {
                               console.error("Error adding marker:", e);
                           }
                       } else {
                           console.warn("Location item has missing lat/lng:", item);
                       }
                   });

                   // Fit map to markers if we have any
                   if (validMarkers.length > 0) {
                       try {
                           map.fitBounds(validMarkers, { padding: [50, 50] }); // Add padding
                       } catch (e) {
                           console.error("Error fitting bounds:", e);
                           // Fallback to centering on the first marker or a default location
                           if (validMarkers[0]) {
                                map.setView(validMarkers[0], 10); // Center on first marker, zoom level 10
                           }
                       }
                   }
               }


         } catch (error) {
             console.error("Search error:", error);
              if (resultsDiv) {
                 resultsDiv.innerHTML = `<p>Error fetching data: ${error.message}</p>`;
              }
         }
    }


    document.getElementById("viewBloodBankBtn").addEventListener("click", function () {
        // Note: This button currently fetches HARDCODED data.
        // If you want to fetch from the backend /search endpoint,
        // you would call `searchNearby` or a similar function here,
        // possibly with a predefined search query like "blood bank in [current city]".
        // For now, keeping your original hardcoded logic.
        const bloodBanks = [
            { name: "Apollo Blood Bank", address: "Delhi" },
            { name: "Red Cross Society", address: "Mumbai" },
            { name: "Lifeline Blood Bank", address: "Bangalore" },
            { name: "Rotary Blood Bank", address: "Chennai" }
        ];

        const container = document.getElementById("bloodBanksList"); // Assuming you want to show this in #bloodBanksList
        if (!container) {
             console.error("#bloodBanksList element not found");
             return;
        }

        if (bloodBanks.length === 0) {
            container.innerHTML = "<p>No blood banks found.</p>";
            return;
        }

        const html = bloodBanks.map(bank => `
            <div class="result-card">
                <h3>${bank.name}</h3>
                <p>${bank.address}</p>
            </div>
        `).join("");

        container.innerHTML = html;
    });

}); // End DOMContentLoaded listener


// --- Chatbot Logic ---
// Ensure toggleChat is globally accessible if used in onclick attribute
function toggleChat() {
    const chatbot = document.getElementById("chatbotContainer");
    if (chatbot) {
        chatbot.style.display = chatbot.style.display === "none" || chatbot.style.display === "" ? "flex" : "none";
         if (chatbot.style.display === "flex") {
             // Scroll to bottom when chat opens
             const chatBody = document.getElementById('chatBody');
             if (chatBody) {
                  chatBody.scrollTop = chatBody.scrollHeight;
             }
         }
    }
}

// Send a message to the chatbot
async function sendMessage() {
    const input = document.getElementById("userInput");
    const message = input ? input.value.trim() : '';
    if (message === "") return;

    const chatBody = document.getElementById("chatBody");
     if (!chatBody) {
         console.error("Chat body element not found.");
         return;
     }

    // Show user message
     const userMessageElement = document.createElement('div');
     userMessageElement.classList.add('chat-message', 'user');
     userMessageElement.innerHTML = `<strong>You:</strong> ${message}`;
     chatBody.appendChild(userMessageElement);


    // Show loading indicator
    const loadingId = showLoading(chatBody);

    // Get bot response
    try {
      // Use the updated getBotResponse function
      const response = await getBotResponse(message);
      // Remove loading indicator
      removeLoading(loadingId);
      // Show bot response
       const botMessageElement = document.createElement('div');
       botMessageElement.classList.add('chat-message', 'bot');
       botMessageElement.innerHTML = `<strong>LifeLink Assistant:</strong> ${response}`;
       chatBody.appendChild(botMessageElement);

    } catch (error) {
      // Remove loading indicator
      removeLoading(loadingId);
      // Show error message
       const errorMessageElement = document.createElement('div');
       errorMessageElement.classList.add('chat-message', 'bot', 'error'); // Add error class for potential styling
       errorMessageElement.innerHTML = `<strong>LifeLink Assistant:</strong> ${error.message}`;
       chatBody.appendChild(errorMessageElement);
    }

    if (input) input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight; // Auto-scroll to latest message
}

// Show loading indicator and return its ID
function showLoading(chatBody) {
    const loadingId = 'loading-' + Date.now();
    const loadingElement = document.createElement('div');
    loadingElement.id = loadingId;
    loadingElement.classList.add('chat-message', 'bot', 'loading'); // Add classes
    loadingElement.innerHTML = `<strong>LifeLink Assistant:</strong> <em>Thinking...</em>`;
    chatBody.appendChild(loadingElement);
    chatBody.scrollTop = chatBody.scrollHeight; // Scroll to show loading
    return loadingId;
}

// Remove loading indicator
function removeLoading(loadingId) {
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Get response from the bot - This function interacts with your backend /chat endpoint
async function getBotResponse(message) {
    try {
        const serverUrl = 'http://localhost:8080/chat';

        const response = await fetch(serverUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            // Attempt to parse error message from backend if available
             const errorBody = await response.text(); // Read as text first
             let errorMessage = `Failed to get response. Status: ${response.status}`;
             try {
                 const errorJson = JSON.parse(errorBody); // Try parsing as JSON
                 if (errorJson.reply) errorMessage = errorJson.reply;
                 else if (errorJson.error) errorMessage = errorJson.error;
                 else errorMessage = errorBody; // Fallback to raw text
             } catch (e) {
                  // If parsing fails, use the status text
                  errorMessage = `Failed to get response. Status: ${response.status} ${response.statusText}`;
             }


            throw new Error(errorMessage);
        }

        const data = await response.json();
        // Ensure the response structure matches what the backend sends ({ reply: "..." })
        if (data && data.reply) {
             return data.reply;
        } else {
             console.error("Unexpected response format from /chat:", data);
             throw new Error("Received unexpected response from assistant.");
        }

    } catch (error) {
        console.error("Error fetching from /chat endpoint:", error);
        // Provide a user-friendly error message
        return `Sorry, I'm having trouble communicating with my service right now. Please try again later. (${error.message})`;
    }
}

// Add event listeners when the DOM is loaded for the chatbot
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for the input field to detect Enter key
    const inputField = document.getElementById('userInput');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
                e.preventDefault(); // Prevent default form submission if input is inside a form
            }
        });
    }

    // Add event listener for the send button
    const sendButton = document.querySelector('.chat-footer button'); // Select button by class/tag
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
});