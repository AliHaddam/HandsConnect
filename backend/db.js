/**
 * 📌 This file (`db.js`) handles the **MySQL database connection** for the backend.
 * It should NOT be confused with `database.sql`, which is only for setting up the database schema.
 * 
 * Usage: This file is imported into `server.js` to interact with MySQL.
 */

 const mysql = require('mysql2');
 require('dotenv').config();
 
 const connection = mysql.createConnection({
     host: process.env.DB_HOST || '127.0.0.1',
     user: process.env.DB_USER || 'root',
     password: process.env.DB_PASS || '',
 });
 
 // Connect to MySQL
 connection.connect((err) => {
     if (err) {
         console.error("❌ MySQL connection failed:", err);
         return;
     }
     console.log("✅ Connected to MySQL Server!");
 
     // Ensure the database exists
     connection.query(`CREATE DATABASE IF NOT EXISTS handsconnect`, (err) => {
         if (err) {
             console.error("❌ Failed to create database:", err);
         } else {
             console.log("✅ Database 'handsconnect' is ready!");
         }
 
         // Connect to the database
         const db = mysql.createConnection({
             host: process.env.DB_HOST || '127.0.0.1',
             user: process.env.DB_USER || 'root',
             password: process.env.DB_PASS || '',
             database: process.env.DB_NAME || 'handsconnect'
         });
 
         db.connect((err) => {
             if (err) {
                 console.error("❌ MySQL connection failed:", err);
             } else {
                 console.log("✅ Connected to MySQL Database 'handsconnect'!");
             }
         });
 
         module.exports = db;
     });
 });
 
