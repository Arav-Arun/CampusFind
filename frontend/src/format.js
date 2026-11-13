/** "2026-11-12 16:42" (UTC, as sent by the API) -> "12 Nov 2026" in the viewer's locale. */
export const formatDay = (value) => {
  if (!value) return "";
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/** Where an item stands: recovered and pending handoffs take priority over lost/found. */
export const itemState = (item) =>
  item.claim_state === "claimed" || item.status === "claimed"
    ? "claimed"
    : item.claim_state === "in_progress"
      ? "in_progress"
      : item.type === "found"
        ? "found"
        : "lost";

/** ISO timestamp -> "14 Nov 2026, 4:00 pm" in the viewer's locale and time zone. */
export const formatDateTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

// Placeholder text older reports saved when photo tagging failed.
const PLACEHOLDER_TAGS = new Set(["general item", "see image", "unknown", "none", "null", "n/a"]);

/** Drops empty values and placeholder tags. */
export const realTags = (...values) =>
  values.filter((v) => typeof v === "string" && v.trim() && !PLACEHOLDER_TAGS.has(v.trim().toLowerCase()));

/**
 * Asks Cloudinary for a resized, auto-format (WebP/AVIF) copy instead of the full photo.
 * Other URLs are returned unchanged.
 */
export const imageSrc = (url, width) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com/") || !url.includes("/image/upload/")) return url;
  const [head, tail] = url.split("/image/upload/");
  if (/^[a-z]_[^/]*,|^[a-z]_[^/]*\//.test(tail)) return url; // already transformed
  return `${head}/image/upload/f_auto,q_auto,c_limit,w_${width}/${tail}`;
};
