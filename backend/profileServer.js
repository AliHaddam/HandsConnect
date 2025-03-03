const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

let profile = {
    name: "John Doe",
    email: "johndoe@example.com",
    phone: "+123456789",
    skills: ["Communication", "Fundraising"],
    experiences: ["Community Cleanup", "Teaching Kids"],
    imageUrl: "default.jpg"
};

app.get("/profile", (req, res) => {
    res.json(profile);
});

app.post("/upload-profile-picture", upload.single("profilePicture"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    profile.imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl: profile.imageUrl });
});

app.post("/update-profile", (req, res) => {
    profile = { ...profile, ...req.body };
    res.json({ success: true, message: "Profile updated successfully!" });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
