import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Buttons follow the reference: black pill primary, white bordered pill secondary,
 * brand-colored pill for the one brand action on a screen, ghost for quiet links.
 * `ink` is kept as an alias of `primary` for earlier call sites.
 */
type Variant = "primary" | "secondary" | "brand" | "ghost" | "ink" | "white";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-chip font-medium whitespace-nowrap select-none transition-[background-color,color,box-shadow,transform,border-color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft",
  ink: "bg-ink text-white hover:bg-ink-soft",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink",
  brand: "bg-brand text-white hover:bg-brand-deep",
  white: "bg-white text-ink shadow-soft hover:bg-surface-muted",
  ghost: "bg-transparent text-ink hover:bg-surface-muted",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-[14px]",
  lg: "h-[52px] px-6 text-[15px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    full,
    loading,
    className,
    children,
    ...rest
  } = props;

  const classes = cn(base, variants[variant], sizes[size], full && "w-full", className);

  const content = (
    <>
      {loading && <Spinner />}
      <span className={cn(loading && "opacity-70")}>{children}</span>
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    const { href, target, rel } = rest as ButtonAsLink;
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {content}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonAsButton, keyof CommonProps>;
  return (
    <button
      type="button"
      {...buttonRest}
      disabled={buttonRest.disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
