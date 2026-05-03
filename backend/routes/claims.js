const express = require("express");
const { Claim, Item, User } = require("../models");
const { authMiddleware } = require("../middleware/auth");
const { Op } = require("sequelize");

const router = express.Router();
const FINAL_CLAIM_STATUSES = ["completed"];

const completedClaimForItem = async (itemId, exceptClaimId = null) => {
  const where = {
    item_id: itemId,
    status: { [Op.in]: FINAL_CLAIM_STATUSES },
  };

  if (exceptClaimId) {
    where.id = { [Op.ne]: exceptClaimId };
  }

  return Claim.findOne({ where });
};

const itemIsUnavailable = async (item) =>
  item.status === "claimed" || Boolean(await completedClaimForItem(item.id));

// ==================== Submit Claim ====================
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { item_id, message } = req.body;
    if (!item_id) return res.status(400).json({ error: "Item ID required" });

    const item = await Item.findByPk(item_id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    if (item.user_id === req.user.id) {
      return res.status(400).json({ error: "You cannot claim your own report." });
    }

    if (await itemIsUnavailable(item)) {
      return res.status(409).json({
        error: "This item has already been recovered.",
      });
    }

    // Prevent duplicate claims
    const existing = await Claim.findOne({ where: { item_id, claimant_id: req.user.id } });
    if (existing) {
      return res.status(400).json({ error: "You have already claimed this item." });
    }

    const claim = await Claim.create({
      item_id,
      claimant_id: req.user.id,
      message: message || "",
      status: "pending",
    });

    // Notify item owner via FCM
    try {
      const admin = require("../config/firebase");
      const owner = await User.findByPk(item.user_id);
      if (owner && owner.fcm_token) {
        await admin.messaging().send({
          notification: {
            title: "New Claim Request",
            body: `Someone claimed your found item: ${item.description}`,
          },
          token: owner.fcm_token,
          data: { click_action: `/item/${item.id}` },
        });
      }
    } catch (fcmErr) {
      console.warn("FCM send failed:", fcmErr.message);
    }

    res.status(201).json({ message: "Claim submitted successfully", claim_id: claim.id });
  } catch (error) {
    console.error("Create claim error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Get Claims for Item ====================
router.get("/item/:itemId", authMiddleware, async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    // If I am the reporter: show ALL claims
    if (item.user_id === req.user.id) {
      const claims = await Claim.findAll({ 
        where: { item_id: req.params.itemId },
        include: [{ model: User, as: 'claimant' }]
      });

      const result = claims.map((c) => ({
        id: c.id,
        claimant: {
          id: c.claimant.id,
          name: c.claimant.name,
          email: c.claimant.email,
          profile_photo: c.claimant.profile_photo,
          phone: c.claimant.phone,
        },
        message: c.message,
        status: c.status,
        timestamp: c.timestamp ? c.timestamp.toISOString() : null,
        meeting_time: c.meeting_time ? c.meeting_time.toISOString() : null,
        meeting_location: c.meeting_location,
      }));

      return res.json(result);
    }

    // If I am a regular user: show only MY claim
    const myClaim = await Claim.findOne({ where: { item_id: req.params.itemId, claimant_id: req.user.id } });
    if (myClaim) {
      return res.json([
        {
          id: myClaim.id,
          status: myClaim.status,
          message: myClaim.message,
          response_message: myClaim.response_message,
          meeting_time: myClaim.meeting_time ? myClaim.meeting_time.toISOString() : null,
          meeting_location: myClaim.meeting_location,
          qr_code: myClaim.qr_code,
        },
      ]);
    }

    res.json([]);
  } catch (error) {
    console.error("Get claims error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Respond to Claim (Accept/Reject) ====================
router.post("/:claimId/respond", authMiddleware, async (req, res) => {
  try {
    const { action, response_message, meeting_location, meeting_time } = req.body;

    const claim = await Claim.findByPk(req.params.claimId);
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    const item = await Item.findByPk(claim.item_id);
    if (item.user_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!["pending", "accepted"].includes(claim.status)) {
      return res.status(400).json({ error: "This claim has already been closed." });
    }

    if (action === "reject") {
      if (claim.status !== "pending") {
        return res.status(400).json({ error: "Only pending claims can be rejected." });
      }

      claim.status = "rejected";
      claim.response_message = response_message || "";
      await claim.save();

      // Notify claimant
      try {
        const admin = require("../config/firebase");
        const claimant = await User.findByPk(claim.claimant_id);
        if (claimant && claimant.fcm_token) {
          await admin.messaging().send({
            notification: {
              title: "Claim Rejected ❌",
              body: `Your claim for '${item.description}' was rejected.`,
            },
            token: claimant.fcm_token,
          });
        }
      } catch (fcmErr) {
        console.warn("FCM send failed:", fcmErr.message);
      }

      return res.json({ message: "Claim rejected" });
    }

    if (action === "accept") {
      if (claim.status !== "pending") {
        return res.status(400).json({ error: "Only pending claims can be accepted." });
      }

      if (item.status === "claimed" || (await completedClaimForItem(item.id, claim.id))) {
        return res.status(409).json({
          error: "This item has already been recovered.",
        });
      }

      if (!meeting_location || !meeting_time) {
        return res.status(400).json({ error: "Meeting location and time required for acceptance" });
      }

      claim.status = "accepted";
      claim.response_message = response_message || "";
      claim.meeting_location = meeting_location;

      try {
        claim.meeting_time = new Date(meeting_time);
      } catch {
        return res.status(400).json({ error: "Invalid date format" });
      }

      // Generate 6-digit verification code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      claim.qr_code = code;
      await claim.save();

      // Notify claimant
      try {
        const admin = require("../config/firebase");
        const claimant = await User.findByPk(claim.claimant_id);
        if (claimant && claimant.fcm_token) {
          await admin.messaging().send({
            notification: {
              title: "Claim Accepted! ✅",
              body: `Your claim for '${item.description}' was accepted. Check details!`,
            },
            token: claimant.fcm_token,
            data: { click_action: `/item/${item.id}` },
          });
        }
      } catch (fcmErr) {
        console.warn("FCM send failed:", fcmErr.message);
      }

      return res.json({ message: "Claim accepted. Code generated.", qr_token: code });
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Respond to claim error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Verify Claim (6-digit Code) ====================
router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Code required" });

    const claim = await Claim.findOne({ where: { qr_code: token, status: "accepted" } });
    if (!claim) return res.status(400).json({ error: "Invalid or expired code." });

    const item = await Item.findByPk(claim.item_id);

    // Only the finder (item uploader) can verify
    if (item.user_id !== req.user.id) {
      return res.status(403).json({
        error: "Only the original Finder (Item Uploader) can verify this claim.",
      });
    }

    if (claim.status === "completed") {
      return res.json({ message: "Item already verified!", verified: true });
    }

    // Update statuses
    claim.status = "completed";
    item.status = "claimed";

    // Award trust points (always to the finder)
    const pointsAwarded = 10;
    let recipientName = "You";

    if (item.type === "lost") {
      // Uploader is loser, claimant is finder → reward claimant
      const claimant = await User.findByPk(claim.claimant_id);
      if (claimant) {
        claimant.trust_score = (claimant.trust_score || 0) + pointsAwarded;
        await claimant.save();
        recipientName = claimant.name || "Finder";
      }
    } else {
      // Uploader is finder → reward current user
      req.user.trust_score = (req.user.trust_score || 0) + pointsAwarded;
      await req.user.save();
      recipientName = "You";
    }

    await claim.save();
    await item.save();

    res.json({
      message: "Item Recovery Successful!",
      verified: true,
      item_title: item.description,
      finder_bonus: pointsAwarded,
      rewarded_user: recipientName,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

// ==================== Save FCM Token ====================
router.post("/notifications/token", authMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });

  req.user.fcm_token = token;
  await req.user.save();

  res.json({ message: "Token saved" });
});

// ==================== Mark Notification Read ====================
router.post("/notifications/read", authMiddleware, async (req, res) => {
  const { id: notifId } = req.body;
  if (!notifId) return res.status(400).json({ error: "Notification ID required" });

  const readList = JSON.parse(req.user.read_notifications || "[]");
  if (!readList.includes(notifId)) {
    readList.push(notifId);
    req.user.read_notifications = JSON.stringify(readList);
    await req.user.save();
  }

  res.json({ message: "Marked as read" });
});

// ==================== Get Notifications ====================
router.get("/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = [];
    const readList = JSON.parse(req.user.read_notifications || "[]");

    // 1. As reporter: claims on my items
    const myItems = await Item.findAll({ where: { user_id: req.user.id } });
    const myItemIds = myItems.map((i) => i.id);

    if (myItemIds.length > 0) {
      const incomingClaims = await Claim.findAll({ 
        where: { item_id: { [Op.in]: myItemIds } },
        order: [['timestamp', 'DESC']],
        include: [{ model: Item }]
      });

      for (const c of incomingClaims) {
        if (c.status === "pending") {
          const nid = `claim_${c.id}_pending`;
          notifications.push({
            id: nid,
            text: `New claim request for: ${c.Item?.description || "Unknown"}`,
            link: `/item/${c.Item?.id}`,
            time: c.timestamp ? c.timestamp.toISOString() : null,
            read: readList.includes(nid),
          });
        }
      }
    }

    // 2. As claimant: my claim updates
    const myClaims = await Claim.findAll({ 
      where: { claimant_id: req.user.id },
      include: [{ model: Item }]
    });

    for (const c of myClaims) {
      if (["accepted", "rejected", "completed"].includes(c.status)) {
        let statusText = c.status;
        if (c.status === "completed") statusText = "verified & recovered";

        const nid = `claim_${c.id}_${c.status}`;
        notifications.push({
          id: nid,
          text: `Your claim for '${c.Item?.description || "Unknown"}' was ${statusText}`,
          link: `/item/${c.Item?.id}`,
          time: c.timestamp ? c.timestamp.toISOString() : null,
          read: readList.includes(nid),
        });
      }
    }

    // Sort by time (newest first)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json(notifications);
  } catch (error) {
    console.error("Notifications error:", error);
    res.json([]);
  }
});

module.exports = router;
