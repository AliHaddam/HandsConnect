require('dotenv').config();
console.log("JWT Secret:", process.env.JWT_SECRET);

const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware setup
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(cors());  // Allow requests from any origin

// Simulated user data (replace with a real database later)
const users = [{ email: 'user@domain.com', password: 'password123' }];

//This will ensure protected routes require authentication.

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']; // Get token from headers

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        req.user = decoded; // Store decoded user info for later use
        next();
    });
}

// 🔹 Login Route
app.post('/api/login', (req, res) => {
    console.log("Login request received:", req.body);

    const { email, password } = req.body;

    // Check if the user exists and the password is correct
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        // Generate a JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        console.log("✅ Login successful for:", email); 
        res.json({ message: 'Login successful!', token }); // Send the token to the frontend
    } else {
        console.log("❌ Login failed for:", email); 
        res.status(401).json({ error: 'Invalid email or password' });
    }
});

// 🔹 Protected Route (Example)
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ message: "Access granted to protected resource", user: req.user });
});

// 🔹 Test route for server health check
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
