import { useEffect, useRef, useState } from "react";
import { Eraser, Moon, RotateCcw, Sun, Volume2, VolumeX } from "lucide-react";
import { items, totalItems } from "@/data/recipes";
import { isMusicEnabled, setMusicEnabled, startMusic, subscribeMusic } from "@/lib/craft/music";
import { unlockAudio } from "@/lib/craft/sounds";
import { useCraftStore } from "@/lib/craft/store";
import { Board } from "./Board";
import { Inventory } from "./Inventory";
import { ItemChip } from "./ItemChip";

export function CraftApp() {
  const hydrate = useCraftStore((s) => s.hydrate);
  const discovered = useCraftStore((s) => s.discovered);
  const theme = useCraftStore((s) => s.theme);
  const setTheme = useCraftStore((s) => s.setTheme);
  const toast = useCraftStore((s) => s.toast);
  const clearBoard = useCraftStore((s) => s.clearBoard);
  const resetDiscoveries = useCraftStore((s) => s.resetDiscoveries);
  const [invEl, setInvEl] = useState<HTMLElement | null>(null);
  const [spawn, setSpawn] = useState<{ itemId: string; nonce: number } | null>(null);
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const skipClick = useRef(false);
  const spawnDrag = useRef<(id: string, x: number, y: number) => void>(() => {});

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => subscribeMusic(() => setMusicOn(isMusicEnabled())), []);

  useEffect(() => {
    // Browsers (especially iOS/Android) only allow audio after a user gesture.
    const unlock = () => {
      unlockAudio();
      startMusic();
    };
    const events = ["pointerdown", "touchend", "click", "keydown"] as const;
    for (const ev of events) window.addEventListener(ev, unlock, { passive: true });
    const onVis = () => {
      if (document.visibilityState === "visible") unlockAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      for (const ev of events) window.removeEventListener(ev, unlock);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const api = {
      totalItems,
      getDiscovered: () => useCraftStore.getState().discovered,
      getNodes: () => useCraftStore.getState().nodes,
      spawn: (id: string, x = 240, y = 200) => useCraftStore.getState().addNode(id, x, y),
      combine: (a: string, b: string) => useCraftStore.getState().combineNodes(a, b),
    };
    (window as Window & { __craftQA?: typeof api }).__craftQA = api;
    return () => {
      delete (window as Window & { __craftQA?: typeof api }).__craftQA;
    };
  }, []);

  const startSpawn = (id: string, x: number, y: number) => {
    unlockAudio();
    skipClick.current = false;
    spawnDrag.current(id, x, y);
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-x-hidden bg-ink text-fg">
      <header className="relative z-10 flex min-w-0 items-center justify-between gap-2 border-b border-line bg-ink/85 px-3 py-3 backdrop-blur-sm sm:px-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl leading-none tracking-tight sm:text-2xl md:text-3xl">Crafty</h1>
          <p className="mt-1 hidden text-xs text-muted sm:block">
            Constellation board · {totalItems} craftables
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden tabular-nums text-xs text-muted sm:inline">
            {discovered.length}/{totalItems}
          </span>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs font-medium text-fg hover:border-accent sm:px-3"
            onClick={() => clearBoard()}
          >
            <Eraser className="size-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-2.5 text-xs font-medium text-fg hover:border-accent sm:px-3"
            onClick={() => {
              if (window.confirm("Reset all discoveries?")) resetDiscoveries();
            }}
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line text-fg hover:border-accent"
            onClick={() => setMusicEnabled(!musicOn)}
            aria-label={musicOn ? "Mute music" : "Play music"}
            aria-pressed={musicOn}
          >
            {musicOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-full border border-line text-fg hover:border-accent"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light chrome" : "Switch to dark chrome"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_42%] md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-1">
        <Board
          inventoryEl={invEl}
          spawnRequest={spawn}
          registerSpawnDrag={(fn) => {
            spawnDrag.current = fn;
          }}
          onSpawnMoved={() => {
            skipClick.current = true;
          }}
        />
        <Inventory
          discovered={discovered}
          inventoryRef={(el) => {
            setInvEl(el);
          }}
          onDragBegin={startSpawn}
          onPick={(id) => {
            if (skipClick.current) {
              skipClick.current = false;
              return;
            }
            setSpawn({ itemId: id, nonce: Date.now() });
          }}
        />
      </div>

      {toast && (
        <div className="pointer-events-none absolute top-20 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-line bg-panel px-4 py-3 text-center shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
          <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
            {toast.message}
          </p>
          {toast.itemId && items[toast.itemId] && (
            <div className="mt-2 flex justify-center">
              <ItemChip id={toast.itemId} size="md" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
