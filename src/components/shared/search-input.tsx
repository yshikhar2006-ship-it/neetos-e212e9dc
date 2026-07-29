import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** In-page search: icon-prefixed, debounced. Distinct from the global command palette. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocusKey,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  /** Bind a single-key shortcut (e.g. "/") to focus this field. */
  autoFocusKey?: string;
  label?: string;
}) {
  const [local, setLocal] = useState(value);
  const [el, setEl] = useState<HTMLInputElement | null>(null);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  useEffect(() => {
    if (!autoFocusKey || !el) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === autoFocusKey) {
        e.preventDefault();
        el.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [autoFocusKey, el]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={setEl}
        value={local}
        aria-label={label ?? placeholder}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="h-10 pl-9 pr-9"
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
