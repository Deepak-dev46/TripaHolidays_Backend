const bcrypt = require('bcryptjs')
const { query, pool } = require('./config/db')
const { admin } = require('./config/env')
;(async () => {
  if (!admin.seed) {
    console.log('Admin seeding disabled.')
    return
  }
  // if (!admin.password || admin.password.length < 12)
  //   throw new Error(
  //     'Set ADMIN_PASSWORD to a strong password of at least 12 characters before enabling SEED_ADMIN.'
  //   )
  const existing = await query(
    'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
    [admin.email]
  )
  if (existing.length) {
    console.log(`Admin account already exists: ${admin.email}`)
    return
  }
  const password = await bcrypt.hash(admin.password, 12)
  await query(
    "INSERT INTO users (name,email,password,joined,role) VALUES (?,?,?,CURRENT_DATE,'ADMIN')",
    [admin.name, admin.email, password]
  )
  console.log(`Created initial administrator: ${admin.email}`)
})()
  .catch(err => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
