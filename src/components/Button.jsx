import React from "react";

const VARIANTS = {
  primary: "bg-accent text-background font-semibold hover:bg-accent-strong",
  secondary: "bg-surface text-recovered border border-recovered/25 hover:bg-subtle",
  ghost: "bg-transparent text-muted hover:text-text hover:bg-subtle",
  danger: "bg-surface text-lost border border-lost/30 hover:bg-lost/10",
};

export const buttonClass = (variant = "primary", className = "") =>
  `inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`;

const Button = ({ children, variant = "primary", className = "", type = "button", ...props }) => (
  <button type={type} className={buttonClass(variant, className)} {...props}>
    {children}
  </button>
);

export default Button;
