import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { SubjectIcon } from "@/components/shared/subject-icons";
import { subjectToken } from "@/lib/utils/format";

const SESSION_KEY = "neetos:rings-animated";

/**
 * Radial SVG progress ring (Section 2) — stroke-dasharray driven, never a
 * conic-gradient, and animated 0 → value once per session only.
 */
export function SubjectRing({
  slug,
  name,
  value,
  done,
  total,
}: {
  slug: string;
  name: string;
  value: number;
  done: number;
  total: number;
}) {
  const tone = subjectToken(slug);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const [shown, setShown] = useState(value);
  const animated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyRan = window.sessionStorage.getItem(SESSION_KEY) === "1";
    if (alreadyRan || animated.current) {
      setShown(value);
      return;
    }
    animated.current = true;
    setShown(0);
    const t = setTimeout(() => setShown(value), 60);
    const done2 = setTimeout(() => window.sessionStorage.setItem(SESSION_KEY, "1"), 1200);
    return () => {
      clearTimeout(t);
      clearTimeout(done2);
    };
  }, [value]);

  return (
    <Link
      to="/syllabus"
      className="precision-card surface flex flex-col items-center gap-3 p-4"
      aria-label={`${name}: ${value}% complete, ${done} of ${total} topics`}
    >
      <div className="relative grid place-items-center">
        <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--color-muted)" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={`var(--color-${tone})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * shown) / 100}
            style={{
              transition: "stroke-dashoffset 900ms cubic-bezier(0.34, 1.42, 0.64, 1)",
            }}
          />
        </svg>
        <span className="absolute num text-subheading font-semibold">
          <span className="precision-rounded">{value}%</span>
          <span className="precision-detail absolute inset-0 grid place-items-center text-caption">
            {total ? ((done / total) * 100).toFixed(1) : "0.0"}%
          </span>
        </span>
      </div>
      <span className="flex items-center gap-1.5 text-caption font-medium">
        <SubjectIcon slug={slug} className="size-4" style={{ color: `var(--color-${tone})` }} />
        {name}
      </span>
      <span className={cn("num text-caption text-muted-foreground")}>
        {done}/{total} topics
      </span>
    </Link>
  );
}
