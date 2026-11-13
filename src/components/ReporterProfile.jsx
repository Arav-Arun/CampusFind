import React from "react";
import { Phone, Mail } from "lucide-react";
import SafeImage from "./SafeImage";

const Initial = ({ name }) => (
  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-subtle font-semibold">
    {name?.[0]?.toUpperCase() || "?"}
  </div>
);

/** Contact details are only sent by the API once the viewer is allowed to see them. */
const ReporterProfile = ({ reporter }) => {
  if (!reporter) return null;
  const hasContact = reporter.email || reporter.phone || reporter.contact_info;

  return (
    <div className="border-t border-line pt-5">
      <h2 className="mb-3 text-sm font-semibold">Reported by</h2>
      <div className="flex items-center gap-3">
        {reporter.profile_photo ? (
          <SafeImage
            src={reporter.profile_photo}
            className="h-11 w-11 rounded-full object-cover"
            fallbackClassName="h-11 w-11 rounded-full"
            fallbackIconSize={16}
            fallbackText=""
            alt=""
          />
        ) : (
          <Initial name={reporter.name} />
        )}
        <p className="font-medium">{reporter.name || "Unknown user"}</p>
      </div>

      {hasContact ? (
        <div className="mt-3 space-y-1.5 text-sm">
          {reporter.phone && (
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-muted" /> {reporter.phone}
            </p>
          )}
          {reporter.email && (
            <p className="flex items-center gap-2">
              <Mail size={14} className="text-muted" /> {reporter.email}
            </p>
          )}
          {reporter.contact_info && reporter.contact_info !== reporter.phone && (
            <p className="text-muted">Note: {reporter.contact_info}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Contact details appear here once the reporter accepts your claim.</p>
      )}
    </div>
  );
};

export default ReporterProfile;
