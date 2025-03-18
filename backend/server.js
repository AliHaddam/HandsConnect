/* eslint-disable no-undef */
require('dotenv').config();
console.log("JWT Secret:", process.env.JWT_SECRET);

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const crypto = require('crypto');

const app = express();
app.use('/uploads', express.static('uploads'));

// Middleware setup
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500', 
    credentials: true
}));

// OAuth2 setup
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Email transporter setup
async function createTransporter() {
    const accessToken = await oAuth2Client.getAccessToken();

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL_USER,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: accessToken,
        },
    });
}

// Authentication middleware
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

// Registration endpoint
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, volunteer, ngo } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let connection;
    try {
        // Get a connection from the pool
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Check if email exists
        const [users] = await connection.execute('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length > 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Insert user into Users table
        const [userResult] = await connection.execute(
            `INSERT INTO Users (name, email, password_hash, role, Verified, verification_token) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, role, 'NO', verificationToken]
        );
        const userId = userResult.insertId;

        // Handle Volunteer registration
        if (role === 'Volunteer') {
            if (!volunteer?.city || !volunteer?.dob) {
                throw new Error('Missing city or date of birth for volunteer');
            }
            await connection.execute(
                `INSERT INTO Volunteers (user_id, phone, city, skills, Date_of_Birth) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, volunteer.phone || null, volunteer.city, volunteer.skills || null, volunteer.dob]
            );
        }

        // Handle NGO registration
        else if (role === 'NGO') {
            if (!ngo?.name || !ngo?.description || !ngo?.address) {
                throw new Error('Missing NGO name, description, or address');
            }
            const [ngoResult] = await connection.execute(
                `INSERT INTO NGOs (name, description, address) 
                 VALUES (?, ?, ?)`,
                [ngo.name, ngo.description, ngo.address]
            );

             // Link user to NGO
            await connection.execute(
                'UPDATE Users SET ngo_id = ? WHERE user_id = ?',
                [ngoResult.insertId, userId]
            );
        }

        // Commit transaction
        await connection.commit();
        connection.release();

        const verificationLink = `http://localhost:3000/api/verify-email?token=${verificationToken}`;
        const transporter = await createTransporter();

        await transporter.sendMail({
            from: `HandsConnect <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Email Verification',
            text: `Click the link to verify your email: ${verificationLink}`,
            html: `<p>Click the link to verify your email: <a href="${verificationLink}">Verify Email</a></p>`
        });

        res.status(201).json({ message: 'Registration successful. Check your email to verify your account.' });
    } catch (err) {
        // Proper error response
        console.error('Error:', err);
        res.status(500).json({ 
          error: err.message || 'Internal server error' 
        });
    }
});

// Email verification endpoint
app.get('/api/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Invalid or missing token' });

    try {
        const [users] = await db.execute('SELECT * FROM Users WHERE verification_token = ?', [token]);
        if (users.length === 0) return res.status(400).json({ error: 'Invalid token' });

        await db.execute(
            "UPDATE Users SET Verified = 'YES', verification_token = NULL WHERE verification_token = ?",
            [token]
        );
        res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login request body:', req.body);

    try {
        const [users] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        if (user.Verified !== 'YES') {
            return res.status(403).json({ error: 'Please verify your email before logging in.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        let redirectPath;
        switch(user.role.toLowerCase()) {
            case 'ngo':
                redirectPath = 'dashboard.html';
                break;
            case 'volunteer':
                redirectPath = 'opportunities.html';
                break;
            case 'admin':
                redirectPath = 'admin-dashboard.html';
                break;
            default:
                redirectPath = '/';
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                user_id: user.user_id, 
                email: user.email,
                role: user.role,
                ngo_id: user.ngo_id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        // Send response with redirect path
        res.json({ 
            success: true,
            message: 'Login successful!', 
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role,
                ngo_id: user.ngo_id
            },
            redirect: redirectPath 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// Opportunities endpoints
app.post('/api/opportunities', authenticateToken, async (req, res) => {
    const { title, description, date, location } = req.body;

    if (!title || !description || !date || !location) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const query = "INSERT INTO opportunities (title, description, date, location) VALUES (?, ?, ?, ?)";
        const [result] = await db.execute(query, [title, description, date, location]);

        console.log("✅ Opportunity saved:", { id: result.insertId, title, description, date, location });
        res.status(201).json({ message: "Opportunity submitted successfully!", id: result.insertId });
    } catch (err) {
        console.error("❌ Error inserting opportunity:", err);
        res.status(500).json({ error: "Failed to submit opportunity." });
    }
});

app.get('/api/opportunities', async (req, res) => {
    try {
        const [results] = await db.execute("SELECT * FROM opportunities");
        res.json(results);
    } catch (err) {
        console.error("❌ Error fetching opportunities:", err);
        res.status(500).json({ error: "Failed to fetch opportunities." });
    }
});

app.delete('/api/opportunities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const [results] = await db.execute("SELECT * FROM opportunities WHERE id = ?", [id]);
        if (results.length === 0) {
            return res.status(404).json({ error: "Opportunity not found." });
        }

        await db.execute("DELETE FROM opportunities WHERE id = ?", [id]);
        console.log(`✅ Opportunity deleted: ID ${id}`);
        res.json({ message: "Opportunity deleted successfully!" });

    } catch (err) {
        console.error("❌ Error deleting opportunity:", err);
        res.status(500).json({ error: "Failed to delete opportunity." });
    }
});

// File handling setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }
    console.log("✅ File uploaded:", req.file.filename);
    res.json({ message: "File uploaded successfully!", filename: req.file.filename });
});

app.get('/api/files', (req, res) => {
    fs.readdir('uploads/', (err, files) => {
        if (err) {
            console.error("❌ Error reading files:", err);
            return res.status(500).json({ error: "Failed to retrieve files." });
        }
        res.json(files);
    });
});

app.delete('/api/files/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = `uploads/${filename}`;

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

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ 
        message: "Access granted to protected resource", 
        user: req.user 
    });
});

// Health check
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});