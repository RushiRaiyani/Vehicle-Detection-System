const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// helper – create & set JWT cookie
const sendTokenCookie = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: "lax",
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return token;
};

// ─── SIGNUP ──────────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const user = await User.create({ name, email, password });
        sendTokenCookie(res, user._id);

        res.status(201).json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── LOGIN ───────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        sendTokenCookie(res, user._id);
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── LOGOUT ──────────────────────────────────────────────────────────
router.post("/logout", (_req, res) => {
    res.cookie("token", "", { httpOnly: true, maxAge: 0 });
    res.json({ message: "Logged out" });
});

// ─── GET CURRENT USER ────────────────────────────────────────────────
router.get("/me", auth, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
