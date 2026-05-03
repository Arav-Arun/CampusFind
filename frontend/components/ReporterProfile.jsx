import React from "react";
import { MessageCircle } from "lucide-react";
import SafeImage from "./SafeImage";

const ReporterProfile = ({ reporter }) => {
  if (!reporter) return null;

  return (
    <div className="p-5 bg-surface border border-white/10 rounded-xl mt-6">
      <h3 className="text-sm uppercase tracking-wider text-muted font-bold mb-4">
        Reported By
      </h3>
      <div className="flex items-center gap-4">
        {reporter.profile_photo ? (
          <SafeImage
            src={reporter.profile_photo}
            className="w-12 h-12 rounded-full object-cover border border-white/10"
            fallbackClassName="w-12 h-12 rounded-full border border-white/10"
            fallbackIconSize={18}
            fallbackText=""
            alt="Profile"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-xl">
            {reporter.name?.[0] || "?"}
          </div>
        )}
        <div>
          <p className="font-bold text-lg">{reporter.name || "Unknown User"}</p>
          <p className="text-sm text-muted">{reporter.email}</p>
        </div>
      </div>

      {/* Contact Details (Only show phone if available) */}
      {(reporter.phone || reporter.contact_info) && (
        <div className="mt-4 space-y-2 pt-4 border-t border-white/5">
          {reporter.phone && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                <MessageCircle size={14} className="text-green-400" />
              </div>
              <span>{reporter.phone}</span>
            </div>
          )}
          {reporter.contact_info && reporter.contact_info !== reporter.phone && (
            <div className="flex items-center gap-2 text-sm text-muted italic">
              <span>Note: {reporter.contact_info}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReporterProfile;
