const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../config/db')
const { jwtSecret, jwtExpiresIn } = require('../config/env')
const HttpError = require('../utils/httpError')

function publicUser (user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    joined: user.joined,
    role: String(user.role).toLowerCase()
  }
}
function makeAuth (user) {
  const token = jwt.sign({ email: user.email, role: user.role }, jwtSecret, {
    subject: String(user.id),
    expiresIn: jwtExpiresIn
  })
  return {
    token,
    role: String(user.role).toLowerCase(),
    user: publicUser(user)
  }
}
async function register ({ name, email, password, phone }) {
  if (!name || !email || !password)
    throw new HttpError(400, 'Name, email, and password are required.')
  if (String(password).length < 8)
    throw new HttpError(400, 'Password must be at least 8 characters.')
  const normalizedEmail = String(email).trim().toLowerCase()
  const existing = await query(
    'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
    [normalizedEmail]
  )
  if (existing.length)
    throw new HttpError(409, 'An account with this email already exists.')
  const hash = await bcrypt.hash(password, 12)
  const result = await query(
    "INSERT INTO users (name,email,password,phone,joined,role) VALUES (?,?,?,?,CURRENT_DATE,'USER')",
    [String(name).trim(), normalizedEmail, hash, phone || null]
  )
  const [user] = await query(
    'SELECT id,name,email,phone,joined,role FROM users WHERE id = ?',
    [result.insertId]
  )
  return makeAuth(user)
}
async function login ({ email, password }) {
  if (!email || !password)
    throw new HttpError(400, 'Email and password are required.')
  const rows = await query(
    'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
    [String(email).trim().toLowerCase()]
  )
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password)))
    throw new HttpError(401, 'Invalid email or password.')
  return makeAuth(rows[0])
}
module.exports = { register, login, publicUser }
