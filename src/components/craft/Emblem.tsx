import { useEmblem } from "@/hooks/useEmblem";
import { cn } from "@/lib/utils";

export function Emblem({
  emoji,
  name,
  size = 28,
}: {
  emoji: string;
  name: string;
  size?: number;
}) {
  const { src, loading, error } = useEmblem(emoji);
  if (error) {
    return (
      <span className="leading-none" style={{ fontSize: size * 0.82 }} aria-hidden>
        {emoji}
      </span>
    );
  }
  if (loading || !src) {
    return (
      <span
        className="inline-block animate-pulse rounded-full bg-line"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <img
      className={cn("block drop-shadow-sm")}
      src={src}
      alt={name}
      width={size}
      height={size}
      draggable={false}
    />
  );
}
