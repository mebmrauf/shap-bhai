# Snake Arena

A fresh implementation of Snake with one deterministic simulation for solo, computer, local two-player, and online rooms. Original Bangla reactions, been/pungi background music, and a clear raised or flat board. No runtime dependencies, accounts, database, or CDN required.

## Run

Node.js 20 or newer:

```sh
npm start
```

Open http://localhost:8124. Run `npm test` for the rule, replay, room, input-retry, HTTP, and audio checks. There is no install step.

## Play

- **Classic:** apples grow the snake; walls and your body end the run. Every 5 apples slightly increases movement speed.
- **Arcade:** collect another apple within 8 active seconds to score 1, 2, then 3 points per apple. Multipliers never exceed ×3. Speed depends on apples, not score.
- **Ghost:** race the best saved Classic run for the selected starting speed. It cannot collide with you. The first completed run establishes a recording. Higher score wins the race; equal scores draw.
- **1 vs 1:** computer, shared keyboard, or an online room. Identical movement rules and fixed speed for both players. First to 3 round wins. A draw awards neither player a round.

Arrow keys / WASD steer. Escape or P pauses local games. Touch direction buttons and board swipes are available. Shared keyboard uses WASD for Player 1 and arrows for Player 2. Online play cannot pause. Both players must ready for another round or match.

Sound settings separately control game effects, Bangla reactions, and music. Music defaults on for new players after pressing Play; an existing saved mute choice is respected. The user-supplied Nagin been loop pauses with gameplay and automatically ducks under Bangla reactions. Bangla clips use the Bangladeshi `bn-BD-PradeepNeural` voice, generated ahead of time and served locally. They are AI-generated, not recordings of a human actor or movie clips. Crashes and narrow escapes rotate through reactions; voices do not overlap. The sound preview button cycles through all 12 clips. No speech service is contacted during play. See `web/audio/credits.json` for the original text.

## Rules that matter

Both snakes choose their next cell before any collision is resolved. Head-on crashes, swapped heads, and simultaneous deaths are draws. A non-growing tail vacates on that tick and may be entered by either player. All other body cells remain solid. Hitting the opponent's body kills the attacker. An apple grows only a surviving snake.

Duel starts and apple pairs are rotationally symmetric. A new pair spawns after both apples are eaten, on cells free of snakes. Rounds last 90 seconds of simulation time; if both players survive, more apples wins, with equal scores drawing. The computer can inspect current positions but cannot see the human's queued turn.

The input buffer accepts two turns and applies one each movement step. Reverse turns and repeat-key floods are rejected. Pausing clears queued turns, freezes the game clock, and uses a short resume countdown.

## Project map

- `web/js/engine.js` — deterministic rules, queued input, AI, and replay verification. No DOM, timers, rendering, or network calls.
- `web/js/app.js` — menu, game lifecycle, input, local saves, and presentation.
- `web/js/render.js` — Canvas rendering with raised tiles, interpolation, flat view, and a translucent ghost. This is a 2.5D presentation, not a WebGL engine.
- `web/js/audio.js` — synthesized game effects, a Nagin been reference loop, and prerecorded Bangla neural reactions.
- `web/js/network.js` — a single in-flight room connection, acknowledgements, retries, and ready/leave actions.
- `scripts/rooms.mjs` — authoritative online match clock, seat authentication, countdown, rounds, and disconnect cleanup.
- `scripts/server.mjs` — static hosting and bounded same-origin JSON requests.
- `tests/` — engine, network, room, HTTP, and asset regression tests.

## Hosting and limits

The default server binds to **127.0.0.1**, so invite links work between browsers on this computer. To play across devices, run the server on an intentionally accessible host and put HTTPS in front of it. Use `HOST` and `PORT` to configure binding. The app uses same-origin requests and does not send audio or game data to third-party services.

Rooms are kept in memory in one Node process. Restarting the server ends those rooms. This release supports at most 100 concurrent room records and is intended for private play on a single instance. It is not configured for serverless hosting or multiple replicas. Public large-scale hosting needs deployment-specific capacity, abuse, and persistence work; no public deployment has been made.

Online clients send directions only. The server owns movement, collisions, apple placement, clocks, and results. Snapshots omit credentials, queued future turns, and random generator state. Disconnects close a room after 20 seconds. Temporary failures retry the same input sequence without applying it twice.

Local scores and ghosts use a new `snake-arena.v2` namespace. Old-game data is preserved but not imported because its rules differ. Recordings are versioned and fully replay-verified before use. A ghost shares the starting seed but runs its own simulation: different player routes can change later apple placement. Aborted runs do not replace recordings. No leaderboard, currencies, body abilities, combat abilities, or surprise adaptive hazards are mixed into competitive play.

## Verification

See `docs/VERIFICATION.md` for browser playtests, test results, and known coverage limits. The previous game remains untouched in the earlier workspace working copy; this is a new standalone project.

## Pungi recording credit

The local prototype loop uses the user-supplied [“Nagin Been music | sapera” reference, uploaded by Rajhans Raju](https://www.youtube.com/shorts/Gs7qKgMGgT4). Pitch and tempo are preserved; the loop is crossfaded and normalized. The source does not specify a reuse licence, and redistribution rights are unverified. Obtain permission or use cleared audio before public distribution. This replacement is not covered by the previous recording’s CC BY-SA licence or the code’s MIT licence. Provenance is in `web/audio/credits.json` and `web/audio/PUNGI-LICENSE.md`.
