import { useEffect, useState } from "react";

const API = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg";

const toCodepoints = (emoji: string): string => {
  const raw = emoji.includes("\u200d") ? emoji : emoji.replace(/\ufe0f/g, "");
  return [...raw].map((c) => c.codePointAt(0)!.toString(16)).join("-");
};

const cache = new Map<string, Promise<string>>();

const fetchEmblem = (emoji: string): Promise<string> => {
  let hit = cache.get(emoji);
  if (!hit) {
    hit = fetch(`${API}/${toCodepoints(emoji)}.svg`)
      .then((res) => {
        if (!res.ok) throw new Error(`Emblem ${res.status}`);
        return res.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
    hit.catch(() => cache.delete(emoji));
    cache.set(emoji, hit);
  }
  return hit;
};

export type EmblemState = { src: string | null; loading: boolean; error: boolean };

export function useEmblem(emoji: string): EmblemState {
  const [state, setState] = useState<EmblemState>({ src: null, loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    setState({ src: null, loading: true, error: false });
    fetchEmblem(emoji)
      .then((src) => !cancelled && setState({ src, loading: false, error: false }))
      .catch(() => !cancelled && setState({ src: null, loading: false, error: true }));
    return () => {
      cancelled = true;
    };
  }, [emoji]);

  return state;
}
