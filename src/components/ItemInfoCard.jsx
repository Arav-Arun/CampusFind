import React from "react";
import { MapPin, Calendar } from "lucide-react";
import SafeImage from "./SafeImage";
import StatusBadge from "./StatusBadge";
import { formatDay, imageSrc, realTags } from "../format";

const ItemInfoCard = ({ item, children }) => {
  const tags = realTags(item.category, item.color, item.brand, ...(item.distinctive_features || []));

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <SafeImage
        src={imageSrc(item.image_url, 1000)}
        alt={item.description}
        className="aspect-square w-full rounded-xl border border-line bg-subtle object-cover"
        fallbackClassName="aspect-square w-full rounded-xl"
      />

      <div className="min-w-0 space-y-6">
        <div>
          <StatusBadge item={item} className="mb-3" />
          <h1 className="display break-words text-3xl">{item.description}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <MapPin size={15} /> {item.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={15} /> {formatDay(item.date_lost)}
            </span>
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Details</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span key={i} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Tagged automatically from the photo.</p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

export default ItemInfoCard;
