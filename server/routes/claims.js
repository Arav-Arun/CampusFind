const crypto = require("crypto");
const express = require("express");
const { Op } = require("sequelize");
const { sequelize, Claim, Item, User, MatchAlert } = require("../db");
const { HttpError, clip, parseId, asyncHandler, authMiddleware, verifyLimiter } = require("../middleware");

const router = express.Router();

const HANDOFF_POINTS = 10;
const CODE_VALID_DAYS = 7;

const iso = (date) => (date ? date.toISOString() : null);

const isRecovered = async (item) =>
  item.status !== "unresolved" || (await Claim.count({ where: { item_id: item.id, status: "completed" } })) > 0;

router.post(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const item = await Item.findByPk(parseId(req.body.item_id));
    if (!item) throw new HttpError(404, "Item not found");
    if (item.user_id === req.user.id) throw new HttpError(400, "You can't claim your own item");
    if (await isRecovered(item)) throw new HttpError(409, "This item has already been recovered.");

    const existing = await Claim.findOne({ where: { item_id: item.id, claimant_id: req.user.id } });
    if (existing) throw new HttpError(400, "You have already claimed this item.");

    const claim = await Claim.create({
      item_id: item.id,
      claimant_id: req.user.id,
      message: clip(req.body.message, 500),
      status: "pending",
    });
    res.status(201).json({ message: "Claim submitted successfully", claim_id: claim.id });
  })
);

router.get(
  "/item/:itemId",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const item = await Item.findByPk(parseId(req.params.itemId));
    if (!item) throw new HttpError(404, "Item not found");

    if (item.user_id === req.user.id) {
      const claims = await Claim.findAll({
        where: { item_id: item.id },
        include: [{ model: User, as: "claimant", attributes: ["id", "name", "profile_photo"] }],
        order: [["timestamp", "DESC"]],
      });
      return res.json(
        claims.map((c) => ({
          id: c.id,
          claimant: c.claimant,
          message: c.message,
          status: c.status,
          timestamp: iso(c.timestamp),
          meeting_time: iso(c.meeting_time),
          meeting_location: c.meeting_location,
        }))
      );
    }

    const mine = await Claim.findOne({ where: { item_id: item.id, claimant_id: req.user.id } });
    res.json(
      mine
        ? [
            {
              id: mine.id,
              status: mine.status,
              message: mine.message,
              response_message: mine.response_message,
              meeting_time: iso(mine.meeting_time),
              meeting_location: mine.meeting_location,
              qr_code: mine.status === "accepted" ? mine.qr_code : null,
            },
          ]
        : []
    );
  })
);

router.post(
  "/:claimId/respond",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { action } = req.body;
    const claim = await Claim.findByPk(parseId(req.params.claimId), { include: [{ model: Item }] });
    if (!claim) throw new HttpError(404, "Claim not found");
    if (claim.Item.user_id !== req.user.id) throw new HttpError(403, "Only the reporter can respond to this claim");
    if (claim.status !== "pending") throw new HttpError(409, "This claim has already been answered");

    const response_message = clip(req.body.response_message, 500);

    if (action === "reject") {
      await claim.update({ status: "rejected", response_message });
      return res.json({ message: "Claim rejected" });
    }

    if (action === "accept") {
      const meeting_location = clip(req.body.meeting_location, 200);
      const meeting_time = new Date(req.body.meeting_time);
      if (!meeting_location || Number.isNaN(meeting_time.getTime())) {
        throw new HttpError(400, "A valid meeting location and time are required");
      }
      if (await isRecovered(claim.Item)) throw new HttpError(409, "This item has already been recovered.");
      if ((await Claim.count({ where: { item_id: claim.item_id, status: "accepted" } })) > 0) {
        throw new HttpError(409, "You already accepted a claim for this item");
      }

      let code;
      do {
        code = String(crypto.randomInt(100000, 1000000));
      } while (await Claim.findOne({ where: { qr_code: code, status: "accepted" } }));

      await claim.update({ status: "accepted", response_message, meeting_location, meeting_time, qr_code: code });
      return res.json({ message: "Claim accepted" });
    }

    throw new HttpError(400, "Invalid action");
  })
);

router.post(
  "/verify",
  authMiddleware,
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const code = String(req.body.token ?? "").trim();
    if (!/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code");

    const claim = await Claim.findOne({
      where: { qr_code: code, status: "accepted" },
      include: [{ model: Item, where: { user_id: req.user.id }, required: true }],
    });
    const expiresAt = claim?.meeting_time ? claim.meeting_time.getTime() + CODE_VALID_DAYS * 86400000 : Infinity;
    if (!claim || Date.now() > expiresAt) throw new HttpError(400, "Invalid or expired code.");

    const item = claim.Item;
    const finderId = item.type === "lost" ? claim.claimant_id : req.user.id;

    await sequelize.transaction(async (transaction) => {
      const [updated] = await Claim.update({ status: "completed" }, { where: { id: claim.id, status: "accepted" }, transaction });
      if (!updated) throw new HttpError(409, "This code was already used");
      await Item.update({ status: "claimed" }, { where: { id: item.id }, transaction });
      await User.update(
        { trust_score: sequelize.literal(`COALESCE(trust_score, 0) + ${HANDOFF_POINTS}`) },
        { where: { id: finderId }, transaction }
      );
    });

    const finder = finderId === req.user.id ? null : await User.findByPk(finderId, { attributes: ["name"] });
    res.json({
      message: "Item Recovery Successful!",
      verified: true,
      item_title: item.description,
      finder_bonus: HANDOFF_POINTS,
      rewarded_user: finder ? finder.name || "Finder" : "You",
    });
  })
);

const readIds = (user) => {
  try {
    const parsed = JSON.parse(user.read_notifications || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

router.get(
  "/notifications",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const read = new Set(readIds(req.user));
    const notify = (c, text) => {
      const id = `claim_${c.id}_${c.status}`;
      return { id, text, link: `/item/${c.item_id}`, time: iso(c.timestamp), read: read.has(id) };
    };

    const [incoming, mine, alerts] = await Promise.all([
      Claim.findAll({
        where: { status: "pending" },
        include: [{ model: Item, where: { user_id: req.user.id }, required: true }],
      }),
      Claim.findAll({
        where: { claimant_id: req.user.id, status: { [Op.in]: ["accepted", "rejected", "completed"] } },
        include: [{ model: Item }],
      }),
      MatchAlert.findAll({
        where: { user_id: req.user.id },
        include: [
          { model: Item, as: "item", attributes: ["id", "description"] },
          { model: Item, as: "matchedItem", attributes: ["id", "type", "status"] },
        ],
        order: [["created_at", "DESC"]],
        limit: 20,
      }).catch(() => []),
    ]);

    const notifications = [
      ...incoming.map((c) => notify(c, `New claim request for: ${c.Item.description}`)),
      ...mine.map((c) =>
        notify(c, `Your claim for '${c.Item?.description || "Unknown"}' was ${c.status === "completed" ? "verified & recovered" : c.status}`)
      ),
    ];
    for (const alert of alerts) {
      if (!alert.item || !alert.matchedItem || alert.matchedItem.status !== "unresolved") continue;
      const id = `match_${alert.id}`;
      notifications.push({
        id,
        text: `A ${alert.matchedItem.type} report may match your "${alert.item.description}"`,
        link: `/item/${alert.matched_item_id}`,
        time: iso(alert.created_at),
        read: read.has(id),
      });
    }
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json(notifications);
  })
);

router.post(
  "/notifications/read",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const id = clip(req.body.id, 100);
    if (!/^(claim_\d+_[a-z]+|match_\d+)$/.test(id)) throw new HttpError(400, "Invalid notification ID");

    const read = readIds(req.user);
    if (!read.includes(id)) {
      await req.user.update({ read_notifications: JSON.stringify([...read, id].slice(-200)) });
    }
    res.json({ message: "Marked as read" });
  })
);

module.exports = router;
