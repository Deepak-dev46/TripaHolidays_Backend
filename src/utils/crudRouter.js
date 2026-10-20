const express = require('express');
const { query } = require('../config/db');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const asyncHandler = require('./asyncHandler');
const HttpError = require('./httpError');

// All SQL identifiers come from this server-owned configuration, never from user input.
function crudRouter({ table, fields, publicList = true, publicGet = true, publicCreate = false, adminOnly = true, orderBy = 'id DESC' }) {
  const router = express.Router();
  const cols = ['id', ...fields];
  const select = `SELECT ${cols.map(c => `\`${c}\``).join(', ')} FROM \`${table}\``;
  const canManage = adminOnly ? [authenticate, requireAdmin] : [];
  if (publicList) router.get('/', asyncHandler(async (req, res) => {
    const rows = await query(`${select} ORDER BY ${orderBy}`);
    res.json(rows);
  }));
  if (publicGet) router.get('/:id', asyncHandler(async (req, res) => {
    const rows = await query(`${select} WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!rows.length) throw new HttpError(404, `${table} record not found.`);
    res.json(rows[0]);
  }));
  router.post('/', ...(publicCreate ? [] : canManage), asyncHandler(async (req, res) => {
    const payload = {};
    for (const field of fields) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const keys = Object.keys(payload);
    if (!keys.length) throw new HttpError(400, 'At least one supported field is required.');
    const values = keys.map(k => payload[k] === undefined ? null : (typeof payload[k] === 'object' && payload[k] !== null ? JSON.stringify(payload[k]) : payload[k]));
    const result = await query(`INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(',')}) VALUES (${keys.map(() => '?').join(',')})`, values);
    const rows = await query(`${select} WHERE id = ? LIMIT 1`, [result.insertId]);
    res.status(201).json(rows[0]);
  }));
  router.put('/:id', ...canManage, asyncHandler(async (req, res) => {
    const payload = {};
    for (const field of fields) if (req.body[field] !== undefined) payload[field] = req.body[field];
    const keys = Object.keys(payload);
    if (!keys.length) throw new HttpError(400, 'No supported fields provided for update.');
    const values = keys.map(k => typeof payload[k] === 'object' && payload[k] !== null ? JSON.stringify(payload[k]) : payload[k]);
    const result = await query(`UPDATE \`${table}\` SET ${keys.map(k => `\`${k}\` = ?`).join(', ')} WHERE id = ?`, [...values, req.params.id]);
    if (!result.affectedRows) throw new HttpError(404, `${table} record not found.`);
    const rows = await query(`${select} WHERE id = ? LIMIT 1`, [req.params.id]);
    res.json(rows[0]);
  }));
  router.delete('/:id', ...canManage, asyncHandler(async (req, res) => {
    const result = await query(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);
    if (!result.affectedRows) throw new HttpError(404, `${table} record not found.`);
    res.status(204).end();
  }));
  return router;
}
module.exports = crudRouter;
