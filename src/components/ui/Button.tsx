import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  href?: string;
  children: ReactNode;
};

export function Button({ className, variant = "primary", href, children, ...props }: ButtonProps) {
  const classes = cn(
    "inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-action text-white hover:bg-blue-700",
    variant === "secondary" && "border border-line bg-white text-ink hover:bg-slate-50",
    variant === "danger" && "bg-danger text-white hover:bg-red-700",
    variant === "ghost" && "text-slate-700 hover:bg-slate-100",
    className
  );

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
