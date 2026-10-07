import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { categories, items, totalItems, type ItemCategory } from "@/data/recipes";
import { cn } from "@/lib/utils";
import { ItemChip } from "./ItemChip";

type Props = {
  discovered: string[];
  inventoryRef: (el: HTMLElement | null) => void;
  onDragBegin: (id: string, clientX: number, clientY: number) => void;
  onPick: (id: string) => void;
};

export function Inventory({ discovered, inventoryRef, onDragBegin, onPick }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ItemCategory | "all">("all");

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return discovered.filter((id) => {
      const it = items[id];
      if (!it) return false;
      if (cat !== "all" && it.category !== cat) return false;
      if (query && !it.name.toLowerCase().includes(query) && !id.includes(query)) return false;
      return true;
    });
  }, [discovered, q, cat]);

  return (
    <aside
      ref={inventoryRef}
      data-inventory=""
      className="flex min-h-0 min-w-0 flex-col overflow-x-hidden border-line bg-panel/95 md:border-l max-md:border-t"
    >
      <div className="flex items-end justify-between gap-3 px-4 pt-3">
        <div>
          <h2 className="font-display text-lg font-medium tracking-tight text-fg">Discoveries</h2>
          <p className="text-xs tabular-nums text-muted">
            {discovered.length} / {totalItems}
          </p>
        </div>
      </div>
      <div className="relative px-4 pt-3">
        <Search className="pointer-events-none absolute top-1/2 left-7 size-3.5 -translate-y-px text-muted" />
        <input
          className="h-10 w-full rounded-xl border border-line bg-ink px-9 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
          placeholder="Search the tray"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search discoveries"
        />
      </div>
      <div className="flex max-w-full gap-1 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none]">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
              cat === c.id
                ? "border-accent bg-accent text-ink"
                : "border-line bg-transparent text-muted hover:text-fg",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {shown.map((id) => (
            <ItemChip
              key={id}
              id={id}
              className="cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                if (e.button !== 0 && e.pointerType === "mouse") return;
                onDragBegin(id, e.clientX, e.clientY);
                e.preventDefault();
              }}
              onClick={() => onPick(id)}
            />
          ))}
          {shown.length === 0 && (
            <p className="py-6 text-sm text-muted">No discoveries match that filter.</p>
          )}
        </div>
      </div>
      <p className="hidden px-4 pb-3 text-[11px] leading-relaxed text-muted md:block">
        Drag onto the board. Drop two together to combine. Drag a piece back here to remove it.
      </p>
    </aside>
  );
}
