import { items } from "@/data/recipes";
import { cn } from "@/lib/utils";
import { Emblem } from "./Emblem";

type Props = {
  id: string;
  size?: "sm" | "md";
  className?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
};

export function ItemChip({ id, size = "sm", className, onPointerDown, onClick }: Props) {
  const it = items[id];
  if (!it) return null;
  const big = size === "md";
  return (
    <div
      className={cn(
        "chip inline-flex select-none items-center gap-2 border border-line bg-panel text-fg",
        big ? "rounded-xl px-3.5 py-2.5 text-sm" : "rounded-lg px-2.5 py-1.5 text-xs",
        className,
      )}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <Emblem emoji={it.emoji} name={it.name} size={big ? 28 : 20} />
      <span className="max-w-28 truncate font-medium tracking-tight">{it.name}</span>
    </div>
  );
}
