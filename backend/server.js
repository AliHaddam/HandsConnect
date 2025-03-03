require('dotenv').config();
console.log("JWT Secret:", process.env.JWT_SECRET);

const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const db = require('./db'); // 🔹 Import the MySQL connection from db.js
const multer = require('multer'); // 🔹 Import Multer for file uploads
const path = require('path');
const fs = require('fs'); // 🔹 Import File System module for handling file operations

const app = express(); // Initialize Express
app.use('/uploads', express.static('uploads'));

// Middleware setup
app.use(express.json());
app.use(cors());

// 🔹 Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

// 🔹 Initialize multer with the storage settings
const upload = multer({ storage: storage });

// 🔹 Ensure users are authenticated
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        req.user = decoded;
        next();
    });
}

// 🔹 Login Route (Dummy authentication for now)
app.post('/api/login', (req, res) => {
    console.log("Login request received:", req.body);
    const { email, password } = req.body;

    const users = [{ email: 'user@domain.com', password: 'password123' }];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        console.log("✅ Login successful for:", email); 
        res.json({ message: 'Login successful!', token });
    } else {
        console.log("❌ Login failed for:", email); 
        res.status(401).json({ error: 'Invalid email or password' });
    }
});

// 🔹 Store opportunities in MySQL instead of memory
app.post('/api/opportunities', (req, res) => {
    const { title, description, date, location } = req.body;

    if (!title || !description || !date || !location) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const query = "INSERT INTO opportunities (title, description, date, location) VALUES (?, ?, ?, ?)";
    db.query(query, [title, description, date, location], (err, result) => {
        if (err) {
            console.error("❌ Error inserting opportunity:", err);
            return res.status(500).json({ error: "Failed to submit opportunity." });
        }
        console.log("✅ Opportunity saved:", { id: result.insertId, title, description, date, location });
        res.status(201).json({ message: "Opportunity submitted successfully!", id: result.insertId });
    });
});

// 🔹 Retrieve all opportunities from MySQL
app.get('/api/opportunities', (req, res) => {
    db.query("SELECT * FROM opportunities", (err, results) => {
        if (err) {
            console.error("❌ Error fetching opportunities:", err);
            return res.status(500).json({ error: "Failed to fetch opportunities." });
        }
        res.json(results);
    });
});

// 🔹 File Upload Route
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    console.log("✅ File uploaded:", req.file.filename);
    res.json({ message: "File uploaded successfully!", filename: req.file.filename });
});

// 🔹 Get a list of uploaded files
app.get('/api/files', (req, res) => {
    fs.readdir('uploads/', (err, files) => {
        if (err) {
            console.error("❌ Error reading files:", err);
            return res.status(500).json({ error: "Failed to retrieve files." });
        }
        res.json(files);
    });
});

// 🔹 Delete an uploaded file
app.delete('/api/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = `uploads/${filename}`;

    // Check if file exists before deleting
    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error("❌ Error deleting file:", err);
                return res.status(500).json({ error: "Failed to delete file." });
            }
            console.log(`✅ File deleted: ${filename}`);
            res.json({ message: "File deleted successfully!" });
        });
    } else {
        res.status(404).json({ error: "File not found." });
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
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
