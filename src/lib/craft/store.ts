import { create } from "zustand";
import { items, lookupRecipe, starters } from "@/data/recipes";
import { playFailSound, playTransformSound } from "./sounds";

export type BoardNode = {
  uid: string;
  itemId: string;
  x: number;
  y: number;
};

export type Toast = {
  id: number;
  kind: "new" | "known" | "fail";
  itemId?: string;
  message: string;
};

export type Theme = "dark" | "light";

type SaveV2 = {
  version: 2;
  discovered: string[];
  nodes: BoardNode[];
  theme: Theme;
};

const KEY = "crafty:save";
const LEGACY_KEY = "infinite-craft:discovered";
const SAVE_VERSION = 2 as const;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function validIds(list: unknown): string[] {
  if (!Array.isArray(list)) return [...starters];
  const next = list.filter((id): id is string => typeof id === "string" && id in items);
  for (const s of starters) if (!next.includes(s)) next.unshift(s);
  return next;
}

function loadSave(): Pick<CraftState, "discovered" | "nodes" | "theme"> {
  const fallback = {
    discovered: [...starters] as string[],
    nodes: [] as BoardNode[],
    theme: "dark" as Theme,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveV2>;
      return {
        discovered: validIds(parsed.discovered),
        nodes: Array.isArray(parsed.nodes)
          ? parsed.nodes.filter(
              (n): n is BoardNode =>
                !!n &&
                typeof n.uid === "string" &&
                typeof n.itemId === "string" &&
                n.itemId in items &&
                typeof n.x === "number" &&
                typeof n.y === "number",
            )
          : [],
        theme: parsed.theme === "light" ? "light" : "dark",
      };
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { ...fallback, discovered: validIds(JSON.parse(legacy)) };
  } catch {
    /* ignore */
  }
  return fallback;
}

type CraftState = {
  hydrated: boolean;
  discovered: string[];
  nodes: BoardNode[];
  theme: Theme;
  toast: Toast | null;
  hydrate: () => void;
  persist: () => void;
  setTheme: (theme: Theme) => void;
  addNode: (itemId: string, x: number, y: number) => string | null;
  moveNode: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
  clearBoard: () => void;
  resetDiscoveries: () => void;
  combineNodes: (aUid: string, bUid: string) => boolean;
  discover: (itemId: string) => boolean;
  showToast: (toast: Omit<Toast, "id">) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useCraftStore = create<CraftState>((set, get) => ({
  hydrated: false,
  discovered: [...starters],
  nodes: [],
  theme: "dark",
  toast: null,

  hydrate: () => {
    if (typeof window === "undefined") return;
    const loaded = loadSave();
    set({ ...loaded, hydrated: true });
  },

  persist: () => {
    const { discovered, nodes, theme } = get();
    try {
      const payload: SaveV2 = { version: SAVE_VERSION, discovered, nodes, theme };
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  },

  setTheme: (theme) => {
    set({ theme });
    get().persist();
  },

  addNode: (itemId, x, y) => {
    if (!(itemId in items)) return null;
    const node: BoardNode = { uid: uid(), itemId, x, y };
    set((s) => ({ nodes: [...s.nodes, node] }));
    get().persist();
    return node.uid;
  },

  moveNode: (id, x, y) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.uid === id ? { ...n, x, y } : n)),
    }));
  },

  removeNode: (id) => {
    set((s) => ({ nodes: s.nodes.filter((n) => n.uid !== id) }));
    get().persist();
  },

  clearBoard: () => {
    set({ nodes: [] });
    get().persist();
  },

  resetDiscoveries: () => {
    set({ discovered: [...starters], nodes: [] });
    get().persist();
  },

  discover: (itemId) => {
    if (!(itemId in items)) return false;
    if (get().discovered.includes(itemId)) return false;
    set((s) => ({ discovered: [...s.discovered, itemId] }));
    get().persist();
    return true;
  },

  showToast: (toast) => {
    if (toastTimer) clearTimeout(toastTimer);
    const id = Date.now();
    set({ toast: { ...toast, id } });
    toastTimer = setTimeout(() => {
      set((s) => (s.toast?.id === id ? { toast: null } : s));
    }, 1600);
  },

  combineNodes: (aUid, bUid) => {
    if (aUid === bUid) return false;
    const { nodes, discover, showToast } = get();
    const a = nodes.find((n) => n.uid === aUid);
    const b = nodes.find((n) => n.uid === bUid);
    if (!a || !b) return false;
    const recipe = lookupRecipe(a.itemId, b.itemId);
    if (!recipe || !(recipe.result in items)) {
      playFailSound();
      showToast({ kind: "fail", message: "Nothing happens" });
      return false;
    }
    const isNew = discover(recipe.result);
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const node: BoardNode = { uid: uid(), itemId: recipe.result, x, y };
    set((s) => ({
      nodes: [...s.nodes.filter((n) => n.uid !== aUid && n.uid !== bUid), node],
    }));
    get().persist();
    playTransformSound();
    showToast({
      kind: isNew ? "new" : "known",
      itemId: recipe.result,
      message: isNew ? "New discovery" : items[recipe.result].name,
    });
    return true;
  },
}));
