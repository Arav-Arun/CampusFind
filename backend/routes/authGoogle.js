const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebase");
const { User } = require("../models");
const { SECRET_KEY } = require("../middleware/auth");

const router = express.Router();

// ==================== Google Sign-In ====================
router.post("/google", async (req, res) => {
  const { token: idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "Token required" });
  }

  try {
    // Verify the Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    // Find or create user
    let user = await User.findOne({ where: { email } });

    if (user) {
      // Link Google ID if missing
      if (!user.google_id) {
        user.google_id = uid;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        email,
        name,
        google_id: uid,
        profile_photo: picture,
        role: "student",
      });
    }

    // Generate app JWT
    const appToken = jwt.sign(
      { userId: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.json({
      token: appToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_photo: user.profile_photo,
      },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ error: "Google Auth Failed: " + error.message });
  }
});

module.exports = router;
