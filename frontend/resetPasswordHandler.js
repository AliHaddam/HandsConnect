const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // This allows us to parse FormData

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const User = mongoose.model("User", new mongoose.Schema({
    email: String,
    resetToken: String,
    resetTokenExpiration: Date,
}));

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Password reset route
app.post("/reset-password", async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
        return res.status(404).json({ message: "Email not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    const resetLink = `http://yourwebsite.com/reset-password/${resetToken}`;

    // Setup email content
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        text: `Click this link to reset your password: ${resetLink}`,
    };

    // Send the email with the reset link
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            return res.status(500).json({ message: "Error sending email" });
        }
        res.json({ message: "Reset link sent" });
    });
});

// Server listening
app.listen(3000, () => console.log("Server running on port 3000"));
