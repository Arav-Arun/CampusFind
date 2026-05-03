const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
// sharp is loaded lazily inside route handlers to avoid crashing on Vercel
const crypto = require("crypto");
const fs = require("fs/promises");
const jwt = require("jsonwebtoken");
const path = require("path");
const { Item, User, Claim } = require("../models");
const { SECRET_KEY } = require("../middleware/auth");
const { analyzeImage, generateVerificationQuestion } = require("../services/aiService");
const { Op } = require("sequelize");

const router = express.Router();
const LOCKING_CLAIM_STATUSES = ["accepted", "completed"];

// Multer: store in memory for processing
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const localUploadDir = path.join(__dirname, "..", "uploads", "items");

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const parseFeatures = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const lockedClaimForItem = async (itemId) =>
  Claim.findOne({
    where: {
      item_id: itemId,
      status: { [Op.in]: LOCKING_CLAIM_STATUSES },
    },
    order: [
      ["status", "DESC"],
      ["timestamp", "DESC"],
    ],
  });

const claimStateForItem = async (item) => {
  if (item.status === "claimed") return "claimed";

  const lockedClaim = await lockedClaimForItem(item.id);
  if (!lockedClaim) return "available";

  return lockedClaim.status === "completed" ? "claimed" : "in_progress";
};

const textValue = (value) => (typeof value === "string" ? value.trim() : "");

const isBase64Image = (value) =>
  value.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const cloudinaryPathUrl = (value) => {
  const cloudName = textValue(process.env.CLOUDINARY_CLOUD_NAME);
  const normalized = textValue(value).replace(/^\/+/, "");

  if (!cloudName || !normalized) return "";
  if (normalized.startsWith("res.cloudinary.com/")) return `https://${normalized}`;
  if (normalized.startsWith("image/upload/")) {
    return `https://res.cloudinary.com/${cloudName}/${normalized}`;
  }

  const publicId =
    /^v\d+\//.test(normalized) || normalized.includes("/")
      ? normalized
      : `campusfind/${normalized}`;

  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
};

const directImageSource = (value) => {
  const normalized = textValue(value);

  if (!normalized) return "";
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }
  if (normalized.startsWith("//res.cloudinary.com/")) return `https:${normalized}`;
  if (
    normalized.startsWith("res.cloudinary.com/") ||
    normalized.startsWith("image/upload/")
  ) {
    return cloudinaryPathUrl(normalized);
  }

  return "";
};

const storedImageDataSource = (value) => {
  const normalized = textValue(value);
  const directSource = directImageSource(normalized);

  if (directSource) return directSource;
  if (isBase64Image(normalized)) return `data:image/jpeg;base64,${normalized}`;
  return "";
};

const reconstructedCloudinaryUrl = (value) => {
  const normalized = textValue(value);

  if (!normalized || normalized.startsWith("/") || normalized.startsWith("uploads/")) {
    return "";
  }

  return directImageSource(normalized) || cloudinaryPathUrl(normalized);
};

const localUploadUrl = (value) => {
  const normalized = textValue(value);

  if (!normalized) return "";
  if (normalized.startsWith("/")) return normalized;
  if (normalized.startsWith("uploads/")) return `/${normalized}`;
  return `/uploads/${normalized}`;
};

const imageFromItem = (item) => {
  const imageUrl = textValue(item.image_url);
  const directImageUrl = directImageSource(imageUrl);
  const storedImage = storedImageDataSource(item.image_data);
  const cloudinaryUrl = reconstructedCloudinaryUrl(imageUrl);

  if (directImageUrl) return directImageUrl;
  if (storedImage) return storedImage;
  if (cloudinaryUrl) return cloudinaryUrl;
  if (imageUrl) return localUploadUrl(imageUrl);
  return "";
};

const saveImageLocally = async (buffer) => {
  await fs.mkdir(localUploadDir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.jpg`;
  await fs.writeFile(path.join(localUploadDir, filename), buffer);
  return `/uploads/items/${filename}`;
};

const uploadItemImage = async (buffer) => {
  if (!hasCloudinaryConfig()) {
    if (process.env.VERCEL) {
      throw new Error("Cloudinary credentials are required on Vercel");
    }
    return saveImageLocally(buffer);
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "campusfind", resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(buffer);
    });

    return result.secure_url;
  } catch (error) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw error;
    }

    console.warn("Cloudinary upload failed. Saved image locally:", error.message);
    return saveImageLocally(buffer);
  }
};

const imageForAnalysis = async (item) => {
  if (item.image_data) return imageFromItem(item);
  const imageUrl = imageFromItem(item);
  if (imageUrl && imageUrl.startsWith("/uploads/")) {
    const uploadPath = imageUrl.replace(/^\/+/, "");
    const file = await fs.readFile(path.join(__dirname, "..", uploadPath));
    return `data:image/jpeg;base64,${file.toString("base64")}`;
  }
  return imageUrl;
};

const itemSummary = async (item) => {
  const claimState = await claimStateForItem(item);

  return {
    id: item.id,
    type: item.type,
    description: item.description,
    location: item.location,
    date_lost: item.date_lost ? item.date_lost.toISOString().slice(0, 16).replace("T", " ") : "",
    image_url: imageFromItem(item),
    category: item.category,
    color: item.color,
    brand: item.brand,
    distinctive_features: parseFeatures(item.distinctive_features),
    status: item.status,
    claim_state: claimState,
    claim_locked: claimState === "claimed",
  };
};

// ==================== Create Item ====================
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const sharp = require("sharp");
    const compressed = await sharp(req.file.buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    let image_url = "";
    try {
      image_url = await uploadItemImage(compressed);
    } catch (uploadErr) {
      return res.status(500).json({ error: "Image upload failed: " + uploadErr.message });
    }

    const base64Data = compressed.toString("base64");
    const imageDataUri = `data:image/jpeg;base64,${base64Data}`;

    let analysis;
    try {
      analysis = await analyzeImage(imageDataUri, req.body.description || "");
    } catch (aiErr) {
      analysis = {
        category: "General Item",
        color: "See image",
        brand: null,
        description: req.body.description || "Check image for details",
        distinctive_features: [],
      };
    }

    let manualTags = [];
    try {
      manualTags = JSON.parse(req.body.manual_tags || "[]");
      if (!Array.isArray(manualTags)) manualTags = [];
    } catch { manualTags = []; }

    const aiFeatures = analysis.distinctive_features || [];
    const allFeatures = [...new Set([...aiFeatures, ...manualTags])];

    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    let userId;
    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, SECRET_KEY);
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const finalCategory = req.body.category || analysis.category || "";
    const finalColor = req.body.color || analysis.color || "";
    const finalBrand = req.body.brand || analysis.brand || "";

    const newItemData = {
      user_id: userId,
      type: req.body.type || "lost",
      description: analysis.description || req.body.description || "No description",
      location: req.body.location || "Unknown",
      date_lost: new Date(),
      image_url,
      category: finalCategory,
      color: finalColor,
      brand: finalBrand,
      distinctive_features: JSON.stringify(allFeatures),
      contact_info: req.body.contact_info || "",
    };

    let verification_question = "";
    let verification_answer_type = "";

    if (newItemData.type === "found") {
      try {
        const vq = await generateVerificationQuestion(newItemData.description, allFeatures);
        verification_question = vq.question || "";
        verification_answer_type = vq.expected_answer_type || "";
      } catch (vqErr) {
        console.warn("Verification question generation failed:", vqErr.message);
      }
      try {
        const u = await User.findByPk(userId);
        if (u) {
          u.trust_score = (u.trust_score || 0) + 5;
          await u.save();
        }
      } catch (xpErr) {}
    }

    newItemData.verification_question = verification_question;
    newItemData.verification_answer_type = verification_answer_type;

    const newItem = await Item.create(newItemData);

    res.status(201).json({
      message: "Item reported successfully",
      item: {
        id: newItem.id,
        description: newItem.description,
        image_url: newItem.image_url,
        ai_tags: {
          category: newItem.category,
          color: newItem.color,
          brand: newItem.brand,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Get Items (Feed) ====================
router.get("/", async (req, res) => {
  try {
    const { type, q, include_claimed } = req.query;
    const where = {};

    if (include_claimed !== "true") {
      where.status = { [Op.ne]: "claimed" };
    }

    if (type && type !== "all") {
      where.type = type;
    }

    if (q) {
      where[Op.or] = [
        { description: { [Op.iLike]: `%${q}%` } },
        { category: { [Op.iLike]: `%${q}%` } },
        { brand: { [Op.iLike]: `%${q}%` } },
        { location: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const items = await Item.findAll({ 
      where, 
      order: [['date_lost', 'DESC']] 
    });

    const summaries = await Promise.all(items.map(itemSummary));
    const result =
      include_claimed === "true"
        ? summaries
        : summaries.filter((item) => item.claim_state !== "claimed");

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Get My Items ====================
router.get("/my", async (req, res) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    const myUploads = await Item.findAll({ where: { user_id: userId } });

    const myClaims = await Claim.findAll({ 
      where: { claimant_id: userId },
      include: [{ model: Item }] 
    });
    
    const claimedItems = myClaims.map((c) => c.Item).filter(Boolean);

    const allItemsMap = {};
    myUploads.forEach((item) => (allItemsMap[item.id.toString()] = item));
    claimedItems.forEach((item) => (allItemsMap[item.id.toString()] = item));

    const combined = Object.values(allItemsMap).sort(
      (a, b) => new Date(b.date_lost) - new Date(a.date_lost)
    );

    const result = await Promise.all(combined.map(itemSummary));

    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// ==================== Get Single Item ====================
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id, {
      include: [{ model: User }]
    });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const reporter = item.User;

    const summary = await itemSummary(item);

    res.json({
      ...summary,
      user_id: reporter.id,
      reporter: {
        name: reporter.name,
        email: reporter.email,
        phone: reporter.phone || null,
        profile_photo: reporter.profile_photo || null,
        contact_info: item.contact_info,
      },
    });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// ==================== Re-analyze Item (AI) ====================
router.post("/:id/analyze", async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (!imageFromItem(item)) return res.status(400).json({ error: "Item has no image" });

    const analysis = await analyzeImage(await imageForAnalysis(item), item.description);

    item.category = analysis.category || item.category;
    item.color = analysis.color || item.color;
    item.brand = analysis.brand || item.brand;
    item.distinctive_features = JSON.stringify(
      analysis.distinctive_features || parseFeatures(item.distinctive_features)
    );
    await item.save();

    res.json({
      message: "Analysis updated",
      tags: {
        category: item.category,
        color: item.color,
        features: parseFeatures(item.distinctive_features),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== Get Matches (PostgreSQL Fallback) ====================
router.get("/match/:id", async (req, res) => {
  try {
    const sourceItem = await Item.findByPk(req.params.id);
    if (!sourceItem) return res.status(404).json({ error: "Item not found" });

    const oppositeType = sourceItem.type === "lost" ? "found" : "lost";
    let matches = [];

    // Fallback matching uses simple tags and keywords.
    const terms = [sourceItem.category, sourceItem.brand, sourceItem.color].filter(Boolean);
    const features = parseFeatures(sourceItem.distinctive_features);
    const allTerms = [...terms, ...features];

    if (allTerms.length > 0) {
      const orConditions = allTerms.map(term => ({
        [Op.or]: [
          { description: { [Op.iLike]: `%${term}%` } },
          { category: { [Op.iLike]: `%${term}%` } },
          { distinctive_features: { [Op.iLike]: `%${term}%` } }
        ]
      }));

      const candidates = await Item.findAll({
        where: {
          type: oppositeType,
          status: "unresolved",
          [Op.or]: orConditions
        },
        limit: 20
      });

      const candidateSummaries = await Promise.all(candidates.map(itemSummary));
      const availableCandidates = candidateSummaries.filter((cand) => !cand.claim_locked);

      // Simple scoring based on how many terms hit
      matches = availableCandidates.map(cand => {
        let hitCount = 0;
        const candText = `${cand.description} ${cand.category} ${cand.distinctive_features}`.toLowerCase();
        allTerms.forEach(term => {
          if (candText.includes(term.toLowerCase())) hitCount++;
        });
        
        return {
          id: cand.id,
          confidence: Math.min(Math.round((hitCount / allTerms.length) * 100), 95),
          reasoning: "Keyword Text Match",
          item: {
            id: cand.id,
            description: cand.description,
            image_url: cand.image_url,
            category: cand.category,
            color: cand.color,
            claim_state: cand.claim_state,
            claim_locked: cand.claim_locked,
          },
        };
      }).filter(m => m.confidence > 20);

      matches.sort((a, b) => b.confidence - a.confidence);
    }

    res.json(matches.slice(0, 5));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
