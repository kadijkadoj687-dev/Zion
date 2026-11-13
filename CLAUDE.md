# Zion — persistent project brief

This file is the durable product and engineering reference for contributors and coding agents. Read it before making significant changes.

## Product vision

- **Title:** Zion
- **Audience:** ages 10–18; keep the experience welcoming, age-appropriate, readable, and non-graphic.
- **Genre:** 2D multi-world action-adventure built with Phaser 3.
- **Hero:** the player chooses a character name at the start; never hard-code a canonical player name.
- **Story:** On an ordinary night, the player discovers a strange glowing device. Touching it sends them into the Network of Worlds: parallel dimensions protected by an ancient force called the Light of Zion. The dark force known as the Leaking Shadow corrupts these worlds and turns inhabitants into confused, hostile Dim Ones. The hero restores a Light Shard in each world by clearing its encounters and defeating its guardian, becoming brighter and stronger along the way.

## World plan

Each world has five regular combat stages and one final guardian stage. Award rewards/upgrades after every stage. Defeating a guardian restores that world's shard, unlocks the next world, and grants a major visual/cosmetic evolution.

| Order | World | Guardian | Difficulty / theme |
| --- | --- | --- | --- |
| 1 | Glowing Forest | Root Guardian | Easy; first steps |
| 2 | Crystal City | Mirror Queen | Reflections and crystal |
| 3 | Floating Seas | Storm Whale | Airborne oceans and storms |
| 4 | Cold Volcanoes | Frost Giant | Frozen volcanic landscape |
| 5 | Broken Sky | Zion Shadow | Finale |

## Character and interaction

- Begin with an ordinary, simple appearance; evolve outfit, hairstyle, features, and light effects after each world.
- Let players change weapon, outfit, hair, and selected accessories at any time.
- The hero should speak directly to the player, encourage them, react to performance, and make gentle jokes. Keep language kind and age-appropriate; do not shame players for failure.
- Keep character name and customization data player-controlled and validate any submitted data.

## Technical architecture

### `client/`
- Vite + TypeScript + Phaser 3. Use small, focused scenes and keep content data-driven.
- Scene flow: `Boot` → `Preloader` → `MainMenu` → `Game`, with a separate `UIScene` HUD.
- Current files include shared configuration, world definitions, and browser-local progression. The gameplay is an asset-free geometric prototype; replace placeholders with original/licensed assets as content is developed.
- Keep the client buildable with `npm run build`. Avoid embedding secrets in client files or build-time variables.

### `worker/`
- Cloudflare Workers + Hono + Wrangler.
- `POST /api/score` is the initial score API. It validates input and currently acknowledges but does not persist scores. `GET /api/health` is a health check.
- Add server-side validation, abuse controls, and appropriate error handling before production. Restrict CORS to the deployed Pages origin in production.

### Data and deployment
- Supabase is the planned database. Credentials will be provided later; do not invent, commit, or expose real keys. Keep secret placeholders in Worker configuration/documentation only and store real values using Cloudflare secrets/bindings.
- Deploy the frontend with Cloudflare Pages (`client` root, `npm run build`, `dist` output) and the API as a Cloudflare Worker (`worker` root, Wrangler).
- Local development should not require Supabase credentials. Browser local storage is prototype-only; plan for server-backed save/progression once the schema and secrets exist.

## Development guidelines

1. Prefer typed, data-driven systems over world-specific hard-coded branching.
2. Keep scenes focused; separate presentation, progression, content definitions, and API validation.
3. Use original or properly licensed content; document asset sources and licenses.
4. Design for keyboard and touch/controller expansion, readable UI, and responsive scaling.
5. Never commit credentials. Validate and bound user input on both client and server.
6. Update `README.md` and this file when scripts, setup, architecture, or product requirements change.
7. Run the client build and Worker typecheck after changes when dependencies are available.

## Current implementation / next steps

Implemented: Vite + TS + Phaser setup, initial scene flow, player-chosen name form, five-world data, basic keyboard movement/attack prototype, five stages plus a guardian per world, browser-local unlock progression, Hono Worker with validated `/api/score` and `/api/health`, Wrangler config, and documentation.

Next: add tests; create original art/audio and narrative; implement robust combat, stage rewards and upgrades; build the weapon/outfit/hair/accessory customization UI and persistent evolution visuals; improve mobile input and accessibility; add Supabase schema and server-side persistence once credentials are available; lock down CORS and add production abuse protections.
