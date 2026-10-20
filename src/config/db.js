const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool({
  ...db,
  waitForConnections: true,
  connectionLimit: db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4'
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };
