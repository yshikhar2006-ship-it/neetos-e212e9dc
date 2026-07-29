import {
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const AXIS = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--color-popover-foreground)",
} as const;

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
  height = 220,
  tone = "primary",
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  height?: number;
  tone?: "primary" | "physics" | "chemistry" | "botany" | "zoology";
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "var(--color-border)" }} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={`var(--color-${tone})`}
          strokeWidth={2}
          dot={{ r: 3, fill: `var(--color-${tone})` }}
          activeDot={{ r: 5 }}
        />
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
        <Tooltip contentStyle={TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function QuadrantScatter({
  data,
  height = 260,
}: {
  data: { x: number; y: number; name: string; tone: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" dataKey="x" name="Avg seconds / question" domain={[0, "dataMax + 20"]} {...AXIS} />
        <YAxis type="number" dataKey="y" name="Accuracy %" domain={[0, 100]} {...AXIS} />
        <ReferenceLine y={60} stroke="var(--color-border)" />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data}>
          {data.map((d) => (
            <Cell key={d.name} fill={`var(--color-${d.tone})`} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** GitHub-style contribution grid. */
export function HeatmapGrid({
  values,
  className,
}: {
  values: { date: string; value: number; label?: string }[];
  className?: string;
}) {
  const level = (v: number) => {
    if (v <= 0) return "bg-muted";
    if (v < 2) return "bg-primary/25";
    if (v < 4) return "bg-primary/45";
    if (v < 6) return "bg-primary/70";
    return "bg-primary";
  };

  return (
    <div className={cn("grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2", className)}>
      {values.map((v) => (
        <span
          key={v.date}
          title={v.label ?? `${v.date}: ${v.value}h`}
          aria-label={v.label ?? `${v.date}: ${v.value} hours`}
          className={cn("size-3 rounded-[3px]", level(v.value))}
        />
      ))}
    </div>
  );
}
