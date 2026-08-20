/** Repository adapter backed by a pg-compatible connection pool. */
class PostgresRepository {
  /** @param {{pool: {query: Function, connect?: Function}}} options */
  constructor({ pool }) {
    if (!pool || typeof pool.query !== 'function') {
      throw new TypeError('PostgresRepository requires a pg-compatible pool');
    }
    this.pool = pool;
  }

  /** @param {string} tenantId @param {string} type @param {string} id @param {Record<string, any>} value @returns {Promise<Record<string, any>>} */
  async save(tenantId, type, id, value) {
    this.#validateIdentity(tenantId, type, id);
    const result = await this.pool.query(
      `INSERT INTO bos_records (tenant_id, record_type, record_id, value)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (tenant_id, record_type, record_id)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING value`,
      [tenantId, type, id, JSON.stringify(value)]
    );
    return result.rows[0].value;
  }

  /** @param {string} tenantId @param {string} type @param {string} id @returns {Promise<Record<string, any>|null>} */
  async find(tenantId, type, id) {
    this.#validateIdentity(tenantId, type, id);
    const result = await this.pool.query(
      `SELECT value FROM bos_records
       WHERE tenant_id = $1 AND record_type = $2 AND record_id = $3`,
      [tenantId, type, id]
    );
    return result.rows[0]?.value ?? null;
  }

  /** @param {string} tenantId @param {string} type @returns {Promise<Array<Record<string, any>>>} */
  async all(tenantId, type) {
    if (!tenantId || !type) throw new TypeError('Repository requires tenantId and type');
    const result = await this.pool.query(
      `SELECT value FROM bos_records
       WHERE tenant_id = $1 AND record_type = $2
       ORDER BY created_at ASC`,
      [tenantId, type]
    );
    return result.rows.map((row) => row.value);
  }

  /** @param {string} tenantId @param {string} type @param {string} id @returns {Promise<boolean>} */
  async delete(tenantId, type, id) {
    this.#validateIdentity(tenantId, type, id);
    const result = await this.pool.query(
      `DELETE FROM bos_records
       WHERE tenant_id = $1 AND record_type = $2 AND record_id = $3`,
      [tenantId, type, id]
    );
    return result.rowCount === 1;
  }

  /** @param {(client: any) => Promise<any>} callback @returns {Promise<any>} */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** @param {string} connectionString @param {Record<string, any>} [options] @returns {PostgresRepository} */
  static fromConnectionString(connectionString, options = {}) {
    if (!connectionString) throw new TypeError('DATABASE_URL is required');
    const { Pool } = require('pg');
    return new PostgresRepository({
      pool: new Pool({ connectionString, ...options })
    });
  }

  /** @param {string} tenantId @param {string} type @param {string} id @returns {void} */
  #validateIdentity(tenantId, type, id) {
    if (!tenantId || !type || !id) {
      throw new TypeError('Repository requires tenantId, type and id');
    }
  }
}

module.exports = { PostgresRepository };
