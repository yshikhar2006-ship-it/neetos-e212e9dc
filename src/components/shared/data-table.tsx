import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export interface Column<T> {
  key: string;
  header: string;
  /** Sortable value; omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
  className?: string;
  numeric?: boolean;
}

/**
 * The one table used by every tracker screen (Section 3).
 * Sorting, optional row selection and row-click detail are built in here so no
 * screen ships a one-off table.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  selectable,
  selected,
  onSelectedChange,
  defaultSort,
  emptyMessage = "No rows match these filters.",
  className,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  emptyMessage?: string;
  className?: string;
}) {
  const [sort, setSort] = useState(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, columns, sort]);

  const selectedSet = new Set(selected ?? []);
  const allSelected = rows.length > 0 && rows.every((r) => selectedSet.has(rowKey(r)));

  const toggleAll = () => onSelectedChange?.(allSelected ? [] : rows.map(rowKey));
  const toggleRow = (id: string) =>
    onSelectedChange?.(selectedSet.has(id) ? (selected ?? []).filter((s) => s !== id) : [...(selected ?? []), id]);

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full min-w-[640px] text-caption">
        <thead className="bg-muted/60">
          <tr>
            {selectable ? (
              <th scope="col" className="w-10 px-3 py-2">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all rows" />
              </th>
            ) : null}
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th key={c.key} scope="col" className={cn("px-3 py-2 text-left font-medium", c.className)}>
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) =>
                          s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "desc" },
                        )
                      }
                      className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Sort by ${c.header}`}
                    >
                      {c.header}
                      {active ? (
                        sort!.dir === "asc" ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" aria-hidden />
                      )}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">{c.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const id = rowKey(row);
            return (
              <tr
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-border transition-colors",
                  onRowClick && "cursor-pointer hover:bg-accent/60",
                  selectedSet.has(id) && "bg-primary/8",
                )}
              >
                {selectable ? (
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedSet.has(id)}
                      onCheckedChange={() => toggleRow(id)}
                      aria-label="Select row"
                    />
                  </td>
                ) : null}
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2 align-middle", c.numeric && "num", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-3 py-10 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
