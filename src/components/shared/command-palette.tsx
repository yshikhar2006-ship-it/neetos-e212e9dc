import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ClipboardList, ListTodo, Sparkles } from "lucide-react";
import { NAV_ALL } from "@/components/shared/nav-config";
import { useSubjects } from "@/hooks/use-curriculum";

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: subjects = [] } = useSubjects();

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, subjects and actions…" />
      <CommandList>
        <CommandEmpty>No matches. Try a subject or a page name.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/practice/mock/setup")}>
            <ClipboardList className="size-4" aria-hidden /> Start a mock test
          </CommandItem>
          <CommandItem onSelect={() => go("/today")}>
            <ListTodo className="size-4" aria-hidden /> Log today's hours
          </CommandItem>
          <CommandItem onSelect={() => go("/ai-coach")}>
            <Sparkles className="size-4" aria-hidden /> Ask the AI Coach
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Subjects">
          {subjects.map((s) => (
            <CommandItem key={s.id} value={`subject ${s.name}`} onSelect={() => go(`/syllabus/${s.slug}`)}>
              {s.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {NAV_ALL.map((item) => (
            <CommandItem key={item.to} value={`${item.label} ${item.description ?? ""}`} onSelect={() => go(item.to)}>
              <item.icon className="size-4" aria-hidden />
              <span>{item.label}</span>
              {item.description ? (
                <span className="ml-auto text-caption text-muted-foreground">{item.description}</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
