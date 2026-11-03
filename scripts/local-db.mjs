import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';

export function localDatabase(filename = ':memory:') {
  if (filename !== ':memory:') mkdirSync('.sites-runtime', { recursive: true });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for (const file of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) {
    if (!sqlite.prepare('SELECT 1 FROM local_migrations WHERE name = ?').get(file)) {
      sqlite.exec(readFileSync('drizzle/' + file, 'utf8'));
      sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(file);
    }
  }
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async run() { return statement.run(...params); },
        async all() { return { results: statement.all(...params) }; },
      };
    },
    close() { sqlite.close(); },
  };
}
