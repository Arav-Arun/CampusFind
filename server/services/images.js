const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Downscales to 1024px JPEG. Throws if the buffer is not a valid image. */
async function compressImage(buffer) {
  const sharp = require("sharp"); // loaded lazily: its native binary can crash cold starts
  return sharp(buffer)
    .rotate() // honour EXIF orientation before metadata is stripped
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
}

/** Uploads a buffer to Cloudinary and returns its HTTPS URL. */
function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "campusfind", resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

// Older rows stored images in several shapes (full URL, partial Cloudinary path,
// bare public id, base64 in image_data). These helpers turn any of them into
// something an <img> can load, or "" when nothing usable is stored.
const text = (value) => (typeof value === "string" ? value.trim() : "");
const cloudName = () => text(process.env.CLOUDINARY_CLOUD_NAME);
const isBase64Image = (value) => value.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);

function cloudinaryUrl(value) {
  const path = text(value).replace(/^\/+/, "");
  if (!path) return "";
  if (path.startsWith("res.cloudinary.com/")) return `https://${path}`;
  if (!cloudName()) return "";
  if (path.startsWith("image/upload/")) return `https://res.cloudinary.com/${cloudName()}/${path}`;

  // A bare id lives in our upload folder unless it already carries a version or folder.
  const publicId = /^v\d+\//.test(path) || path.includes("/") ? path : `campusfind/${path}`;
  return `https://res.cloudinary.com/${cloudName()}/image/upload/${publicId}`;
}

function directUrl(value) {
  const v = text(value);
  if (/^(https?:|data:|blob:)/.test(v)) return v;
  if (v.startsWith("//res.cloudinary.com/")) return `https:${v}`;
  if (v.startsWith("res.cloudinary.com/") || v.startsWith("image/upload/")) return cloudinaryUrl(v);
  return "";
}

function itemImageUrl({ image_url, image_data }) {
  const url = text(image_url);
  const stored = text(image_data);

  const fromUrl = directUrl(url);
  if (fromUrl) return fromUrl;

  const fromData = directUrl(stored) || (isBase64Image(stored) ? `data:image/jpeg;base64,${stored}` : "");
  if (fromData) return fromData;

  if (!url || url.startsWith("/") || url.startsWith("uploads/")) return "";
  return cloudinaryUrl(url);
}

module.exports = { compressImage, uploadImage, itemImageUrl };
