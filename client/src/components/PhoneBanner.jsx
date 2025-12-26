import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Phone, X } from "lucide-react";

const PhoneBanner = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);

  if (!user || user.phone || !visible) return null;

  return (
    <div className="bg-accent/20 text-accent border-b border-accent/20 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Phone size={16} />
        <span>Please add your mobile number to help us contact you.</span>
        <Link
          to="/profile"
          className="underline font-bold hover:text-white transition-colors"
        >
          Add Now
        </Link>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-accent/60 hover:text-white p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default PhoneBanner;
