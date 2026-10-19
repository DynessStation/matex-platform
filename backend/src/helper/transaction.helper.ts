import { Pool, PoolConnection } from 'mysql2/promise';

// Runs `work` in one database transaction: commits when it resolves, rolls back when it throws
// (including an HttpError), and always releases the connection. The error is rethrown so the
// handler or the central error handler can answer it.
export const withTransaction = async <T>(
  pool: Pool,
  work: (connection: PoolConnection) => Promise<T>,
): Promise<T> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
