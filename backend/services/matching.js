const { Op, QueryTypes } = require("sequelize");
const { sequelize, Item, MatchAlert } = require("../db");
const ai = require("./ai");

// Cosine similarity thresholds for text-embedding-3-small on short item descriptions.
const MATCH_THRESHOLD = 0.4; // listed on the item's page
const ALERT_THRESHOLD = 0.55; // worth notifying the other reporter
const SAME_PLACE_BOOST = 0.05; // lost and found in the same building is a good sign

// Placeholder text older reports saved when photo tagging failed.
const PLACEHOLDERS = new Set(["general item", "see image", "unknown", "none", "null", "n/a"]);
const isRealTag = (v) => typeof v === "string" && v.trim() && !PLACEHOLDERS.has(v.trim().toLowerCase());

const parseFeatures = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Escapes LIKE wildcards so user input is matched literally. */
const contains = (term) => ({ [Op.iLike]: `%${term.replace(/[\\%_]/g, "\\$&")}%` });

const place = (location) => (location || "").split(",")[0].trim().toLowerCase();
const opposite = (type) => (type === "lost" ? "found" : "lost");

/** What gets embedded: the description plus every real tag. */
const embeddingText = (item) =>
  [...new Set([item.description, item.category, item.color, item.brand, ...parseFeatures(item.distinctive_features)].filter(isRealTag).map((v) => v.trim()))].join(". ");

// Whether the pgvector column exists (i.e. `npm run db:migrate` has run). Until it
// has, matching quietly uses keywords. A "no" is re-checked after a minute.
let vectorState = { ready: false, checkedAt: 0 };
async function vectorReady() {
  if (vectorState.ready || Date.now() - vectorState.checkedAt < 60000) return vectorState.ready;
  const rows = await sequelize.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'item' AND column_name = 'embedding'",
    { type: QueryTypes.SELECT }
  );
  vectorState = { ready: rows.length > 0, checkedAt: Date.now() };
  return vectorState.ready;
}

/** Embeds and stores vectors for the given items. Returns how many were stored. */
async function storeEmbeddings(items) {
  if (items.length === 0 || !(await vectorReady())) return 0;
  const vectors = await ai.embed(items.map(embeddingText));
  if (!vectors) return 0; // no OpenAI key configured
  await Promise.all(
    items.map((item, i) =>
      sequelize.query("UPDATE item SET embedding = CAST(:vector AS vector) WHERE id = :id", {
        replacements: { vector: JSON.stringify(vectors[i]), id: item.id },
      })
    )
  );
  return items.length;
}

/**
 * Open reports of the opposite type, nearest first by cosine similarity.
 * @returns {Promise<Array<{item, score, method, reason}> | null>} null when this report
 *   has no embedding (or pgvector isn't set up), so the caller can fall back to keywords
 */
async function semanticMatches(source, { limit = 10, min = MATCH_THRESHOLD } = {}) {
  if (!(await vectorReady())) return null;
  const [row] = await sequelize.query("SELECT CAST(embedding AS text) AS vector FROM item WHERE id = :id AND embedding IS NOT NULL", {
    replacements: { id: source.id },
    type: QueryTypes.SELECT,
  });
  if (!row) return null;

  // The vector is passed as a parameter (not a subquery) so Postgres can use the HNSW index.
  const nearest = await sequelize.query(
    `SELECT i.id, 1 - (i.embedding <=> CAST(:vector AS vector)) AS similarity
     FROM item i
     WHERE i.embedding IS NOT NULL AND i.type = :type AND i.status = 'unresolved' AND i.user_id <> :userId
       AND NOT EXISTS (SELECT 1 FROM claim c WHERE c.item_id = i.id AND c.status = 'completed')
     ORDER BY i.embedding <=> CAST(:vector AS vector)
     LIMIT :limit`,
    { replacements: { vector: row.vector, type: opposite(source.type), userId: source.user_id, limit }, type: QueryTypes.SELECT }
  );
  const items = new Map((await Item.findAll({ where: { id: nearest.map((n) => n.id) } })).map((i) => [i.id, i]));

  return nearest
    .map(({ id, similarity }) => {
      const item = items.get(id);
      const samePlace = place(item.location) !== "" && place(item.location) === place(source.location);
      return {
        item,
        score: Math.min(1, Number(similarity) + (samePlace ? SAME_PLACE_BOOST : 0)),
        method: "semantic",
        reason: samePlace ? "Similar description, same place" : "Similar description",
      };
    })
    .filter((m) => m.score >= min)
    .sort((a, b) => b.score - a.score);
}

/** Fallback for reports without an embedding: share of the source's tags found in each candidate. */
async function keywordMatches(source) {
  const terms = [source.category, source.brand, source.color, ...parseFeatures(source.distinctive_features)].filter(isRealTag).map((t) => t.trim());
  if (terms.length === 0) return [];

  const candidates = await Item.findAll({
    where: {
      type: opposite(source.type),
      status: "unresolved",
      user_id: { [Op.ne]: source.user_id },
      [Op.or]: terms.flatMap((term) => [{ description: contains(term) }, { category: contains(term) }, { distinctive_features: contains(term) }]),
    },
    limit: 20,
  });

  return candidates
    .map((item) => {
      const text = `${item.description} ${item.category} ${item.distinctive_features}`.toLowerCase();
      const hits = terms.filter((term) => text.includes(term.toLowerCase())).length;
      return { item, score: Math.min(hits / terms.length, 0.95), method: "keyword", reason: "Shares tags" };
    })
    .filter((m) => m.score > 0.2)
    .sort((a, b) => b.score - a.score);
}

/** Tells the reporters of strongly similar opposite reports that a new one came in. */
async function alertMatches(item) {
  const matches = await semanticMatches(item, { limit: 5, min: ALERT_THRESHOLD });
  if (!matches || matches.length === 0) return 0;
  await MatchAlert.bulkCreate(
    matches.map((m) => ({ user_id: m.item.user_id, item_id: m.item.id, matched_item_id: item.id, similarity: m.score })),
    { ignoreDuplicates: true }
  );
  return matches.length;
}

/** Embeds every report that doesn't have a vector yet. Returns the number embedded. */
async function backfill(batchSize = 50) {
  let total = 0;
  for (;;) {
    const batch = await Item.findAll({ where: sequelize.literal('"Item"."embedding" IS NULL'), order: [["id", "ASC"]], limit: batchSize });
    if (batch.length === 0) break;
    const stored = await storeEmbeddings(batch);
    if (stored === 0) break; // pgvector or the OpenAI key is missing
    total += stored;
  }
  return total;
}

module.exports = {
  parseFeatures,
  contains,
  embeddingText,
  vectorReady,
  storeEmbeddings,
  semanticMatches,
  keywordMatches,
  alertMatches,
  backfill,
};
