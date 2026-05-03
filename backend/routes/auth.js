const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Item, Claim } = require("../models");
const { authMiddleware, SECRET_KEY } = require("../middleware/auth");
const { Op } = require("sequelize");

const router = express.Router();

// ==================== Register ====================
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !phone) {
      return res.status(400).json({ message: "Email, password, and phone are required" });
    }

    // Password strength: 6+ chars, 1 uppercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters with 1 uppercase, 1 number, and 1 special character.",
      });
    }

    // Check if email exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await User.create({ email, name, phone, password_hash, role: "student" });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// ==================== Login ====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    // If user signed up via Google, redirect them
    if (user && user.google_id) {
      return res.status(400).json({
        message: "This email is signed up via Google. Please use 'Sign in with Google'.",
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    // Generate JWT (24 hours)
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ==================== Get Current User ====================
router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findByPk(decoded.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Calculate stats
    const itemsReported = await Item.count({ where: { user_id: user.id } });
    const myReportedResolved = await Item.count({
      where: {
        user_id: user.id,
        status: ["claimed", "matched", "completed"]
      }
    });
    const myFoundResolved = await Claim.count({
      where: {
        claimant_id: user.id,
        status: "completed"
      }
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        profile_photo: user.profile_photo,
        trust_score: user.trust_score || 0,
        stats: {
          reported: itemsReported,
          recovered: myReportedResolved + myFoundResolved,
        },
      },
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// ==================== Update Profile ====================
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone, bio, profile_photo } = req.body;

    if (name !== undefined) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (bio !== undefined) req.user.bio = bio;
    if (profile_photo !== undefined) req.user.profile_photo = profile_photo;

    await req.user.save();

    res.json({
      message: "Profile updated",
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        bio: req.user.bio,
        profile_photo: req.user.profile_photo,
        trust_score: req.user.trust_score || 0,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// ==================== Leaderboard ====================
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.findAll({
      order: [["trust_score", "DESC"]],
      limit: 5,
      attributes: ["id", "name", "trust_score", "profile_photo"]
    });

    const result = users.map((u) => ({
      id: u.id,
      name: u.name,
      trust_score: u.trust_score || 0,
      profile_photo: u.profile_photo,
    }));

    res.json(result);
  } catch (error) {
    res.json([]);
  }
});

module.exports = router;
