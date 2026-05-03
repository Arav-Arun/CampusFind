import React from "react";

const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  ...props
}) => {
  const baseStyle =
    "px-6 py-2.5 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary:
      "bg-accent text-background hover:bg-[#00ADC4] shadow-lg shadow-accent/20",
    secondary:
      "bg-surface text-primary border border-primary/20 hover:bg-surface/80",
    ghost: "bg-transparent text-muted hover:text-text",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className} hover:scale-[1.02] active:scale-95`}
      onClick={onClick}
      type={props.type || "button"} // Default to button if not specified to prevent accidental submits
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
