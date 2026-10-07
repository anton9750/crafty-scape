/**
 * Audio configuration.
 *
 * Drop your own files into `public/assets/...` and keep the names below
 * (or change the names here). Paths are relative to `public/`.
 *
 * If a file is missing, the game falls back to built-in synthesized sounds,
 * so nothing breaks while you are still collecting audio.
 */

/** Looping background music (mp3 / ogg / m4a all work; mp3 is safest on iOS). */
export const MUSIC_FILE = "assets/music/background.mp3";
export const MUSIC_VOLUME = 0.35;

/** 10 sounds played in random order whenever you start dragging an item. */
export const DRAG_SOUND_FILES: string[] = [
  "assets/sounds/drag-01.mp3",
  "assets/sounds/drag-02.mp3",
  "assets/sounds/drag-03.mp3",
  "assets/sounds/drag-04.mp3",
  "assets/sounds/drag-05.mp3",
  "assets/sounds/drag-06.mp3",
  "assets/sounds/drag-07.mp3",
  "assets/sounds/drag-08.mp3",
  "assets/sounds/drag-09.mp3",
  "assets/sounds/drag-10.mp3",
];
export const DRAG_VOLUME = 0.6;
