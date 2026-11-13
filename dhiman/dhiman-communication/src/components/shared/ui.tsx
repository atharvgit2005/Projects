import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2.5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-[2rem]">{title}</h2>
        {description ? <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variants = {
    default: "border border-white/10 bg-white/5 text-slate-200",
    success: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    warning: "border border-amber-400/20 bg-amber-500/10 text-amber-200",
    danger: "border border-rose-400/20 bg-rose-500/10 text-rose-300",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium", variants[variant])}>
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass rounded-2xl border border-white/10 p-5 md:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl border text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60";
  const variants = {
    primary: "border-cyan-300 bg-cyan-300 text-slate-950 hover:border-cyan-200 hover:bg-cyan-200",
    secondary: "border-white/10 bg-white/5 text-white hover:bg-white/10",
    ghost: "border-transparent bg-transparent text-slate-300 hover:border-white/8 hover:bg-white/6 hover:text-white",
    danger: "border-rose-500/70 bg-rose-500/90 text-white hover:bg-rose-500",
  };
  const sizes = {
    sm: "h-9 px-3.5",
    md: "h-10 px-4",
    lg: "h-11 px-5 text-[15px]",
  };

  return cn(base, variants[variant], sizes[size], fullWidth && "w-full");
}

export function Button({
  children,
  className,
  variant,
  size,
  fullWidth,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  return (
    <button className={cn(buttonStyles({ variant, size, fullWidth }), className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant,
  size,
  fullWidth,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
    >
      {children}
    </Link>
  );
}

export function TextField({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <input
        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-cyan-300/60 focus:bg-slate-950/80"
        {...props}
      />
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  error,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <select
        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white transition focus:border-cyan-300/60 focus:bg-slate-950/80"
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export function TextAreaField({
  label,
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <textarea
        className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-cyan-300/60 focus:bg-slate-950/80"
        {...props}
      />
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}

export function CheckboxField({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className={cn("flex items-center gap-3 text-sm text-slate-200", className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-white/15 bg-slate-950/70 text-cyan-300" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="flex min-h-52 flex-col items-center justify-center gap-4 border-dashed text-center">
      <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
      <p className="max-w-lg text-sm leading-6 text-slate-400">{description}</p>
      {action}
    </Panel>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Panel className="space-y-2.5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="font-display text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
    </Panel>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-white/8" />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-3xl border border-white/8 bg-white/5", className)} />;
}
