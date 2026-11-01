import { createHash, randomBytes } from 'node:crypto';
import { replayRecording, dailySeed, dhakaDay } from '../web/js/engine.js';
import { DISTRICTS } from '../web/js/districts.js';
import { RoomError } from './rooms.mjs';
import { isBadName } from './name-filter.mjs';

const TOKEN = /^[a-f0-9]{32}$/, CREW = /^[A-Z0-9-]{3,16}$/, GHOST_ID = /^[A-Za-z0-9_-]{8,16}$/;
const NAME = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} ._-]{1,19}$/u;
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS snake_players (
    player text PRIMARY KEY, name text NOT NULL, district text NOT NULL DEFAULT '', crew text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS snake_players_crew ON snake_players (crew) WHERE crew <> '';
  CREATE TABLE IF NOT EXISTS snake_daily_scores (
    day date NOT NULL, player text NOT NULL REFERENCES snake_players(player) ON DELETE CASCADE,
    score integer NOT NULL CHECK (score >= 0), ticks integer NOT NULL CHECK (ticks > 0), record jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (day, player));
  CREATE INDEX IF NOT EXISTS snake_daily_rank ON snake_daily_scores (day, score DESC, ticks ASC);
  CREATE TABLE IF NOT EXISTS snake_ghosts (
    id text PRIMARY KEY, name text NOT NULL, score integer NOT NULL, record jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS snake_ghosts_age ON snake_ghosts (created_at);`;
const FRIEND = 'তোমার বন্ধু';
// Checked when shown as well as when saved, so adding a word to the list also cleans up older names.
const safeRows = rows => rows.map(row => isBadName(row.name) ? { ...row, name: 'Player' } : row);
const hashToken = token => createHash('sha256').update(token).digest('hex');
function requireToken(token) {
  if (typeof token !== 'string' || !TOKEN.test(token)) throw new RoomError('Invalid player token.');
  return hashToken(token);
}
function cleanProfile({ name, district = '', crew = '' }) {
  const cleanName = typeof name === 'string' ? name.normalize('NFC').trim() : '';
  if (!NAME.test(cleanName)) throw new RoomError('Use a 2–20 character name with letters or numbers.');
  if (isBadName(cleanName)) throw new RoomError('That name is not allowed. Please choose another.');
  if (district !== '' && !DISTRICTS.includes(district)) throw new RoomError('Choose a district from the list.');
  const cleanCrew = typeof crew === 'string' ? crew.trim().toUpperCase() : '';
  if (cleanCrew && !CREW.test(cleanCrew)) throw new RoomError('Crew codes use 3–16 letters, numbers or dashes.');
  if (cleanCrew && isBadName(cleanCrew)) throw new RoomError('That crew code is not allowed. Please choose another.');
  return { name: cleanName, district, crew: cleanCrew };
}
// Only the known replay fields are kept, so nothing extra is stored or served to other players.
function verifiedRecord(record) {
  try { replayRecording(record); } catch { throw new RoomError('That run could not be verified.'); }
  const { version, seed, speed, ticks, score, actions } = record;
  return { version, seed, speed, ticks, score, actions };
}
export class Leaderboard {
  constructor(pool, now = Date.now) { this.pool = pool; this.now = now; this.ready = null; }
  async query(text, values) {
    // A failed first connection must not block every later request.
    this.ready ??= this.pool.query(SCHEMA).catch(error => { this.ready = null; throw error; });
    await this.ready;
    return this.pool.query(text, values);
  }
  async saveProfile({ token, ...profile }) {
    const player = requireToken(token), clean = cleanProfile(profile);
    await this.query(`INSERT INTO snake_players (player, name, district, crew) VALUES ($1, $2, $3, $4)
      ON CONFLICT (player) DO UPDATE SET name = $2, district = $3, crew = $4, updated_at = now()`, [player, clean.name, clean.district, clean.crew]);
    return clean;
  }
  // Scores count only for today's or yesterday's seed, so a run finished across midnight still lands.
  dayFor(seed) {
    const today = dhakaDay(this.now()), yesterday = dhakaDay(this.now() - 86400000);
    return [today, yesterday].find(day => dailySeed(day) === seed) ?? null;
  }
  async submitDaily({ token, record }) {
    const player = requireToken(token);
    const replayed = verifiedRecord(record);
    if (replayed.speed !== 'normal') throw new RoomError('Daily runs use Standard speed.');
    const day = this.dayFor(replayed.seed);
    if (!day) throw new RoomError('That daily challenge has ended.');
    const known = await this.query('SELECT 1 FROM snake_players WHERE player = $1', [player]);
    if (!known.rows.length) throw new RoomError('Set a player name first.', 409);
    const saved = await this.query(`INSERT INTO snake_daily_scores AS s (day, player, score, ticks, record) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (day, player) DO UPDATE SET score = EXCLUDED.score, ticks = EXCLUDED.ticks, record = EXCLUDED.record, updated_at = now()
      WHERE EXCLUDED.score > s.score OR (EXCLUDED.score = s.score AND EXCLUDED.ticks < s.ticks)
      RETURNING score`, [day, player, replayed.score, replayed.ticks, JSON.stringify(replayed)]);
    const rank = await this.query(`SELECT s.score, 1 + (SELECT count(*) FROM snake_daily_scores o WHERE o.day = s.day AND (o.score > s.score OR (o.score = s.score AND o.ticks < s.ticks)))::int AS rank
      FROM snake_daily_scores s WHERE s.day = $1 AND s.player = $2`, [day, player]);
    return { day, improved: saved.rows.length > 0, best: rank.rows[0].score, rank: Number(rank.rows[0].rank) };
  }
  async top({ scope = 'everyone', crew = '' } = {}) {
    const day = dhakaDay(this.now());
    if (scope === 'district') {
      // Average of each district's top five, so a big district cannot win on headcount alone.
      const { rows } = await this.query(`SELECT district, round(avg(score))::int AS score, count(*)::int AS players FROM (
          SELECT p.district, s.score, row_number() OVER (PARTITION BY p.district ORDER BY s.score DESC) AS place
          FROM snake_daily_scores s JOIN snake_players p USING (player) WHERE s.day = $1 AND p.district <> '') ranked
        WHERE place <= 5 GROUP BY district ORDER BY score DESC, players DESC, district LIMIT 64`, [day]);
      return { day, scope, rows };
    }
    if (scope === 'crew') {
      const code = typeof crew === 'string' ? crew.trim().toUpperCase() : '';
      if (!CREW.test(code)) throw new RoomError('Enter a crew code.');
      const { rows } = await this.query(`SELECT p.name, p.district, s.score FROM snake_daily_scores s JOIN snake_players p USING (player)
        WHERE s.day = $1 AND p.crew = $2 ORDER BY s.score DESC, s.ticks ASC, s.updated_at ASC LIMIT 50`, [day, code]);
      return { day, scope, crew: code, rows: safeRows(rows) };
    }
    if (scope !== 'everyone') throw new RoomError('Unknown leaderboard.');
    const { rows } = await this.query(`SELECT p.name, p.district, s.score FROM snake_daily_scores s JOIN snake_players p USING (player)
      WHERE s.day = $1 ORDER BY s.score DESC, s.ticks ASC, s.updated_at ASC LIMIT 50`, [day]);
    return { day, scope, rows: safeRows(rows) };
  }
  async saveGhost({ record, name }) {
    const replayed = verifiedRecord(record);
    const label = typeof name === 'string' && NAME.test(name.normalize('NFC').trim()) && !isBadName(name) ? name.normalize('NFC').trim() : FRIEND;
    const id = randomBytes(8).toString('base64url');
    await this.query('INSERT INTO snake_ghosts (id, name, score, record) VALUES ($1, $2, $3, $4)', [id, label, replayed.score, JSON.stringify(replayed)]);
    await this.query("DELETE FROM snake_ghosts WHERE created_at < now() - interval '30 days'");
    return { id };
  }
  async ghost(id) {
    if (!GHOST_ID.test(id)) throw new RoomError('Invalid ghost link.');
    const { rows } = await this.query('SELECT name, record FROM snake_ghosts WHERE id = $1', [id]);
    if (!rows.length) throw new RoomError('That ghost has faded. Links last 30 days.', 404);
    return { name: isBadName(rows[0].name) ? FRIEND : rows[0].name, record: rows[0].record };
  }
}
export async function connectLeaderboard() {
  const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!connectionString) return null;
  let pg;
  try { ({ default: pg } = await import('pg')); } catch { console.error('Leaderboards are off: run npm install to add the database driver.'); return null; }
  // pg already treats require as verify-full; naming it keeps that behaviour when pg 9 changes the alias.
  const pool = new pg.Pool({ connectionString: connectionString.replace('sslmode=require', 'sslmode=verify-full'), max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000 });
  pool.on('error', error => console.error('Database connection error:', error.code ?? 'unknown'));
  return new Leaderboard(pool);
}
