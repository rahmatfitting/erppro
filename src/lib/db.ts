import mysql from 'mysql2/promise';

// Global is used here to ensure the connection pool is not recreated on every hot-reload in development
const globalForMySQL = global as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

let config: mysql.PoolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: true
};

if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    config = {
      ...config,
      host: dbUrl.hostname,
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.slice(1),
      port: parseInt(dbUrl.port || '3306', 10),
    };
  } catch (err) {
    console.error("Error parsing DATABASE_URL:", err);
  }
}

if (!config.host) {
  config = {
    ...config,
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  };
}

export const pool =
  globalForMySQL.mysqlPool ??
  mysql.createPool(config);

if (process.env.NODE_ENV !== 'production') globalForMySQL.mysqlPool = pool;

/**
 * Utility function to execute a query safely
 */
export async function executeQuery<T>(query: string, values: any[] = []): Promise<T> {
  try {
    const [results] = await pool.execute(query, values);
    return results as T;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
