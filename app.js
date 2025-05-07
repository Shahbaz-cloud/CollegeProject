// app.js
require("dotenv").config();
const express = require("express");
const app = express();
const mysql = require("mysql");
const cors = require("cors");
const axios = require("axios"); // For making HTTP requests, e.g., to Gemini or Geocoding
// If you prefer using the google-generativeai client library:
// const { GoogleGenerativeAI } = require("@google/generative-ai");


const PORT = process.env.PORT || 8080; // Use environment variable for port

// Middleware
app.use(cors()); // Enable CORS for frontend interaction
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public')); // Serve static files from 'public' directory (if you have one)

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Shahbaj@12", // !! Store passwords securely, not in code or .env directly
    database: process.env.DB_NAME || "blood_donation"
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err.stack);
        // Exit process or handle error appropriately
        process.exit(1); // Exit if database connection fails
    }
    console.log("Connected to MySQL Database as id " + db.threadId);
});

// --- IMPORTANT SECURITY NOTE ---
// The current code stores and compares passwords in plaintext.
// This is a major security vulnerability.
// For production, you MUST hash passwords (e.g., using bcrypt)
// during registration and compare hashes during login.
// Implementing this requires significant changes to your user management logic
// and potentially database schema, which is outside the scope of minor corrections.
// Proceed with caution or implement hashing before production deployment.
// -------------------------------


// Google API Key (for Geocoding if you want to use it)
const Maps_API_KEY = process.env.Maps_API_KEY || "YOUR_Maps_API_KEY"; // Get from .env


// Gemini API Setup
// If you use the google-generativeai library:
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// If you use axios to call the API directly:
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";


// --- API Endpoints ---

// User Registration
app.post("/register", (req, res) => {
    const { name, email, password, bloodType } = req.body;

    // Basic input validation
    if (!name || !email || !password || !bloodType) {
        return res.status(400).json({ message: "All registration fields are required." });
    }

    // Check if email already exists
    const checkEmailSql = "SELECT id FROM users WHERE email = ?"; // Select only ID for efficiency
    db.query(checkEmailSql, [email], (err, results) => {
        if (err) {
            console.error("Error checking email:", err);
            return res.status(500).json({ message: "Database error during registration." });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: "Email already registered!" }); // Use 409 Conflict for existing resource
        }

        // Insert new user
        // !! Remember: Password is NOT hashed here. Implement hashing!
        const insertUserSql = "INSERT INTO users (name, email, password, bloodType) VALUES (?, ?, ?, ?)";
        db.query(insertUserSql, [name, email, password, bloodType], (err, result) => {
            if (err) {
                console.error("Error inserting user:", err);
                 // Check for duplicate entry errors specifically if needed
                return res.status(500).json({ message: "Error creating user account." });
            }

             // Optional: Fetch donors with compatible blood types immediately after registration
             // This matches the frontend's expectation based on your original JS
            let compatibleTypes = getCompatibleBloodTypes(bloodType);
            const fetchDonorsSql = "SELECT name, location, number, bloodType FROM donors WHERE bloodType IN (?) LIMIT 10"; // Limit results
             db.query(fetchDonorsSql, [compatibleTypes], (err, donors) => {
                 if (err) {
                     console.warn("Error fetching compatible donors after registration:", err);
                     // Continue registration success even if fetching donors fails
                 }

                 // Return user info and potentially matching donors
                res.status(201).json({
                    message: "User registered successfully!",
                    user: { id: result.insertId, name, email, bloodType }, // Return basic user info
                    donors: (donors && donors.length > 0) ? donors : [] // Return array or empty array
                });
             });
        });
    });
});

// User Login
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // Basic input validation
     if (!email || !password) {
         return res.status(400).json({ message: "Email and password are required." });
     }

    // !! Remember: Password is NOT verified securely here. Implement hashing!
    const sql = "SELECT id, name, email, bloodType FROM users WHERE email = ? AND password = ?"; // Select relevant fields
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error("Error fetching user for login:", err);
            return res.status(500).json({ message: "Database error during login." });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" }); // Use 401 Unauthorized
        }

        // Login successful
        const user = results[0];
        // In a real app, you'd issue a token (JWT) here, not just return user data.
        res.json({
            message: "Login successful!",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                bloodType: user.bloodType
            }
        });
    });
});

// Donation Form Submission
app.post('/donate', (req, res) => {
    const { name, bloodType, location, date, number } = req.body;

    if (!name || !bloodType || !location || !date || !number) {
        return res.status(400).json({ message: "All donation fields are required!" });
    }

    // Insert donation data into donors table
    const sql = "INSERT INTO donors (name, bloodType, location, `date`, `number`) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [name, bloodType, location, date, number], (err, result) => {
        if (err) {
            console.error("Error inserting donation:", err);
            // Check for specific database errors if needed (e.g., constraints)
            return res.status(500).json({ message: "Error saving donation data." });
        }
        console.log(`Donation recorded from ${name} (${bloodType}) at ${location}`);
        res.status(201).json({ message: "Donation submitted successfully! Thank you." }); // Use 201 Created
    });
});

// Blood Request
app.post('/request-blood', async (req, res) => {
    const { name, email, bloodType, location, units, urgency } = req.body; // Corrected 'number' to 'units'

    if (!name || !bloodType || !location || !units || !urgency) {
        return res.status(400).json({ message: "All blood request fields are required!" });
    }

    // Find compatible blood types
    let compatibleTypes = getCompatibleBloodTypes(bloodType);

    // Fetch donors with compatible blood types
    // Added ORDER BY clause for basic sorting (exact match first)
    const fetchDonorsSql = `SELECT name, location, number, bloodType FROM donors WHERE bloodType IN (?) ORDER BY FIELD(bloodType, ?) DESC LIMIT 20`; // Limit results
     // Note: Location-based sorting is more complex and might require coordinates.
     // The sortDonorsByPriority function is defined but not used here because
     // sorting needs to happen at the DB level or after fetching ALL donors.
     // For simplicity here, sorting is done by exact blood type match first using FIELD().

    db.query(fetchDonorsSql, [compatibleTypes, bloodType], (err, donors) => { // Pass bloodType again for FIELD()
        if (err) {
            console.error("Error fetching donors for blood request:", err);
            return res.status(500).json({ message: "Error processing blood request." });
        }

        // Optionally save the blood request to the database here
        // const insertRequestSql = "INSERT INTO blood_requests (patient_name, email, blood_type, location, units, urgency) VALUES (?, ?, ?, ?, ?, ?)";
        // db.query(insertRequestSql, [name, email || 'anonymous@example.com', bloodType, location, units, urgency], (err, result) => {
        //     if (err) {
        //         console.error("Error saving blood request:", err);
        //         // Log the error, but still respond to the frontend
        //     }
        // });


        res.status(200).json({
            message: "Blood request submitted successfully. Searching for donors...",
            donors: (donors && donors.length > 0) ? donors : [] // Return array or empty array
        });
    });
});

// Get compatible blood types (Helper function - correct as provided)
function getCompatibleBloodTypes(bloodType) {
    const compatibility = {
        'O-': ['O-'],
        'O+': ['O-', 'O+'],
        'A-': ['O-', 'A-'],
        'A+': ['O-', 'O+', 'A-', 'A+'],
        'B-': ['O-', 'B-'],
        'B+': ['O-', 'O+', 'B-', 'B+'],
        'AB-': ['O-', 'A-', 'B-', 'AB-'],
        'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
    };

    return compatibility[bloodType] || [bloodType]; // Return array, fallback to just the type
}

// Sort donors by priority (exact blood type match first, then by location)
// This function is currently NOT used in the /request-blood endpoint's DB query.
// It would be used if you fetched *all* donors and then sorted in JS,
// or if you needed more complex sorting than simple SQL ORDER BY.
function sortDonorsByPriority(donors, bloodType, location) {
    // **Note:** Location-based sorting requires donor coordinates and request coordinates
    // and calculating distance for each pair, which can be performance-intensive
    // for large numbers of donors. SQL spatial functions or external services
    // are better for this in production.
     console.log("Sorting donors (Placeholder logic)");
    return donors.sort((a, b) => {
        // Exact blood type match gets priority
        const aExact = (a.bloodType === bloodType);
        const bExact = (b.bloodType === bloodType);

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // If both are exact match or both are not, compare by location (placeholder)
        // Implement distance calculation and comparison here if you have coordinates
        return 0;
    });
}


// Search endpoint with local database lookup and hardcoded fallback
app.post("/search", async (req, res) => {
    console.log("Search request received:", req.body);
    const { location, lat, lng } = req.body; // Receive user's location if available

    if (!location) {
        return res.status(400).json({ error: "Location is required for search." });
    }

    try {
        // 1. Search local database for blood banks by city/location name
        const fetchBloodBanksSql = "SELECT name, address, city, lat, lng FROM blood_banks WHERE city LIKE ? OR address LIKE ? LIMIT 50"; // Search city or address, limit results
        const searchTerm = `%${location}%`;

        db.query(fetchBloodBanksSql, [searchTerm, searchTerm], async (err, localResults) => {
            if (err) {
                console.error("Error fetching blood banks from DB:", err);
                // Continue with fallback/API even if DB query fails
            }

            let allResults = [...(localResults || [])]; // Start with DB results

            // 2. Add predefined blood banks if they match the location
            const predefinedBloodBanks = [
                 {
                  name: "Red Cross Blood Bank",
                  city: "Delhi",
                  lat: 28.6139,
                  lng: 77.2090,
                  address: "Connaught Place, Delhi",
                },
                {
                  name: "Apollo Hospital Blood Bank",
                  city: "Chennai",
                  lat: 13.0827,
                  lng: 80.2707,
                  address: "Greams Road, Chennai",
                },
                {
                  name: "Lifeline Blood Bank",
                  city: "Mumbai",
                  lat: 19.0760,
                  lng: 72.8777,
                  address: "Andheri West, Mumbai",
                },
                {
                  name: "Max Healthcare Blood Bank",
                  city: "Delhi",
                  lat: 28.5355,
                  lng: 77.2100,
                  address: "Saket, Delhi",
                },
                {
                  name: "Columbia Asia Blood Bank",
                  city: "Bangalore",
                  lat: 12.9716,
                  lng: 77.5946,
                  address: "Whitefield, Bangalore",
                }
            ];

            const matchingPredefined = predefinedBloodBanks.filter(bank =>
                 (bank.city && bank.city.toLowerCase().includes(location.toLowerCase())) ||
                 (bank.address && bank.address.toLowerCase().includes(location.toLowerCase()))
            );

            // Combine results, avoiding duplicates if possible (basic check)
            matchingPredefined.forEach(predef => {
                const exists = allResults.some(result =>
                    result.name === predef.name && result.address === predef.address
                );
                if (!exists) {
                    allResults.push(predef);
                }
            });


            // 3. Optional: Use Google Places API for nearby search (requires API key and billing)
            // This is commented out as it requires a valid Google Cloud project setup.
            /*
            if (Maps_API_KEY && lat && lng) {
                try {
                    const placesResponse = await axios.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json`, {
                        params: {
                            location: `${lat},${lng}`,
                            radius: 5000, // search radius in meters (e.g., 5km)
                            type: 'hospital|blood_bank', // search for hospitals and blood banks
                            keyword: 'blood', // refine with keyword
                            key: Maps_API_KEY
                        }
                    });

                    const googlePlaces = placesResponse.data.results.map(place => ({
                        name: place.name,
                        address: place.vicinity, // Use vicinity for nearby search
                        lat: place.geometry.location.lat,
                        lng: place.geometry.location.lng,
                         source: 'Google' // Indicate source
                    }));

                    // Combine Google results, avoiding duplicates
                    googlePlaces.forEach(gPlace => {
                         const exists = allResults.some(result =>
                            result.name === gPlace.name && result.address === gPlace.address
                         );
                         if (!exists) {
                             allResults.push(gPlace);
                         }
                    });

                } catch (googleError) {
                    console.error("Error fetching from Google Places API:", googleError.message);
                    // Continue without Google results
                }
            } else if (Maps_API_KEY && location && (!lat || !lng)) {
                 // Optional: Use Google Geocoding API if only a location string is provided
                 // to get coordinates, then perform a nearby search around those coordinates.
                 // This adds complexity and more API calls.
                 console.log("Google Maps API key available, but no user coordinates. Consider Geocoding.");
            } else {
                 console.log("Google Maps API key not configured or no user location provided.");
            }
            */


            // 4. Sort combined results by distance if user location is available
            if (lat && lng) {
                 allResults = allResults.sort((a, b) => {
                     // Ensure both items have coordinates before calculating distance
                     const hasCoordsA = a.lat && a.lng;
                     const hasCoordsB = b.lat && b.lng;

                     if (hasCoordsA && hasCoordsB) {
                         const distA = calculateDistance(lat, lng, a.lat, a.lng);
                         const distB = calculateDistance(lat, lng, b.lat, b.lng);
                         return distA - distB;
                     } else if (hasCoordsA) {
                         return -1; // Item A has coords, prioritize it
                     } else if (hasCoordsB) {
                         return 1; // Item B has coords, prioritize it
                     }
                      return 0; // Neither has coords, no distance sorting
                 });
            }

            // 5. Limit results to prevent overwhelming the client/map
            const limitedResults = allResults.slice(0, 20); // Limit to 20 results

            res.json(limitedResults); // Send the results

        }); // End db.query callback

    } catch (error) {
        console.error("Top-level error in /search:", error);
        res.status(500).json({ error: "An internal error occurred during search." });
    }
});

// Helper function to calculate distance (Haversine formula) - Correct as provided
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Check for valid number inputs
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number' || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        console.warn("calculateDistance received invalid coordinates:", lat1, lon1, lat2, lon2);
        return Infinity; // Return infinity for invalid input
    }

    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Get all donors by blood type (used by donor.html)
app.get("/donors", (req, res) => {
    const bloodType = req.query.bloodType;

    if (!bloodType) {
        return res.status(400).json({ error: "Blood type query parameter is required." });
    }

    const compatibleTypes = getCompatibleBloodTypes(bloodType);
    // Fetch donors with compatible blood types, ordered by exact match then potentially location
    const fetchDonorsSql = `SELECT name, location, number, bloodType FROM donors WHERE bloodType IN (?) ORDER BY FIELD(bloodType, ?) DESC LIMIT 50`; // Limit results

    db.query(fetchDonorsSql, [compatibleTypes, bloodType], (err, donors) => { // Pass bloodType for FIELD()
        if (err) {
            console.error("Error fetching donors for /donors endpoint:", err);
            return res.status(500).json({ error: "Error fetching donors." });
        }

        res.json(donors || []); // Return array or empty array
    });
});

// --- Chatbot Endpoint ---
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ reply: "Please provide a message." });
    }

    // Check if we have an API key
    if (!GEMINI_API_KEY) {
        console.error('Gemini API key is not configured');
        return res.status(500).json({
            reply: "Oops! The assistant service is not configured properly. Please contact support."
        });
    }

    try {
        // Use axios to call the Gemini API directly
        const geminiResponse = await axios.post(GEMINI_API_URL, {
            contents: [
                {
                    parts: [{ text: message }]
                }
            ],
            // Optional: Add safety settings, generation config etc.
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
            params: {
                key: GEMINI_API_KEY,
            },
        });

        // Process the response from Gemini
        const responseData = geminiResponse.data;
        // Check if content and text are present in the response
        if (responseData && responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].content && responseData.candidates[0].content.parts && responseData.candidates[0].content.parts.length > 0) {
             const textResponse = responseData.candidates[0].content.parts[0].text;
             res.json({ reply: textResponse });
        } else {
             // Handle cases where Gemini doesn't return text content (e.g., blocked due to safety)
             console.warn("Gemini API returned no text content:", responseData);
             // Check for block reasons if available
             if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
                 const blockReason = responseData.promptFeedback.blockReason;
                 return res.status(400).json({ reply: `Your request was blocked by the safety filters (${blockReason}).` });
             }
             res.status(500).json({ reply: "The assistant could not generate a response." });
        }

    } catch (error) {
        console.error('Error calling Gemini API:', error.message);
         // Log the full error response if available
        if (error.response) {
            console.error('Gemini API Response Data:', error.response.data);
            console.error('Gemini API Response Status:', error.response.status);
            console.error('Gemini API Response Headers:', error.response.headers);
             // Try to send a more specific error if Gemini returned one
             if (error.response.data && error.response.data.error && error.response.data.error.message) {
                  return res.status(error.response.status).json({ reply: `Assistant Error: ${error.response.data.error.message}` });
             }
        } else if (error.request) {
            console.error('Gemini API Request Data:', error.request);
        } else {
            console.error('Error message:', error.message);
        }

        res.status(500).json({
            reply: "Sorry, the assistant encountered an error. Please try again later."
        });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});