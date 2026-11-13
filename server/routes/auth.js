const express = require("express");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { sequelize, User, Item, Claim } = require("../db");
const { verifyIdToken } = require("../firebase");
const {
  HttpError,
  clip,
  asyncHandler,
  signToken,
  authMiddleware,
  authLimiter,
} = require("../middleware");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 6+ chars, 1 uppercase, 1 number, 1 special character
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const findByEmail = (email) =>
  User.findOne({ where: sequelize.where(sequelize.fn("lower", sequelize.col("email")), email.toLowerCase()) });

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  bio: user.bio,
  profile_photo: user.profile_photo,
  trust_score: user.trust_score || 0,
});

const session = (user) => ({ token: signToken(user), user: publicUser(user) });

// ==================== Register ====================
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = clip(req.body.email, 120).toLowerCase();
    const { password } = req.body;
    const phone = clip(req.body.phone, 20);

    if (!EMAIL_RE.test(email) || !password || !phone) {
      throw new HttpError(400, "Email, password, and phone are required");
    }
    if (typeof password !== "string" || !PASSWORD_RE.test(password)) {
      throw new HttpError(400, "Password must be at least 6 characters with 1 uppercase, 1 number, and 1 special character.");
    }
    if (await findByEmail(email)) throw new HttpError(409, "Email already registered");

    await User.create({
      email,
      name: clip(req.body.name, 100) || null,
      phone,
      password_hash: await bcrypt.hash(password, 10),
      role: "student",
    });
    res.status(201).json({ message: "User created successfully" });
  })
);

// ==================== Login ====================
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = clip(req.body.email, 120);
    const { password } = req.body;
    if (!email || typeof password !== "string") throw new HttpError(400, "Email and password are required");

    const user = await findByEmail(email);
    // Accounts linked to Google can't use a password, so they fail the same way as a wrong password.
    const usable = user && user.password_hash && !user.google_id;
    const ok = await bcrypt.compare(password, usable ? user.password_hash : DUMMY_HASH);

    if (!usable || !ok) {
      throw new HttpError(401, "Invalid email or password. If you signed up with Google, use 'Sign in with Google'.");
    }
    res.json(session(user));
  })
);

// ==================== Google Sign-In ====================
router.post(
  "/google",
  authLimiter,
  asyncHandler(async (req, res) => {
    if (typeof req.body.token !== "string" || !req.body.token) throw new HttpError(400, "Token required");

    let decoded;
    try {
      decoded = await verifyIdToken(req.body.token);
    } catch (err) {
      console.error("Google token verification failed:", err.message);
      throw new HttpError(401, "Google sign-in failed");
    }
    if (!decoded.email || !decoded.email_verified) throw new HttpError(401, "Your Google email is not verified");

    let user = (await User.findOne({ where: { google_id: decoded.uid } })) || (await findByEmail(decoded.email));
    if (user) {
      if (user.google_id && user.google_id !== decoded.uid) throw new HttpError(401, "Google sign-in failed");
      if (!user.google_id) await user.update({ google_id: decoded.uid });
    } else {
      user = await User.create({
        email: decoded.email.toLowerCase(),
        name: clip(decoded.name, 100) || null,
        google_id: decoded.uid,
        profile_photo: clip(decoded.picture, 500) || null,
        role: "student",
      });
    }
    res.json(session(user));
  })
);

// ==================== Current User ====================
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.user;
    const [reported, reportedResolved, foundResolved] = await Promise.all([
      Item.count({ where: { user_id: id } }),
      Item.count({ where: { user_id: id, status: ["claimed", "matched", "completed"] } }),
      Claim.count({ where: { claimant_id: id, status: "completed" } }),
    ]);
    res.json({ user: { ...publicUser(req.user), stats: { reported, recovered: reportedResolved + foundResolved } } });
  })
);

// ==================== Update Profile ====================
router.put(
  "/profile",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { name, phone, bio, profile_photo } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = clip(name, 100);
    if (phone !== undefined) updates.phone = clip(phone, 20);
    if (bio !== undefined) updates.bio = clip(bio, 1000);
    if (profile_photo !== undefined) {
      const photo = clip(profile_photo, 500);
      if (photo && !/^https?:\/\//i.test(photo)) throw new HttpError(400, "Profile photo must be an http(s) URL");
      updates.profile_photo = photo || null;
    }

    await req.user.update(updates);
    res.json({ message: "Profile updated", user: publicUser(req.user) });
  })
);

// ==================== Leaderboard ====================
router.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const users = await User.findAll({
      where: { trust_score: { [Op.gt]: 0 } }, // only people who have actually returned something
      order: [["trust_score", "DESC"], ["id", "ASC"]],
      limit: 5,
      attributes: ["id", "name", "trust_score", "profile_photo"],
    });
    res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=180");
    res.json(users.map((u) => ({ id: u.id, name: u.name, trust_score: u.trust_score || 0, profile_photo: u.profile_photo })));
  })
);

module.exports = router;
