
/**
 * 📌 This file (db.js) handles the **MySQL database connection** for the backend.
 * It should NOT be confused with database.sql, which is only for setting up the database schema.
 * 
 * Usage: This file is imported into server.js to interact with MySQL.
 */

 const mysql = require('mysql2');
 require('dotenv').config();
 
 // 🔹 Create MySQL Database Connection
 const db = mysql.createConnection({
     host: process.env.DB_HOST || '127.0.0.1', // Database host
     user: process.env.DB_USER || 'root',      // Database username
     password: process.env.DB_PASS || '',      // Database password (leave empty if none)
     database: process.env.DB_NAME || 'handsconnect' // Database name
 });
 
 // 🔹 Connect to MySQL
 db.connect((err) => {
     if (err) {
         console.error("❌ MySQL connection failed:", err);
     } else {
         console.log("✅ Connected to MySQL Database!");
     }
 });
 