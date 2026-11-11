import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";

/** A button, or a link that looks like one when `href` is given. */
export function Button({
  variant = "primary",
  href,
  children,
  className = "",
  ...rest
}: { variant?: Variant; href?: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = `btn btn-${variant} ${className}`.trim();
  if (href) {
    return (
      <a className={classes} href={href}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
