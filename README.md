# Zion

Zion is a Phaser 3 action-adventure starter about a player-chosen hero restoring light across five parallel worlds. This repository contains a playable, asset-free prototype and a Cloudflare Worker API scaffold.

## Project layout

```text
.
├── CLAUDE.md                 # Persistent project/design and development brief
├── client/                   # Vite + TypeScript + Phaser 3 game
│   ├── public/
│   └── src/
│       ├── game/              # World definitions, settings, local progress
│       └── scenes/            # Boot, Preloader, MainMenu, Game, UIScene
└── worker/                   # Hono API on Cloudflare Workers
    └── src/index.ts
```

## Requirements

- Node.js 20 or newer and npm
- No API keys are needed to run the prototype

## Run locally

In one terminal:

```bash
cd client
npm install
npm run dev
```

In another terminal, to run the API locally:

```bash
cd worker
npm install
npm run dev
```

The Worker runs locally through Wrangler (usually at `http://localhost:8787`). Check `GET /api/health`, or submit a score with:

```bash
curl -X POST http://localhost:8787/api/score \
  -H 'Content-Type: application/json' \
  -d '{"playerName":"Nova","score":100,"worldId":0}'
```

The score endpoint validates requests but deliberately does not persist data yet. Supabase integration is a future step; never put service keys in client code or commit secrets.

## Prototype controls

- Enter a character name on the title screen (saved locally in this browser).
- Use **Left/Right** to select an unlocked world.
- Move with **WASD** or **arrow keys**; attack with **Space**; return to the menu with **Esc**.
- Each world has five regular encounters and a guardian encounter. Clear the guardian to restore that world's shard and unlock the next one. Local progress is stored in browser `localStorage`.

The current visuals use geometric placeholders so the scene flow and progression can be tested without licensed assets. This is a foundation, not a finished production game: art/audio, full customization, balanced combat, save syncing, accessibility and automated tests remain to be built.

## Build and deploy

```bash
cd client && npm run build
cd ../worker && npm run typecheck
```

Deploy the client by connecting `client` to Cloudflare Pages with build command `npm run build` and output directory `dist`. Deploy the API from `worker` with `npm run deploy`. Set the Pages production domain as the API's allowed CORS origin before production. Add Supabase configuration as Cloudflare Worker secrets/bindings only after implementing persistence. See `CLAUDE.md` for the fuller product brief and development guidelines.
