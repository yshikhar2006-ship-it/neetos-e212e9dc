import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import { subjectToken, type SubjectSlug } from "@/lib/utils/format";

/**
 * Bespoke subject marks (Section 7.7) — drawn at the same 1.5px stroke weight
 * as the shared icon library so they sit correctly beside lucide icons.
 */
type MarkProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function PhysicsMark(props: MarkProps) {
  return (
    <svg {...base} {...props} aria-hidden>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
    </svg>
  );
}

export function ChemistryMark(props: MarkProps) {
  return (
    <svg {...base} {...props} aria-hidden>
      <path d="M9.5 3v5.2L4.6 17.3A2.6 2.6 0 0 0 6.9 21h10.2a2.6 2.6 0 0 0 2.3-3.7L14.5 8.2V3" />
      <path d="M8.2 3h7.6" />
      <path d="M7.2 14.4h9.6" />
      <circle cx="10.6" cy="17.4" r="0.9" />
      <circle cx="14" cy="18.4" r="0.6" />
    </svg>
  );
}

export function BotanyMark(props: MarkProps) {
  return (
    <svg {...base} {...props} aria-hidden>
      <path d="M12 21v-8.4" />
      <path d="M12 12.6C12 8 15.3 4.4 20 3.6c.6 4.8-2.6 9-8 9Z" />
      <path d="M11 16.2C8.2 16.2 5.4 14 4.4 10.6c3.4-.5 6.3 1.5 6.9 4.6" />
    </svg>
  );
}

export function ZoologyMark(props: MarkProps) {
  return (
    <svg {...base} {...props} aria-hidden>
      <path d="M7.5 21c-1.9 0-3.2-1.6-2.8-3.4.4-1.8 2-2.6 2.9-4.2.9-1.6 1.7-3.6 4.4-3.6s3.5 2 4.4 3.6c.9 1.6 2.5 2.4 2.9 4.2.4 1.8-.9 3.4-2.8 3.4-1.6 0-2.8-.8-4.5-.8s-2.9.8-4.5.8Z" />
      <ellipse cx="5.6" cy="7.6" rx="1.9" ry="2.6" transform="rotate(-20 5.6 7.6)" />
      <ellipse cx="18.4" cy="7.6" rx="1.9" ry="2.6" transform="rotate(20 18.4 7.6)" />
    </svg>
  );
}

const MARKS: Record<SubjectSlug, (p: MarkProps) => JSX.Element> = {
  physics: PhysicsMark,
  chemistry: ChemistryMark,
  botany: BotanyMark,
  zoology: ZoologyMark,
};

export function SubjectIcon({ slug, className }: { slug?: string | null; className?: string }) {
  const token = subjectToken(slug);
  const Mark = MARKS[token];
  return <Mark className={cn("size-5", className)} />;
}
