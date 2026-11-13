# Zion

Zion is a Phaser 3 action-adventure about a player-chosen hero restoring light across five parallel worlds.

**Play Zion:** [https://zion-1y9.pages.dev](https://zion-1y9.pages.dev)

## Project layout

```text
.
├── CLAUDE.md                 # Persistent project/design and development brief
├── client/                   # Vite + TypeScript + Phaser 3 game
│   ├── public/
│   └── src/
│       ├── game/              # World definitions, settings, local progress
│       └── scenes/            # Boot, Preloader, MainMenu, Game, UIScene
├── worker/                    # Hono API on Cloudflare Workers
│   └── src/index.ts
└── supabase/schema.sql         # Player save table and row-level security
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

The score endpoint validates requests but deliberately does not persist data. Game progression is stored in Supabase directly through the public client with RLS; never put service keys in client code or commit secrets.

## Prototype controls

- Enter a character name on the title screen (saved locally in this browser).
- Choose a weapon, outfit, hairstyle, and accessory in the character studio.
- Use **Left/Right** to select an unlocked world.
- Move with **WASD** or **arrow keys**; attack with **Space**, dodge with **Shift**, and use a charged light burst with **Q**.
- Build attack combos, watch enemy warning glows, and dodge during the wind-up. Hits and perfect dodges charge the burst.
- Each world has five regular encounters and a guardian encounter. Clear the guardian to restore that world's shard and unlock the next one. Saves include the chosen name, cosmetics, unlocked world, and best score.

The client includes original vector illustrations and animated, world-tinted arena effects. Browser `localStorage` remains the offline save; Supabase sync is enabled by configuring the public project URL and anonymous key.

## Supabase cloud saves

1. In Supabase, enable **Anonymous Sign-Ins** under Authentication providers.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor. It creates the `player_saves` table with per-player row-level security and validation checks.
3. Copy [`client/.env.example`](./client/.env.example) to `client/.env.local`, then fill in the project's URL and public anon key. The anon key is intended for browser use and is restricted by the table's RLS policies; never put a `service_role` key in the client.
4. Restart the Vite dev server. The menu shows whether cloud sync is active; if it is unavailable, the local save is retained.

Anonymous saves are linked to the browser's Supabase auth session. They are not yet transferable between browsers/devices; account linking is a future feature.

## Build and deploy

```bash
cd client && npm run build
cd ../worker && npm run typecheck
```

Deploy the client by connecting `client` to Cloudflare Pages with build command `npm run build` and output directory `dist`; configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Pages build variables. Deploy the API from `worker` with `npm run deploy`. Set the Pages production domain as the API's allowed CORS origin before production. See `CLAUDE.md` for the fuller product brief and development guidelines.
