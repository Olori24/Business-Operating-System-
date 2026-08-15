const fs = require('node:fs/promises');
const path = require('node:path');

class MigrationRunner {
  constructor({ pool, migrationsDir = path.join(__dirname, 'migrations') }) {
    if (!pool || typeof pool.connect !== 'function') {
      throw new TypeError('MigrationRunner requires a pg-compatible pool');
    }
    this.pool = pool;
    this.migrationsDir = migrationsDir;
  }

  async migrate() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS bos_schema_migrations (
          version TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const files = (await fs.readdir(this.migrationsDir))
        .filter((file) => /^\d+_.+\.sql$/.test(file))
        .sort();
      const applied = new Set(
        (await client.query('SELECT version FROM bos_schema_migrations ORDER BY version')).rows
          .map((row) => row.version)
      );
      for (const file of files) {
        if (applied.has(file)) continue;
        const sql = await fs.readFile(path.join(this.migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO bos_schema_migrations (version) VALUES ($1)', [file]);
      }
      await client.query('COMMIT');
      return { applied: files.filter((file) => !applied.has(file)) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { MigrationRunner };
