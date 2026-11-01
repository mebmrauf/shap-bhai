# Dhaka in 3D

3D Snake through the streets of Bangladesh, in Bangla by default with an English option. Solo, computer, local two-player and online rooms all share one deterministic simulation. The whole game works offline after the first visit.

## Run

Node.js 20.12 or newer:

```sh
npm install
npm start
```

Open http://localhost:8124. Run `npm test` for the rule, replay, room, leaderboard, language and audio checks. Without a database everything still works except leaderboards and ghost links.

## Play

- **Today's challenge:** the same seed for everyone, changing at midnight Bangladesh time. Your best verified run goes on the leaderboard.
- **Classic:** food grows the snake; walls and your body end the run. Every 5 bites slightly increases speed.
- **Chaos:** load shedding, traffic jams, floods and wedding biryani arrive in turns. Traffic and floods are warned before they land. Chaos scores stay on the device.
- **Arcade:** eat again within 8 seconds to score 1, 2, then 3 points.
- **Ghost:** race your saved best, or a friend's run from a ghost link.
- **1 vs 1:** computer, shared keyboard, or an online room. First to 3 round wins.

Arrow keys / WASD steer. Escape or P pauses local games. B, or the "আম্মু আসছে!" button, pauses and shows a fake study page. Touch buttons and board swipes are available.

Boards (Dhaka street, Old Dhaka rooftop, Cox's Bazar, Sundarbans) and five snakes, all free from the start, are cosmetic and never touch the rules. The interface follows the device's light or dark setting.

## Voice

Every line answers something that just happened: the food on the board, a bite milestone, a close call, a chaos event starting or ending, and how the run or round was lost. Selection lives in small pure functions in `web/js/audio.js` (`roastBank`, `duelBank`, `biteBank`, `startBank`). Clips are decoded ahead of time so speech starts at once and never buffers.

To add a line, add it to `web/audio/credits.json` and `phrases` in `audio.js`, list it in `web/sw.js`, and run the generator (needs `edge-tts` and `ffmpeg`). It only renders clips that are missing, so delete a clip first when you change its wording:

```sh
node scripts/generate-voices.mjs
```

Clips use `bn-BD-PradeepNeural` and, for `roast*` and `chaos*` lines, `bn-BD-NabanitaNeural`. They are AI-generated. See `web/audio/credits.json`.

## Offline and weak connections

- The service worker caches all game files by a content hash the server stamps into `sw.js`, so a player always runs one complete version.
- Installed apps update themselves. `web/js/update.js` checks for a new version whenever the app returns to the foreground, comes back online, and every 15 minutes while open, then reloads at the next safe moment. A game in progress is never interrupted. Just deploy; there is nothing to bump.
- Daily runs finished offline are stored and posted when the connection returns.
- Online rooms send a turn as soon as it is pressed, compress snapshots, and draw through `SmoothView` in `web/js/network.js`: a steady clock, up to six ticks of display-only prediction, and slides instead of jumps when a guess was wrong. The server still decides every move, so a turn on a very slow link lands late.
- Rooms use plain HTTPS through this server. No WebRTC, so no STUN or TURN service is needed.

## Leaderboards

Set `DATABASE_URL_POOLED` (or `DATABASE_URL`) and `IP_HASH_SECRET`. The server creates its `snake_*` tables on first use. No sign-in: a random device token, stored only as a hash, owns a player card. Every submitted run is replayed on the server, so a forged score is rejected, though a bot playing real moves would still count.

Public names and crew codes pass through `scripts/name-filter.mjs` in English, Banglish and Bangla. It sees through repeated letters, spacing, symbols and look-alike characters, and blocks website addresses, phone numbers and staff-sounding names. No word list catches everything, so to remove a player by hand:

```sh
node scripts/remove-player.mjs "Exact Name"
node scripts/remove-player.mjs "Exact Name" --delete
```

The first command only shows who matches. To block a new word, add it to the filter. Older names are checked again whenever they are shown.

## Rules that matter

Both snakes choose their next cell before any collision is resolved. Head-on crashes, swapped heads, and simultaneous deaths are draws. A non-growing tail vacates on that tick and may be entered by either player. All other body cells remain solid. Hitting the opponent's body kills the attacker. An apple grows only a surviving snake.

Duel starts and apple pairs are rotationally symmetric. A new pair spawns after both apples are eaten, on cells free of snakes. Rounds last 90 seconds of simulation time; if both players survive, more apples wins, with equal scores drawing. The computer can inspect current positions but cannot see the human's queued turn.

The input buffer accepts two turns and applies one each movement step. Reverse turns and repeat-key floods are rejected. Pausing clears queued turns, freezes the game clock, and uses a short resume countdown.

## Project map

- `web/js/engine.js` — deterministic rules, queued input, AI, and replay verification. No DOM, timers, rendering, or network calls.
- `web/js/app.js` — menu, game lifecycle, input, local saves, and presentation.
- `web/js/render3d.js` — lighting, shadows, camera, and the snake's smooth body. It steps down automatically on slow devices: shadows, then scenery, then resolution.
- `web/js/world3d.js` — procedural models and textures: food, vehicles, buildings and the four worlds. There are no image or model downloads.
- `web/vendor/` — a Three.js bundle of only the classes the renderer uses. Rename its folder whenever the bundle changes, because that path is cached for good.
- `web/js/render.js` — the 2D fallback and flat view, used when WebGL is unavailable.
- `web/js/i18n.js` — Bangla and English text, keyed by the English.
- `web/js/social.js` — leaderboard and share-sheet calls.
- `web/js/cards.js` — the four joke share cards for solo and 1 vs 1, in Bangla and English.
- `scripts/leaderboard.mjs` — player cards, daily scores and ghost links in Postgres.
- `web/js/audio.js` — synthesized effects, the Nagin been loop, and scenario-based Bangla voice.
- `web/js/network.js` — a single in-flight room connection, acknowledgements, retries, and ready/leave actions.
- `scripts/rooms.mjs` — authoritative online match clock, seat authentication, countdown, rounds, and disconnect cleanup.
- `scripts/server.mjs` — static hosting and bounded same-origin JSON requests.
- `tests/` — engine, network, room, HTTP, and asset regression tests.

## Hosting and limits

The default server binds to **127.0.0.1**, so invite links work between browsers on this computer. To play across devices, run the server on an intentionally accessible host and put HTTPS in front of it. Use `HOST` and `PORT` to configure binding. The app uses same-origin requests and does not send audio or game data to third-party services.

Rooms are kept in memory in one Node process. Restarting the server ends those rooms. This release supports at most 100 concurrent room records and is intended for private play on a single instance. It is not configured for serverless hosting or multiple replicas. Public large-scale hosting needs deployment-specific capacity, abuse, and persistence work; no public deployment has been made.

Online clients send directions only. The server owns movement, collisions, apple placement, clocks, and results. Snapshots omit credentials, queued future turns, and random generator state. Disconnects close a room after 20 seconds. Temporary failures retry the same input sequence without applying it twice.

Local scores and ghosts use a `snake-arena.v2` storage namespace, kept from the game's earlier name so nobody loses progress. The daily seed and the Render service name keep the old name for the same kind of reason. Old-game data is preserved but not imported because its rules differ. Recordings are versioned and fully replay-verified before use. A ghost shares the starting seed but runs its own simulation: different player routes can change later apple placement. Aborted runs do not replace recordings. No currencies, abilities or hazards are mixed into 1 vs 1, or into daily leaderboard runs.

## Verification

See `docs/VERIFICATION.md` for browser playtests, test results, and known coverage limits. The previous game remains untouched in the earlier workspace working copy; this is a new standalone project.

## Pungi recording credit

The local prototype loop uses the user-supplied [“Nagin Been music | sapera” reference, uploaded by Rajhans Raju](https://www.youtube.com/shorts/Gs7qKgMGgT4). Pitch and tempo are preserved; the loop is crossfaded and normalized. The source does not specify a reuse licence, and redistribution rights are unverified. Obtain permission or use cleared audio before public distribution. This replacement is not covered by the previous recording’s CC BY-SA licence or the code’s MIT licence. Provenance is in `web/audio/credits.json` and `web/audio/PUNGI-LICENSE.md`.

## Developer

Developed by [bmrauf.me](https://bmrauf.me).
