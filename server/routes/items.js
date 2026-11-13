const express = require("express");
const multer = require("multer");
const { Op, QueryTypes } = require("sequelize");
const { sequelize, Item, User, Claim } = require("../db");
const {
  HttpError,
  clip,
  parseId,
  asyncHandler,
  authMiddleware,
  optionalAuth,
  uploadLimiter,
} = require("../middleware");
const ai = require("../services/ai");
const images = require("../services/images");
const matching = require("../services/matching");

const { parseFeatures, contains } = matching;

const cachePublic = (res, seconds) =>
  res.set("Cache-Control", `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 3}`);

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

const RECOVERED_STATUSES = ["claimed", "matched", "completed"];

const claimStateResolver = async (items) => {
  const byItem = new Map();
  if (items.length > 0) {
    const claims = await Claim.findAll({
      where: { item_id: items.map((i) => i.id), status: ["accepted", "completed"] },
      attributes: ["item_id", "status"],
      raw: true,
    });
    for (const { item_id, status } of claims) {
      if (status === "completed") byItem.set(item_id, "claimed");
      else if (!byItem.has(item_id)) byItem.set(item_id, "in_progress");
    }
  }
  return (item) => (RECOVERED_STATUSES.includes(item.status) ? "claimed" : byItem.get(item.id) || "available");
};

const summarize = async (items) => {
  const stateOf = await claimStateResolver(items);
  return items.map((item) => {
    const claim_state = stateOf(item);
    return {
      id: item.id,
      type: item.type,
      description: item.description,
      location: item.location,
      date_lost: item.date_lost ? item.date_lost.toISOString().slice(0, 16).replace("T", " ") : "",
      image_url: images.itemImageUrl(item),
      category: item.category,
      color: item.color,
      brand: item.brand,
      distinctive_features: parseFeatures(item.distinctive_features),
      status: item.status,
      claim_state,
      claim_locked: claim_state === "claimed",
    };
  });
};

router.post(
  "/",
  authMiddleware,
  uploadLimiter,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No image uploaded");

    const type = req.body.type || "lost";
    if (type !== "lost" && type !== "found") throw new HttpError(400, "Type must be 'lost' or 'found'");

    let compressed;
    try {
      compressed = await images.compressImage(req.file.buffer);
    } catch {
      throw new HttpError(400, "File is not a valid image");
    }

    const description = clip(req.body.description, 2000);
    const dataUri = `data:image/jpeg;base64,${compressed.toString("base64")}`;

    const [image_url, analysis] = await Promise.all([
      images.uploadImage(compressed).catch((err) => {
        console.error("Image upload failed:", err.message);
        throw new HttpError(502, "Image upload failed");
      }),
      ai.analyzeImage(dataUri, description),
    ]);

    let manualTags = [];
    try {
      const parsed = JSON.parse(req.body.manual_tags || "[]");
      if (Array.isArray(parsed)) manualTags = parsed.map((t) => clip(t, 50)).filter(Boolean).slice(0, 10);
    } catch {
      // ignore malformed tags
    }

    const reported = new Date(req.body.date_lost);
    const date_lost = Number.isNaN(reported.getTime()) || reported > new Date() ? new Date() : reported;

    const item = await Item.create({
      user_id: req.user.id,
      type,
      description: description || analysis.description || "No description",
      location: clip(req.body.location, 200) || "Unknown",
      date_lost,
      image_url,
      category: clip(req.body.category, 50) || analysis.category,
      color: clip(req.body.color, 50) || analysis.color,
      brand: clip(req.body.brand, 50) || analysis.brand,
      distinctive_features: JSON.stringify([...new Set([...analysis.distinctive_features, ...manualTags])]),
      contact_info: clip(req.body.contact_info, 200),
    });

    try {
      if (await matching.storeEmbeddings([item])) await matching.alertMatches(item);
    } catch (err) {
      console.error("Matching failed:", err.message);
    }

    res.status(201).json({
      message: "Item reported successfully",
      item: {
        id: item.id,
        description: item.description,
        image_url: item.image_url,
        ai_tags: { category: item.category, color: item.color, brand: item.brand },
      },
    });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { type, q, include_claimed } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 60);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const where = {};
    const and = [];
    if (include_claimed !== "true") {
      where.status = { [Op.notIn]: RECOVERED_STATUSES };
      and.push(
        sequelize.literal(`NOT EXISTS (SELECT 1 FROM claim WHERE claim.item_id = "Item"."id" AND claim.status = 'completed')`)
      );
    }
    if (type === "lost" || type === "found") where.type = type;

    for (const term of [clip(q, 100), clip(req.query.tag, 50)].filter(Boolean)) {
      and.push({ [Op.or]: ["description", "category", "brand", "location"].map((field) => ({ [field]: contains(term) })) });
    }
    if (and.length) where[Op.and] = and;

    const rows = await Item.findAll({ where, order: [["date_lost", "DESC"], ["id", "DESC"]], limit: limit + 1, offset });
    cachePublic(res, 15);
    res.json({ items: await summarize(rows.slice(0, limit)), has_more: rows.length > limit });
  })
);

router.get(
  "/my",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const [mine, claims] = await Promise.all([
      Item.findAll({ where: { user_id: req.user.id } }),
      Claim.findAll({ where: { claimant_id: req.user.id }, include: [{ model: Item }] }),
    ]);

    const byId = new Map();
    [...mine, ...claims.map((c) => c.Item).filter(Boolean)].forEach((item) => byId.set(item.id, item));

    const sorted = [...byId.values()].sort((a, b) => new Date(b.date_lost) - new Date(a.date_lost));
    res.json(await summarize(sorted));
  })
);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const select = (sql) => sequelize.query(sql, { type: QueryTypes.SELECT });
    const [byTypeState, categories, locations] = await Promise.all([
      select(`SELECT type, state, COUNT(*)::int AS count FROM (
                SELECT i.type,
                  CASE
                    WHEN i.status IN ('claimed', 'matched', 'completed')
                      OR EXISTS (SELECT 1 FROM claim c WHERE c.item_id = i.id AND c.status = 'completed') THEN 'recovered'
                    WHEN EXISTS (SELECT 1 FROM claim c WHERE c.item_id = i.id AND c.status = 'accepted') THEN 'in_progress'
                    ELSE 'open'
                  END AS state
                FROM item i
              ) s GROUP BY type, state`),
      select(`SELECT INITCAP(COALESCE(NULLIF(NULLIF(LOWER(TRIM(category)), ''), 'general item'), 'uncategorized')) AS name, COUNT(*)::int AS count
              FROM item GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12`),
      select(`SELECT TRIM(SPLIT_PART(COALESCE(NULLIF(location, ''), 'Unknown'), ',', 1)) AS name, COUNT(*)::int AS count
              FROM item GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 5`),
    ]);

    cachePublic(res, 60);
    const sum = (predicate) => byTypeState.filter(predicate).reduce((total, row) => total + row.count, 0);
    res.json({
      total: sum(() => true),
      lost: sum((r) => r.type === "lost"),
      found: sum((r) => r.type === "found"),
      recovered: sum((r) => r.state === "recovered"),
      in_progress: sum((r) => r.state === "in_progress"),
      open: sum((r) => r.state === "open"),
      open_lost: sum((r) => r.type === "lost" && r.state === "open"),
      open_found: sum((r) => r.type === "found" && r.state === "open"),
      categories,
      locations,
    });
  })
);

router.get(
  "/match/:id",
  asyncHandler(async (req, res) => {
    const source = await Item.findByPk(parseId(req.params.id));
    if (!source) throw new HttpError(404, "Item not found");

    const semantic = await matching.semanticMatches(source).catch((err) => {
      console.error("Semantic matching failed:", err.message);
      return null;
    });
    const found = semantic ?? (await matching.keywordMatches(source));
    const summaries = await summarize(found.map((m) => m.item));

    cachePublic(res, 30);
    res.json(
      found
        .map((m, i) => ({
          id: m.item.id,
          confidence: Math.round(m.score * 100),
          method: m.method,
          reasoning: m.reason,
          item: {
            id: m.item.id,
            description: summaries[i].description,
            image_url: summaries[i].image_url,
            category: summaries[i].category,
            color: summaries[i].color,
            claim_state: summaries[i].claim_state,
          },
          locked: summaries[i].claim_locked,
        }))
        .filter((m) => !m.locked)
        .slice(0, 5)
        .map(({ locked, ...m }) => m)
    );
  })
);

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const item = await Item.findByPk(parseId(req.params.id), {
      include: [{ model: User, attributes: ["id", "name", "email", "phone", "profile_photo"] }],
    });
    if (!item) throw new HttpError(404, "Item not found");

    const viewer = req.user;
    const canSeeContact =
      viewer &&
      (viewer.id === item.user_id ||
        (await Claim.count({ where: { item_id: item.id, claimant_id: viewer.id, status: ["accepted", "completed"] } })) > 0);

    const reporter = item.User;
    const [summary] = await summarize([item]);
    res.json({
      ...summary,
      user_id: item.user_id,
      reporter: {
        name: reporter.name,
        profile_photo: reporter.profile_photo || null,
        ...(canSeeContact && {
          email: reporter.email,
          phone: reporter.phone || null,
          contact_info: item.contact_info,
        }),
      },
    });
  })
);

module.exports = router;
