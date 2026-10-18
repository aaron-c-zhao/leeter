import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({ variant = "secondary", className, type = "button", ...rest }: ButtonProps) {
  const variantClass = variant === "primary" ? "btn-primary" : "";
  return <button type={type} className={className ? `${className} ${variantClass}` : variantClass} {...rest} />;
}
