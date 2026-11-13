export const formatDay = (value) => {
  if (!value) return "";
  const date = new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export const itemState = (item) =>
  item.claim_state === "claimed" || item.status === "claimed"
    ? "claimed"
    : item.claim_state === "in_progress"
      ? "in_progress"
      : item.type === "found"
        ? "found"
        : "lost";

export const formatDateTime = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const PLACEHOLDER_TAGS = new Set(["general item", "see image", "unknown", "none", "null", "n/a"]);

export const realTags = (...values) =>
  values.filter((v) => typeof v === "string" && v.trim() && !PLACEHOLDER_TAGS.has(v.trim().toLowerCase()));

export const imageSrc = (url, width) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com/") || !url.includes("/image/upload/")) return url;
  const [head, tail] = url.split("/image/upload/");
  if (/^[a-z]_[^/]*,|^[a-z]_[^/]*\//.test(tail)) return url;
  return `${head}/image/upload/f_auto,q_auto,c_limit,w_${width}/${tail}`;
};
