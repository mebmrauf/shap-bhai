# Shap Bhai (সাপ ভাই)

A solo 3D Snake adventure through four Bangladesh story worlds, in Bangla by default with an English option. Every world has a different encounter and a three-chapter story; every snake has a gameplay trait. Local best scores, matching ghosts, share cards and offline play are included.

## Run

Node.js 20.12 or newer:

```sh
npm install
npm start
```

Open http://localhost:8124. Run `npm run build:static` to validate and build the deployable game. Automated test sources are not included.

## Play

- **Classic:** complete your world’s story by making 20 regular food deliveries, with chapters at 5 and 12. Food grows the snake; walls, your body and active predators can end the run. Every 5 bites increases speed.
- **Chaos:** the same world adventure with more frequent encounters and shorter warnings.
- **Ghost:** race your saved Classic best for the same world, snake and speed. The ghost replays independently and cannot collide with you. With no saved ghost, finishing a run records the first one.

Arrow keys / WASD steer. Escape or P pauses. B, or the "আম্মু আসছে!" button, pauses and shows a fake study page. Touch buttons and board swipes are available.

Four boards (Dhaka street, Old Dhaka rooftop, Cox's Bazar, Sundarbans) and five snakes are free from the start. They change how you play. Dhaka has moving buses and tea rewards; rooftop pigeons steal sweets; beach tides hold your direction and leave pearls; Sundarbans tigers stalk, warn and pounce. See [the storybook](docs/ADVENTURES.md) for all stories and traits. Flat view is available and takes over if WebGL fails. The interface follows the device's light or dark setting.

## Rules and local saves

The input buffer accepts two turns and applies one each movement step. Reverse turns and repeat-key floods are rejected. Pausing freezes the game clock and clears queued simulation input, then resumes with a short countdown. A non-growing tail vacates on that tick and may be entered; other body cells stay solid.

Local scores and ghosts use the existing `snake-arena.v2` storage namespace so saved progress is preserved. Recordings are versioned and replay-verified before use. A ghost shares the starting seed but runs its own simulation: different routes can change later food placement. Aborted runs never replace recordings. Saves remain on this browser and device. Adventure scores and ghosts are separated by world, snake and speed. Version 3 recordings store world and trait settings; the engine still verifies version 2 recordings. Earlier saves remain untouched under their old keys but are not mixed into adventure records.

## Voice

Reactions answer the food, bite milestones, close calls, Chaos events, and how the run ended. Pure selectors in `web/js/audio.js` (`roastBank`, `biteBank`, `startBank`) choose clips and matching captions. Bangla and English clips are local and decoded before playback.

To add a line, add its script to the matching credits JSON and phrase map, list it in `web/sw.js`, and run the appropriate generator (requires `edge-tts` and `ffmpeg`):

```sh
node scripts/generate-voices.mjs
node scripts/generate-voices-en.mjs
```

Generators only render missing files; delete a clip first when changing its wording. Voices are AI-generated. See `web/audio/credits.json` and `credits-en.json` for provenance.

## Offline and updates

The Node server stamps `sw.js` with a hash of the game files. The service worker caches the core game together, then downloads optional voice/music files. Missing audio needs a later connection. Installed apps check for updates on return, reconnection, and every 15 minutes while visible. A pending update reloads at the next safe point.

For static hosting, run `npm run build:static` and publish `dist/`. The GitHub Pages workflow does this automatically and stamps the same content hash into the worker. Static hosts do not provide the optional API routes.

## Project map

- `web/js/adventures.js` — four bilingual storybooks, five traits and original adventure voice scripts.
- `web/js/engine.js` — solo simulation, world encounters, traits, queued input, recordings and replay verification. No DOM, timers, or network calls.
- `web/js/app.js` — menus, game lifecycle, controls, local saves and results.
- `web/js/render3d.js` / `world3d.js` — WebGL renderer, models, scenery, camera and adaptive quality.
- `web/js/render.js` — flat renderer and WebGL fallback.
- `web/js/audio.js` — effects, music, bilingual reactions and captions.
- `web/js/i18n.js` — Bangla and English interface text.
- `web/js/cards.js` / `social.js` — four solo share-card designs and sharing/download helpers.
- `web/js/update.js` / `web/sw.js` — update checks and offline caching.
- `scripts/server.mjs` — static hosting and optional solo score APIs.
- `scripts/leaderboard.mjs` / `name-filter.mjs` — legacy profile, daily-score and shared-ghost services; these are not connected to the current game UI or default server startup.

Arcade combo rules and daily-seed helpers remain internal engine capabilities. The current UI exposes only Classic, Chaos and Ghost. Daily leaderboards, profiles, shared ghost links, and queued offline score posting are not current player features. Setting database environment variables alone does not enable them.

## Hosting

The server defaults to `127.0.0.1:8124`. `HOST` and `PORT` configure binding. Use HTTPS on a public host for service-worker installation. Runtime game files and audio are local; no third-party model or image downloads are required. `render.yaml` provides a Node hosting configuration.

See `docs/VERIFICATION.md` for current checks and coverage limits.

## Pungi recording credit

The local prototype loop uses the user-supplied [“Nagin Been music | sapera” reference, uploaded by Rajhans Raju](https://www.youtube.com/shorts/Gs7qKgMGgT4). Pitch and tempo are preserved; the loop is crossfaded and normalized. The source does not specify a reuse licence, and redistribution rights are unverified. Obtain permission or use cleared audio before public distribution. This replacement is not covered by the previous recording’s CC BY-SA licence or the code’s MIT licence. Provenance is in `web/audio/credits.json` and `web/audio/PUNGI-LICENSE.md`.

## Developer

Developed by [bmrauf.me](https://bmrauf.me).
