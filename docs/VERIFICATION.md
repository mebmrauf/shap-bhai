# Verification — 6 November 2026

The current product is a solo game: Classic, Chaos and Ghost. Older verification notes described features outside this scope and have been replaced.

## Current validation

Run `npm run build:static` to build the versioned static artifact. Automated test files, the npm test command and test CI workflow were removed at the user’s request. Before removal, **125 tests passed**. That historical suite covered solo movement, two-turn input buffering, wall/self collisions, vacating tails, growth, deterministic food, speed progression, full-board completion, replay integrity, Chaos warnings and events, bilingual audio/captions, solo share-card copy, translations, assets, HTTP boundaries and update coordination. It also covered internal Arcade and legacy leaderboard validation.

Before removal, regression checks verified each supported engine mode starts with one snake, the removed competitive mode is rejected, and the former room API returns 404. The historical HTTP checks used loopback sockets.

## Review scope

Source review included all application modules, static hosting, the service worker, manifest, deployment workflows, audio metadata and tests. Browser checks use the local Node server and desktop Chromium. Physical touch devices, iOS Safari, real installed PWA updates, cleared music redistribution rights, real database persistence and production load are outside this verification.

The default server does not initialize the legacy leaderboard service. Daily challenges, online score posting, profiles and shared ghost links are not connected to the current UI. The static build and GitHub Pages workflow now stamp the same content hash as Node hosting.

## Adventure playthroughs

A temporary deterministic planner completed each story with Kal Nagini, seed 1, and verified the resulting version 3 recording. Dhaka: 308 ticks, 20 deliveries, 4 encounters. Rooftop: 267 ticks, 20 deliveries, 5 encounters. Beach: 281 ticks, 20 deliveries, 3 encounters. Sundarbans: 320 ticks, 20 deliveries, 4 encounters. This validates reachability and replay consistency, not human difficulty or enjoyment.

All 116 new adventure MP3s (58 Bangla, 58 English) have matching source scripts and offline-cache entries. The historical automatic checks validated file structure; human listening and physical-phone playtesting are still needed for voice naturalness and final difficulty tuning.

The historical dialogue regression checks covered all worlds, wall/self/tiger/bus outcomes, zero and high scores, wins, reward availability versus collection, rescued versus stolen sweets, character selection versus actual hat-tricks, same-step resolved warnings, warning priority across ticks, and matching audio cache versions.

The result overlay displays one joke, selected from the same recorded line that is spoken. A browser-level function test verified that equality and the absence of a second joke in both languages.
