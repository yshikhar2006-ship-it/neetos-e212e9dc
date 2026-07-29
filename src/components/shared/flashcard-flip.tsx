import { useState } from "react";
import { cn } from "@/lib/utils";

export function FlashcardFlip({
  front,
  back,
  imageUrl,
  flipped: controlled,
  onFlip,
  className,
}: {
  front: string;
  back: string;
  imageUrl?: string | null;
  flipped?: boolean;
  onFlip?: (next: boolean) => void;
  className?: string;
}) {
  const [internal, setInternal] = useState(false);
  const flipped = controlled ?? internal;

  const toggle = () => {
    const next = !flipped;
    if (controlled === undefined) setInternal(next);
    onFlip?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={flipped}
      aria-label={flipped ? "Show question" : "Reveal answer"}
      className={cn("group w-full [perspective:1400px]", className)}
    >
      <div
        className={cn(
          "relative h-72 w-full transition-transform duration-300 ease-out [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div className="surface absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center [backface-visibility:hidden]">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="max-h-28 rounded-md object-contain" />
          ) : null}
          <p className="text-subheading font-medium text-foreground">{front}</p>
          <span className="text-caption text-muted-foreground">Click or press Enter to reveal</span>
        </div>
        <div className="surface absolute inset-0 flex flex-col items-center justify-center gap-3 bg-accent/40 p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Answer
          </span>
          <p className="text-subheading text-foreground">{back}</p>
        </div>
      </div>
    </button>
  );
}
