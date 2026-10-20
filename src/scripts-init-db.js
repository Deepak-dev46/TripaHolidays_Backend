const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config();
const { db } = require('./config/env');
(async () => {
  const connection = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password, multipleStatements: true });
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8').replace(/^CREATE DATABASE IF NOT EXISTS tripDbExpress[^;]*;\s*USE tripDbExpress;/i, `CREATE DATABASE IF NOT EXISTS \`${db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE \`${db.database}\`;`);
    await connection.query(sql);
    console.log(`Database schema created/verified for ${db.database}`);
  } finally { await connection.end(); }
})().catch(err => { console.error('Database initialization failed:', err.message); process.exit(1); });
