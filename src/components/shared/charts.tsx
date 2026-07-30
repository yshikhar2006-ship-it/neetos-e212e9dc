import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as ReRadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

/**
 * Shared chart system (Section 6).
 * Axis, tooltip, gridline and colour decisions live here once — no screen
 * defines its own palette or falls back to the library default tooltip.
 * All values resolve from design tokens, so light mode is handled by the theme.
 */
const AXIS = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const GRID = { stroke: "var(--color-border)", strokeDasharray: "3 3" } as const;

export const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface-raised)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
  fontFamily: "var(--font-sans)",
  color: "var(--color-popover-foreground)",
  boxShadow: "var(--shadow-raised)",
  padding: "8px 10px",
} as const;

const TOOLTIP_ITEM = {
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  color: "var(--color-foreground)",
} as const;

const TOOLTIP_LABEL = { fontFamily: "var(--font-sans)", color: "var(--color-muted-foreground)" } as const;

const sharedTooltip = {
  contentStyle: TOOLTIP_STYLE,
  itemStyle: TOOLTIP_ITEM,
  labelStyle: TOOLTIP_LABEL,
} as const;

export const SUBJECT_TONES = ["physics", "chemistry", "botany", "zoology"] as const;

/** Every chart ships with a data-table alternative for screen readers. */
export function ChartDataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-caption text-muted-foreground hover:text-foreground">
        View as data table
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
        <table className="w-full text-caption">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted/60">
            <tr>
              {columns.map((c) => (
                <th key={c} scope="col" className="px-3 py-2 text-left font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {r.map((cell, j) => (
                  <td key={j} className="num px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function LineChart({
  data,
  xKey,
  yKey,
  yKeys,
  height = 220,
  tone = "primary",
  animate = true,
  domain,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey?: string;
  yKeys?: { key: string; tone: string; label?: string }[];
  height?: number;
  tone?: string;
  animate?: boolean;
  domain?: [number | string, number | string];
}) {
  const series = yKeys ?? (yKey ? [{ key: yKey, tone }] : []);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} domain={domain} />
        <Tooltip {...sharedTooltip} cursor={{ stroke: "var(--color-border)" }} />
        {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            name={s.label ?? s.key}
            dataKey={s.key}
            stroke={`var(--color-${s.tone})`}
            strokeWidth={2}
            isAnimationActive={animate}
            animationDuration={700}
            dot={{ r: 3, fill: `var(--color-${s.tone})` }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 220,
}: {
  data: { name: string; value: number; tone: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={`var(--color-${d.tone})`} stroke="var(--color-background)" />
          ))}
        </Pie>
        <Tooltip {...sharedTooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Grouped bars — used by Difficulty Tracker (easy/medium/hard per subject). */
export function GroupedBarChart({
  data,
  xKey,
  series,
  height = 260,
  domain,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; label: string; tone: string }[];
  height?: number;
  domain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} domain={domain} />
        <Tooltip {...sharedTooltip} cursor={{ fill: "var(--color-accent)", opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={`var(--color-${s.tone})`} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Subject comparison radar — completion, accuracy and confidence on one axis set. */
export function SubjectRadarChart({
  data,
  series,
  height = 300,
}: {
  data: { subject: string; [k: string]: string | number }[];
  series: { key: string; label: string; tone: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReRadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} />
        <Tooltip {...sharedTooltip} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Radar
            key={s.key}
            name={s.label}
            dataKey={s.key}
            stroke={`var(--color-${s.tone})`}
            fill={`var(--color-${s.tone})`}
            fillOpacity={0.18}
          />
        ))}
      </ReRadarChart>
    </ResponsiveContainer>
  );
}

export function QuadrantScatter({
  data,
  height = 260,
  xLabel = "Avg seconds / question",
  yLabel = "Accuracy %",
  xDomain = [0, "dataMax + 20"] as [number | string, number | string],
  xReference,
  yReference = 60,
}: {
  data: { x: number; y: number; name: string; tone: string }[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
  xDomain?: [number | string, number | string];
  xReference?: number;
  yReference?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: -16 }}>
        <CartesianGrid {...GRID} />
        <XAxis type="number" dataKey="x" name={xLabel} domain={xDomain} {...AXIS} />
        <YAxis type="number" dataKey="y" name={yLabel} domain={[0, 100]} {...AXIS} />
        {yReference !== undefined ? <ReferenceLine y={yReference} stroke="var(--color-border)" /> : null}
        {xReference !== undefined ? <ReferenceLine x={xReference} stroke="var(--color-border)" /> : null}
        <Tooltip {...sharedTooltip} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data}>
          {data.map((d, i) => (
            <Cell key={`${d.name}-${i}`} fill={`var(--color-${d.tone})`} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** Tiny inline trend line for revision retention. */
export function Sparkline({ values, tone = "primary", className }: { values: number[]; tone?: string; className?: string }) {
  if (values.length < 2) return <span className={cn("text-caption text-muted-foreground", className)}>—</span>;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 60},${20 - ((v - min) / span) * 18}`)
    .join(" ");
  return (
    <svg viewBox="0 0 60 20" className={cn("h-5 w-16", className)} aria-hidden>
      <polyline points={points} fill="none" stroke={`var(--color-${tone})`} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The single heatmap implementation (Section 6 / Section 8).
 * Reused by Habit Tracker, Dashboard, Analytics' Time tab and Revision Tracker.
 * Single-hue intensity only — never a multi-colour scale.
 */
export function HeatmapGrid({
  values,
  className,
  thresholds = [0, 2, 4, 6],
  unit = "h",
}: {
  values: { date: string; value: number; label?: string }[];
  className?: string;
  thresholds?: [number, number, number, number] | number[];
  unit?: string;
}) {
  const level = (v: number) => {
    if (v <= thresholds[0]) return "bg-muted";
    if (v < thresholds[1]) return "bg-primary/25";
    if (v < thresholds[2]) return "bg-primary/45";
    if (v < thresholds[3]) return "bg-primary/70";
    return "bg-primary";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
        {values.map((v) => (
          <span
            key={v.date}
            title={v.label ?? `${v.date}: ${v.value}${unit}`}
            aria-label={v.label ?? `${v.date}: ${v.value} ${unit}`}
            className={cn("size-3 rounded-[3px]", level(v.value))}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
        <span>Less</span>
        {["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"].map((c) => (
          <span key={c} className={cn("size-3 rounded-[3px]", c)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
