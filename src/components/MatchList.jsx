import React from "react";
import { Link } from "react-router-dom";
import SafeImage from "./SafeImage";
import { imageSrc } from "../format";

const MatchList = ({ matches, loadingMatches }) => (
  <section className="mt-12">
    <h2 className="text-xl font-bold">Possible matches</h2>
    <p className="mb-4 mt-1 text-sm text-muted">Reports that share details with this one.</p>

    {loadingMatches ? (
      <p className="text-sm text-muted">Looking for matches...</p>
    ) : matches.length > 0 ? (
      <ul className="grid gap-3 md:grid-cols-2">
        {matches.map((match) => (
          <li key={match.id}>
            <Link
              to={`/item/${match.item.id}`}
              className="flex gap-4 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-text/30"
            >
              <SafeImage
                src={imageSrc(match.item.image_url, 200)}
                className="h-20 w-20 shrink-0 rounded-lg bg-subtle object-cover"
                fallbackClassName="h-20 w-20 shrink-0 rounded-lg"
                fallbackIconSize={20}
                fallbackText=""
                alt=""
              />
              <div className="min-w-0">
                <p className="line-clamp-2 font-medium">{match.item.description}</p>
                <p className="mt-1 text-sm text-muted">
                  {match.method === "semantic" ? `${match.confidence}% similar · ${match.reasoning}` : `${match.confidence}% of details match`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="rounded-lg border border-dashed border-line p-6 text-sm text-muted">
        Nothing similar has been reported yet. When a matching report comes in, you'll get a notification.
      </p>
    )}
  </section>
);

export default MatchList;
