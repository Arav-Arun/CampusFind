import React, { useState } from "react";
import { ImageOff } from "lucide-react";

const isBase64Image = (value) =>
  value.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const isImageFilename = (value) =>
  /^[^/?#]+\.(avif|gif|jpe?g|png|webp)$/i.test(value);

const normalizeImageSrc = (src) => {
  if (!src || typeof src !== "string") return "";

  const value = src.trim();
  if (!value) return "";
  if (value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (isBase64Image(value)) return `data:image/jpeg;base64,${value}`;
  if (isImageFilename(value)) return `/uploads/${value}`;

  return value.startsWith("/") ? value : `/${value}`;
};

const SafeImage = ({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  fallbackText = "Image unavailable",
  fallbackIconSize = 28,
}) => {
  const [failedSrc, setFailedSrc] = useState("");
  const imageSrc = normalizeImageSrc(src);
  const failed = imageSrc && failedSrc === imageSrc;

  if (!imageSrc || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-background text-muted ${fallbackClassName || className}`}
        role="img"
        aria-label={alt || fallbackText}
      >
        <ImageOff size={fallbackIconSize} />
        {fallbackText && (
          <span className="px-3 text-center text-sm">{fallbackText}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt || ""}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(imageSrc)}
    />
  );
};

export default SafeImage;
