/**
 * CivicResolve - Dual Database Abstraction Layer (PostgreSQL & SQLite)
 * 
 * Provides a unified async/sync database interface across PostgreSQL and SQLite.
 * Features:
 * - Transparent parameter translation (? to $1, $2, ...)
 * - Automatic RETURNING id handling for lastInsertRowid parity
 * - Unified transaction management (client checkout from pool for PG, BEGIN IMMEDIATE for SQLite)
 * - Safe PRAGMA stubs for PostgreSQL
 * - Zero regression for existing SQLite test suites
 */

function convertSqlToPg(sql) {
  if (typeof sql !== 'string') return sql;
  
  let paramIndex = 1;
  let inString = false;
  let quoteChar = '';
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      result += char;
      if (char === quoteChar) {
        if (i + 1 < sql.length && sql[i + 1] === quoteChar) {
          result += sql[i + 1];
          i++;
        } else {
          inString = false;
        }
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        quoteChar = char;
        result += char;
      } else if (char === '?') {
        result += `$${paramIndex++}`;
      } else {
        result += char;
      }
    }
  }

  // Dialect translations
  result = result.replace(/datetime\s*\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');
  result = result.replace(/datetime\s*\(\s*CURRENT_TIMESTAMP\s*\)/gi, 'CURRENT_TIMESTAMP');
  result = result.replace(
    /substr\s*\(\s*(replace\([^)]+\))\s*,\s*-10\s*\)/gi,
    'RIGHT($1, 10)'
  );

  return result;
}

function flattenArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

class PostgresDatabaseAdapter {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.isPostgres = true;
    this.engine = 'postgres';
    this._open = true;
    this.schema = options.schema || 'public';
    this.dbPath = null;
  }

  get open() {
    return this._open && !this.pool.ended;
  }

  createTxAdapter(client) {
    return {
      query: (sql, params = []) => client.query(convertSqlToPg(sql), flattenArgs(params)),
      get: async (sql, ...params) => {
        const res = await client.query(convertSqlToPg(sql), flattenArgs(params));
        return res.rows[0];
      },
      all: async (sql, ...params) => {
        const res = await client.query(convertSqlToPg(sql), flattenArgs(params));
        return res.rows;
      },
      run: async (sql, ...params) => {
        let pgSql = convertSqlToPg(sql);
        const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
        if (isInsert && !/RETURNING/i.test(pgSql)) {
          pgSql += ' RETURNING id';
        }
        const res = await client.query(pgSql, flattenArgs(params));
        return {
          lastInsertRowid: res.rows[0]?.id || 0,
          changes: res.rowCount || 0
        };
      },
      prepare: (sql) => {
        const pgSql = convertSqlToPg(sql);
        return {
          get: async (...args) => {
            const res = await client.query(pgSql, flattenArgs(args));
            return res.rows[0];
          },
          all: async (...args) => {
            const res = await client.query(pgSql, flattenArgs(args));
            return res.rows;
          },
          run: async (...args) => {
            let runSql = pgSql;
            if (/^\s*INSERT\s+INTO/i.test(runSql) && !/RETURNING/i.test(runSql)) {
              runSql += ' RETURNING id';
            }
            const res = await client.query(runSql, flattenArgs(args));
            return {
              lastInsertRowid: res.rows[0]?.id || 0,
              changes: res.rowCount || 0
            };
          }
        };
      }
    };
  }

  async transaction(fn) {
    const client = await this.pool.connect();
    try {
      if (this.schema !== 'public') {
        await client.query(`SET search_path TO "${this.schema}", public;`);
      }
      await client.query('BEGIN');
      const tx = this.createTxAdapter(client);
      const res = await fn(tx);
      await client.query('COMMIT');
      return res;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  prepare(sql) {
    const pgSql = convertSqlToPg(sql);
    return {
      get: async (...args) => {
        const res = await this.pool.query(pgSql, flattenArgs(args));
        return res.rows[0];
      },
      all: async (...args) => {
        const res = await this.pool.query(pgSql, flattenArgs(args));
        return res.rows;
      },
      run: async (...args) => {
        let runSql = pgSql;
        if (/^\s*INSERT\s+INTO/i.test(runSql) && !/RETURNING/i.test(runSql)) {
          runSql += ' RETURNING id';
        }
        const res = await this.pool.query(runSql, flattenArgs(args));
        return {
          lastInsertRowid: res.rows[0]?.id || 0,
          changes: res.rowCount || 0
        };
      }
    };
  }

  async query(sql, params = []) {
    return this.pool.query(convertSqlToPg(sql), flattenArgs(params));
  }

  async get(sql, ...params) {
    const res = await this.pool.query(convertSqlToPg(sql), flattenArgs(params));
    return res.rows[0];
  }

  async all(sql, ...params) {
    const res = await this.pool.query(convertSqlToPg(sql), flattenArgs(params));
    return res.rows;
  }

  async run(sql, ...params) {
    let pgSql = convertSqlToPg(sql);
    if (/^\s*INSERT\s+INTO/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }
    const res = await this.pool.query(pgSql, flattenArgs(params));
    return {
      lastInsertRowid: res.rows[0]?.id || 0,
      changes: res.rowCount || 0
    };
  }

  async exec(sql) {
    return this.pool.query(sql);
  }

  pragma(str) {
    if (/journal_mode/i.test(str)) {
      return [{ journal_mode: 'wal (postgres-engine)' }];
    }
    if (/synchronous/i.test(str)) {
      return [{ synchronous: 2 }];
    }
    if (/integrity_check/i.test(str)) {
      return [{ integrity_check: 'ok' }];
    }
    if (/busy_timeout/i.test(str)) {
      return [{ busy_timeout: 5000 }];
    }
    return [{ result: 'ok' }];
  }

  async close() {
    this._open = false;
    return this.pool.end();
  }
}

class SqliteDatabaseAdapter {
  constructor(sqliteDb, dbPath) {
    this.sqliteDb = sqliteDb;
    this.isPostgres = false;
    this.engine = 'sqlite';
    this.dbPath = dbPath;
  }

  get open() {
    return this.sqliteDb ? this.sqliteDb.open : false;
  }

  prepare(sql) {
    const stmt = this.sqliteDb.prepare(sql);
    return {
      get: (...args) => stmt.get(...flattenArgs(args)),
      all: (...args) => stmt.all(...flattenArgs(args)),
      run: (...args) => stmt.run(...flattenArgs(args)),
      bind: (...args) => stmt.bind(...flattenArgs(args))
    };
  }

  query(sql, params = []) {
    return {
      rows: this.sqliteDb.prepare(sql).all(...flattenArgs(params))
    };
  }

  get(sql, ...params) {
    return this.sqliteDb.prepare(sql).get(...flattenArgs(params));
  }

  all(sql, ...params) {
    return this.sqliteDb.prepare(sql).all(...flattenArgs(params));
  }

  run(sql, ...params) {
    return this.sqliteDb.prepare(sql).run(...flattenArgs(params));
  }

  exec(sql) {
    return this.sqliteDb.exec(sql);
  }

  pragma(str) {
    if (typeof this.sqliteDb.pragma === 'function') {
      return this.sqliteDb.pragma(str);
    }
    try {
      return this.sqliteDb.prepare(`PRAGMA ${str}`).all();
    } catch {
      return [];
    }
  }

  transaction(fn) {
    if (typeof this.sqliteDb.transaction === 'function') {
      return this.sqliteDb.transaction(fn);
    }
    return (...args) => {
      this.sqliteDb.exec('BEGIN IMMEDIATE');
      try {
        const res = fn(...args);
        this.sqliteDb.exec('COMMIT');
        return res;
      } catch (e) {
        this.sqliteDb.exec('ROLLBACK');
        throw e;
      }
    };
  }

  backup(destPath) {
    if (typeof this.sqliteDb.backup === 'function') {
      return this.sqliteDb.backup(destPath);
    }
    this.sqliteDb.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);
    return destPath;
  }

  close() {
    return this.sqliteDb.close();
  }
}

module.exports = {
  convertSqlToPg,
  flattenArgs,
  PostgresDatabaseAdapter,
  SqliteDatabaseAdapter
};
