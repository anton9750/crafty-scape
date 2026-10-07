# Crafty

```bash
npm install
npm run dev     # http://localhost:5173
```

`npm run build` makes a production build in `dist/`. `npm run typecheck` runs TypeScript checks.

## Deploy to GitHub Pages

1. Push this project to a GitHub repo on the `main` branch.
2. In the repo go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` and publishes to
   `https://<user>.github.io/<repo>/`.

## Audio

Put your own files in `public/assets/` (see `public/assets/README.md`):

- `music/background.mp3` – looping background music (starts on first tap/click, works on mobile and desktop, pauses when the tab is hidden, mute button in the header)
- `sounds/drag-01.mp3` … `drag-10.mp3` – 10 sounds played in random order when you drag an item

Names and volumes are set in `src/config/audio.ts`. Missing files fall back to built-in synthesized sounds.
