// Moderation: finds players by exact name, and with --delete removes them and their scores.
//   node scripts/remove-player.mjs "Bad Name"           shows who matches, changes nothing
//   node scripts/remove-player.mjs "Bad Name" --delete  removes them
import pg from 'pg';
try { process.loadEnvFile(new URL('../.env', import.meta.url)); } catch { /* Hosted platforms set real environment variables. */ }
const name = process.argv[2], remove = process.argv.includes('--delete');
const connectionString = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
if (!name || !connectionString) { console.error('Usage: node scripts/remove-player.mjs "Name" [--delete]. DATABASE_URL must be set.'); process.exit(1); }
const pool = new pg.Pool({ connectionString: connectionString.replace('sslmode=require', 'sslmode=verify-full') });
try {
  const { rows } = await pool.query(`SELECT p.player, p.name, p.district, p.crew, count(s.day)::int AS scores FROM snake_players p LEFT JOIN snake_daily_scores s USING (player) WHERE p.name = $1 GROUP BY p.player`, [name]);
  console.log(rows.length ? rows.map(r => `${r.name} | ${r.district || 'no district'} | ${r.crew || 'no crew'} | ${r.scores} score(s)`).join('\n') : 'No player has that exact name.');
  if (remove && rows.length) {
    await pool.query('DELETE FROM snake_players WHERE player = ANY($1)', [rows.map(r => r.player)]);
    console.log(`Removed ${rows.length} player(s) and their scores.`);
  } else if (rows.length) console.log('Nothing changed. Add --delete to remove.');
} finally { await pool.end(); }
