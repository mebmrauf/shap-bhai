# Verification — 29 October 2026

## Automated

**43 tests passed.** The suite covers:

- One cell per tick, growth, first apple, reverse-turn rejection, and two-turn buffering.
- Wall/self/opponent collisions, head-on and head-swap draws, simultaneous deaths, vacating/growing tails, and survival precedence over score.
- Symmetric starts, equal duel speed, 90-second scoring, full-board completion, deterministic food spawning.
- Arcade scoring caps, active-time expiry, and apple-based speed progression.
- Replay integrity, bounded input, tampering, and separation from Arcade/unfinished runs.
- AI wall avoidance, independence from human queued input, and body/score invariants across 30 seeded bot matches.
- Room membership, authentication, shared countdown, authoritative ticking, duplicate/stale inputs, ready consent, score preservation, match reset, disconnect and leave handling.
- HTTP methods, JSON, content type, origin, static file boundary, and audio delivery.
- Private snapshots, in-flight input acknowledgement, lost-response retry, non-overlapping polling, and readiness races.
- Eight shipped Bangla WAV clips contain non-silent PCM audio and their Bengali scripts.

## Browser playtests

Performed using normal UI and keyboard controls:

- Classic: collected apples, turned, paused, resumed, crashed, saved a best and replay.
- Ghost: raced that recording while taking a different route; observed the separate blue replay and score target.
- Same keyboard: controlled both players, collected an apple for each, shared pause/resume, verified Player 2's win and round score.
- Computer: observed the bot collect apples and turn independently using the shared engine.
- Arcade: collected an apple; confirmed combo meter pauses with gameplay.
- Online: created and joined a room in two browser tabs, steered the guest, and verified identical winner and 1–0 round tally on both screens. A ready click waited for the other player, then round 2 retained the tally. Leaving closed the opponent's room cleanly.
- Sound dialog: previewed a Bangla clip and verified controls and no browser console errors.
- Layout: visually inspected narrow 445px and wide 1280px views. Corrected game sizing and kept audio controls beside the board. The browser's requested 375px viewport override did not change the actual embedded viewport; no 375px-device claim is made.

Issues found during browser testing and corrected: stale online result tally, misleading online pause hint, duplicate/inactive pause/result controls, stale board accessibility label, and menu returning at the previous game's scroll position.

## Limits

No physical touch-device, real high-latency WAN, public hosting, multi-instance/load, or human evaluation of Bangla voice naturalness was performed. The Bangla voice is synthesized. The musical loop is original synthesized pluck/percussion, not a recording of a Bangla song. AI difficulty is fixed and visible rules do not adapt secretly. The presentation uses Canvas 2.5D, with a flat-view option.
