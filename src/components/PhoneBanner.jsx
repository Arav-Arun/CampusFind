import React, { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "../AuthContext";

const PhoneBanner = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);

  if (!user || user.phone || !visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-subtle px-4 py-2 text-sm">
      <p>
        Add a phone number so the person who finds your item can reach you.{" "}
        <Link to="/profile" className="font-medium text-accent underline underline-offset-2">
          Add it
        </Link>
      </p>
      <button onClick={() => setVisible(false)} className="rounded p-1 text-muted hover:text-text" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
};

export default PhoneBanner;
