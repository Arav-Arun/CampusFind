import React from "react";
import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import SafeImage from "./SafeImage";
import StatusBadge from "./StatusBadge";
import { formatDay, imageSrc, realTags } from "../format";

const ItemCard = ({ item }) => {
  const tags = realTags(item.category, item.color).join(", ");

  return (
    <Link
      to={`/item/${item.id}`}
      state={{ item }}
      className="group block rounded-xl border border-line bg-surface p-2 transition-colors hover:border-text/30"
    >
      <SafeImage
        src={imageSrc(item.image_url, 640)}
        alt={item.description}
        className="aspect-[4/3] w-full rounded-lg bg-subtle object-cover"
        fallbackClassName="aspect-[4/3] w-full rounded-lg"
      />
      <div className="px-1.5 pb-1.5 pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <StatusBadge item={item} />
          <time className="text-xs text-muted">{formatDay(item.date_lost)}</time>
        </div>
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-accent">
          {item.description}
        </h3>
        <p className="mt-1.5 flex items-center gap-1 truncate text-sm text-muted">
          <MapPin size={14} className="shrink-0" /> {item.location}
        </p>
        {tags && <p className="mt-1 truncate text-sm text-muted">{tags}</p>}
      </div>
    </Link>
  );
};

export default ItemCard;
