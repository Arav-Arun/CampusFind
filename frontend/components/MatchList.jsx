import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import SafeImage from "./SafeImage";

const MatchList = ({ matches, loadingMatches }) => {
  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Sparkles className="text-accent" /> AI Matches
      </h2>
      
      {loadingMatches ? (
        <div className="text-center py-10 text-muted border border-white/5 rounded-xl">
          <Sparkles className="animate-spin mx-auto mb-2" size={24} />
          <p>Scanning for matches...</p>
        </div>
      ) : matches.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="bg-surface rounded-xl p-4 border border-accent/20 hover:border-accent/40 transition-all flex gap-4"
            >
              <SafeImage
                src={match.item.image_url}
                className="w-24 h-24 rounded-lg object-cover bg-black"
                fallbackClassName="w-24 h-24 rounded-lg"
                fallbackIconSize={22}
                alt={match.item.description}
              />
              <div>
                <h3 className="font-bold">{match.item.description}</h3>
                <span className="text-xs bg-accent text-black px-2 py-0.5 rounded-full font-bold">
                  {match.confidence}% Match
                </span>
                <p className="text-xs text-muted mt-2 italic">
                  "{match.reasoning}"
                </p>
                <Link
                  to={`/item/${match.item.id}`}
                  className="text-accent text-sm hover:underline mt-1 block"
                >
                  View Item
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-surface rounded-xl border border-white/5">
          <p className="text-muted mb-2">No AI matches found yet.</p>
          <p className="text-xs text-muted">
            We will automatically notify you if a matching item is reported!
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchList;
