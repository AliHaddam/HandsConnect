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

const app = express();
app.use('/uploads', express.static('uploads'));

// Middleware setup
app.use(express.json());
app.use(cors({
    origin: 'http://127.0.0.1:5500', 
    credentials: true,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
  }));

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

        // Insert user into Users table
        const [userResult] = await connection.execute(
            `INSERT INTO Users (name, email, password_hash, role) 
             VALUES (?, ?, ?, ?)`,
            [name, email, hashedPassword, role]
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
        res.status(201).json({ message: 'Registration successful' });
    
  } catch (err) {
    // Proper error response
    console.error('Error:', err);
    res.status(500).json({ 
      error: err.message || 'Internal server error' 
    });
  }
});

// Updated Login Route
app.post('/api/login', async (req, res) => {
    console.log('Login request body:', req.body);
    const { email, password } = req.body;

    try {
        const [users] = await db.execute('SELECT * FROM Users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Determine redirect path
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
app.post('/api/opportunities', async (req, res) => {
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

app.delete('/api/opportunities/:id', async (req, res) => {
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


app.get('/api/admin/users', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT * FROM Users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.post('/api/admin/ngos/:ngo_id/approve', async (req, res) => { // Changed to ngo_id
    try {
        const { ngo_id } = req.params;
        await db.execute(
            'UPDATE NGOs SET approval_status = "approved" WHERE ngo_id = ?',
            [ngo_id]
        );
        res.json({ message: "NGO approved successfully" });
    } catch (err) {
        res.status(500).json({ error: "Approval failed" });
    }
});

// Update NGO rejection endpoint
app.post('/api/admin/ngos/:ngo_id/reject', async (req, res) => { // Changed to ngo_id
    try {
        const { ngo_id } = req.params;
        await db.execute(
            'UPDATE NGOs SET approval_status = "rejected" WHERE ngo_id = ?',
            [ngo_id]
        );
        res.json({ message: "NGO rejected successfully" });
    } catch (err) {
        res.status(500).json({ error: "Rejection failed" });
    }
});

// Update GET endpoint
app.get('/api/admin/ngos/pending', async (req, res) => {
    try {
        const [ngos] = await db.execute(
            'SELECT ngo_id, name, description FROM NGOs WHERE approval_status = "pending"' // Select ngo_id
        );
        res.json(ngos);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch NGOs" });
    }
});
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM Users WHERE user_id = ?', [req.params.id]);
        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed" });
    }
});
app.patch('/api/admin/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['active', 'banned'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        await db.execute(
            'UPDATE Users SET account_status = ? WHERE user_id = ?',
            [status, id]
        );
        
        res.json({ message: 'Account status updated' });
    } catch (err) {
        res.status(500).json({ error: "Status update failed" });
    }
});

// Update GET /api/admin/users endpoint:
app.get('/api/admin/users', async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT user_id, name, email, role, account_status FROM Users' // Added account_status
        );
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});