import { useCallback, useEffect, useRef, useState } from "react";
import { items } from "@/data/recipes";
import { playDragSound, playPlaceSound } from "@/lib/craft/sounds";
import { useCraftStore, type BoardNode } from "@/lib/craft/store";
import { ItemChip } from "./ItemChip";
import { Stars } from "./Stars";

type DragKind = "pan" | "node" | "spawn";

type Drag =
  | {
      kind: "pan";
      lastX: number;
      lastY: number;
    }
  | {
      kind: "node";
      uid: string;
      grabX: number;
      grabY: number;
      startX: number;
      startY: number;
      moved: boolean;
    }
  | {
      kind: "spawn";
      itemId: string;
      x: number;
      y: number;
      startX: number;
      startY: number;
      moved: boolean;
    };

const HIT = 58;

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

export function Board({
  inventoryEl,
  spawnRequest,
  registerSpawnDrag,
  onSpawnMoved,
}: {
  inventoryEl: HTMLElement | null;
  spawnRequest: { itemId: string; nonce: number } | null;
  registerSpawnDrag: (fn: (itemId: string, clientX: number, clientY: number) => void) => void;
  onSpawnMoved: () => void;
}) {
  const nodes = useCraftStore((s) => s.nodes);
  const addNode = useCraftStore((s) => s.addNode);
  const moveNode = useCraftStore((s) => s.moveNode);
  const removeNode = useCraftStore((s) => s.removeNode);
  const combineNodes = useCraftStore((s) => s.combineNodes);
  const persist = useCraftStore((s) => s.persist);

  const rootRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const viewRef = useRef({ pan: { x: 0, y: 0 }, zoom: 1, nodes: [] as BoardNode[] });
  viewRef.current = { pan, zoom, nodes };

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const root = rootRef.current;
    if (!root) return { x: 0, y: 0 };
    const rect = root.getBoundingClientRect();
    const { pan, zoom } = viewRef.current;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, []);

  const overInventory = useCallback(
    (clientX: number, clientY: number) => {
      if (!inventoryEl) return false;
      const r = inventoryEl.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    },
    [inventoryEl],
  );

  const hitNode = useCallback((worldX: number, worldY: number, except?: string) => {
    const { nodes, zoom } = viewRef.current;
    let best: BoardNode | null = null;
    let bestD = HIT / zoom;
    for (const n of nodes) {
      if (n.uid === except) continue;
      const d = dist(worldX, worldY, n.x, n.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }, []);

  useEffect(() => {
    if (!spawnRequest) return;
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const { pan, zoom } = viewRef.current;
    const jitter = () => (Math.random() - 0.5) * 90;
    addNode(
      spawnRequest.itemId,
      (rect.width / 2 - pan.x) / zoom + jitter(),
      (rect.height / 2 - pan.y) / zoom + jitter(),
    );
    playPlaceSound();
  }, [spawnRequest, addNode]);

  const startSpawnDrag = useCallback((itemId: string, clientX: number, clientY: number) => {
    if (!(itemId in items)) return;
    playDragSound();
    setDrag({
      kind: "spawn",
      itemId,
      x: clientX,
      y: clientY,
      startX: clientX,
      startY: clientY,
      moved: false,
    });
  }, []);

  useEffect(() => {
    registerSpawnDrag(startSpawnDrag);
  }, [registerSpawnDrag, startSpawnDrag]);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "pan") {
        setPan((p) => ({ x: p.x + (e.clientX - d.lastX), y: p.y + (e.clientY - d.lastY) }));
        setDrag({ ...d, lastX: e.clientX, lastY: e.clientY });
        return;
      }
      const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 8;
      if (d.kind === "node") {
        const w = toWorld(e.clientX, e.clientY);
        moveNode(d.uid, w.x - d.grabX, w.y - d.grabY);
        setDrag({ ...d, moved });
        return;
      }
      setDrag({ ...d, x: e.clientX, y: e.clientY, moved });
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      if (d.kind === "pan") return;
      const world = toWorld(e.clientX, e.clientY);

      if (d.kind === "node") {
        persist();
        if (overInventory(e.clientX, e.clientY)) {
          removeNode(d.uid);
          return;
        }
        const other = hitNode(world.x, world.y, d.uid);
        if (other) combineNodes(d.uid, other.uid);
        return;
      }

      if (!d.moved) return;
      onSpawnMoved();
      if (overInventory(e.clientX, e.clientY)) return;
      const other = hitNode(world.x, world.y);
      const uid = addNode(d.itemId, world.x, world.y);
      playPlaceSound();
      if (uid && other) combineNodes(uid, other.uid);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, addNode, combineNodes, hitNode, moveNode, onSpawnMoved, overInventory, persist, removeNode, toWorld]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = root.getBoundingClientRect();
      const { pan, zoom } = viewRef.current;
      const next = Math.min(2.4, Math.max(0.4, zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const wx = (cx - pan.x) / zoom;
      const wy = (cy - pan.y) / zoom;
      setZoom(next);
      setPan({ x: cx - wx * next, y: cy - wy * next });
    };
    root.addEventListener("wheel", onWheelNative, { passive: false });
    return () => root.removeEventListener("wheel", onWheelNative);
  }, []);

  const onBoardDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-node]")) return;
    setDrag({ kind: "pan", lastX: e.clientX, lastY: e.clientY });
  };

  const onNodeDown = (e: React.PointerEvent, node: BoardNode) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    playDragSound();
    const w = toWorld(e.clientX, e.clientY);
    setDrag({
      kind: "node",
      uid: node.uid,
      grabX: w.x - node.x,
      grabY: w.y - node.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    });
  };

  const lines: { a: BoardNode; b: BoardNode }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      lines.push({ a: nodes[i], b: nodes[j] });
    }
  }

  const draggingNode = drag?.kind === "node" ? drag.uid : null;

  return (
    <div
      ref={rootRef}
      className="relative min-h-0 min-w-0 touch-none overflow-hidden bg-ink"
      onPointerDown={onBoardDown}
    >
      <Stars />
      <div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <svg
          className="pointer-events-none absolute top-0 left-0 overflow-visible"
          width="1"
          height="1"
        >
          {lines.map(({ a, b }) => (
            <line
              key={`${a.uid}-${b.uid}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="white"
              strokeWidth={1.15}
              strokeOpacity={nodes.length > 12 ? 0.22 : 0.42}
            />
          ))}
        </svg>
        {nodes.map((n) => (
          <div
            key={n.uid}
            data-node={n.uid}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
            style={{ left: n.x, top: n.y, zIndex: draggingNode === n.uid ? 20 : 2 }}
            onPointerDown={(e) => onNodeDown(e, n)}
          >
            <ItemChip id={n.itemId} size="md" className="shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
          </div>
        ))}
      </div>

      {nodes.length === 0 && !drag && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
          <p className="max-w-sm text-center font-display text-xl leading-snug text-fg/80 text-balance">
            Drag discoveries onto the board. White lines bind every piece. Drop two together to craft.
          </p>
        </div>
      )}

      {drag?.kind === "spawn" && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-90"
          style={{ left: drag.x, top: drag.y }}
        >
          <ItemChip id={drag.itemId} size="md" />
        </div>
      )}
    </div>
  );
}

export type BoardHandle = { startSpawnDrag: (id: string, x: number, y: number) => void };

