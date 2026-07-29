import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  trend,
  hint,
  accent = "primary",
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon?: LucideIcon;
  trend?: number;
  hint?: string;
  accent?: "primary" | "physics" | "chemistry" | "botany" | "zoology" | "success" | "warning";
  onClick?: () => void;
  className?: string;
}) {
  const accentClass = {
    primary: "text-primary",
    physics: "text-physics",
    chemistry: "text-chemistry",
    botany: "text-botany",
    zoology: "text-zoology",
    success: "text-success",
    warning: "text-warning",
  }[accent];

  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={cn(
        "surface elevate w-full p-4 text-left",
        onClick && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-caption font-medium text-muted-foreground">{label}</span>
        {Icon ? <Icon className={cn("size-4 shrink-0", accentClass)} aria-hidden /> : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="num text-heading font-semibold text-foreground">{value}</span>
        {suffix ? <span className="num text-caption text-muted-foreground">{suffix}</span> : null}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {typeof trend === "number" ? (
          <span
            className={cn(
              "num inline-flex items-center gap-1 text-caption",
              trend >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {trend >= 0 ? (
              <TrendingUp className="size-3" aria-hidden />
            ) : (
              <TrendingDown className="size-3" aria-hidden />
            )}
            {trend >= 0 ? "+" : ""}
            {trend}
          </span>
        ) : null}
        {hint ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
      </div>
    </Comp>
  );
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
  tone = "primary",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  tone?: "primary" | "physics" | "chemistry" | "botany" | "zoology";
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const toneClass = {
    primary: "text-primary",
    physics: "text-physics",
    chemistry: "text-chemistry",
    botany: "text-botany",
    zoology: "text-zoology",
  }[tone];

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ? `${label}: ` : ""}${clamped} percent complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className={cn("transition-[stroke-dashoffset] duration-300 ease-out", toneClass)}
          stroke="currentColor"
        />
      </svg>
      <span className="num absolute text-caption font-semibold text-foreground">{clamped}%</span>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "primary",
  className,
  label,
}: {
  value: number;
  tone?: "primary" | "physics" | "chemistry" | "botany" | "zoology" | "success" | "warning";
  className?: string;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const toneClass = {
    primary: "bg-primary",
    physics: "bg-physics",
    chemistry: "bg-chemistry",
    botany: "bg-botany",
    zoology: "bg-zoology",
    success: "bg-success",
    warning: "bg-warning",
  }[tone];

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300 ease-out", toneClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
