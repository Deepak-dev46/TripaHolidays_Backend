const express = require('express')
const { query } = require('../config/db')
const crudRouter = require('../utils/crudRouter')
const asyncHandler = require('../utils/asyncHandler')
const HttpError = require('../utils/httpError')
const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()
router.use(
  '/destinations',
  crudRouter({
    table: 'destinations',
    fields: ['name', 'country', 'image', 'packageCount', 'blurb'],
    adminOnly: true
  })
)
router.use(
  '/packages',
  crudRouter({
    table: 'packages',
    fields: [
      'title',
      'destinationId',
      'location',
      'category',
      'tripType',
      'duration',
      'price',
      'rating',
      'reviewCount',
      'featured',
      'trending',
      'images',
      'shortDescription',
      'description',
      'included',
      'excluded',
      'tourPlan'
    ],
    adminOnly: false
  })
)
router.use(
  '/offers',
  crudRouter({
    table: 'offers',
    fields: [
      'title',
      'description',
      'discount',
      'bannerImage',
      'startDate',
      'endDate',
      'packageId'
    ],
    adminOnly: false
  })
)
router.use(
  '/videos',
  crudRouter({
    table: 'videos',
    fields: ['title', 'description', 'videoUrl', 'thumbnailUrl'],
    adminOnly: false
  })
)

// Booking submission and contact submission are public; management endpoints require an admin token.
const bookingRouter = express.Router()
bookingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body
    if (!b.name || !b.email)
      throw new HttpError(400, 'Name and email are required.')
    const result = await query(
      `INSERT INTO bookings (packageId,packageTitle,name,email,phone,adults,children,groupType,days,travelDate,specialRequests,status,totalPrice)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'PENDING',?)`,
      [
        b.packageId || null,
        b.packageTitle || null,
        b.name,
        String(b.email).trim().toLowerCase(),
        b.phone || null,
        Number(b.adults || 1),
        Number(b.children || 0),
        b.groupType || null,
        b.days || null,
        b.travelDate || null,
        b.specialRequests || null,
        b.totalPrice || null
      ]
    )
    const rows = await query('SELECT * FROM bookings WHERE id = ?', [
      result.insertId
    ])
    res.status(201).json(rows[0])
  })
)
bookingRouter.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) =>
    res.json(await query('SELECT * FROM bookings ORDER BY createdAt DESC'))
  )
)
bookingRouter.get(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM bookings WHERE id = ?', [
      req.params.id
    ])
    if (!rows.length) throw new HttpError(404, 'Booking not found.')
    res.json(rows[0])
  })
)
bookingRouter.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = String(req.body.status || '').toUpperCase()
    if (
      !['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REJECTED'].includes(
        status
      )
    )
      throw new HttpError(400, 'Unsupported booking status.')
    const result = await query('UPDATE bookings SET status = ? WHERE id = ?', [
      status,
      req.params.id
    ])
    if (!result.affectedRows) throw new HttpError(404, 'Booking not found.')
    const rows = await query('SELECT * FROM bookings WHERE id = ?', [
      req.params.id
    ])
    res.json(rows[0])
  })
)
bookingRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM bookings WHERE id = ?', [
      req.params.id
    ])
    if (!result.affectedRows) throw new HttpError(404, 'Booking not found.')
    res.status(204).end()
  })
)
router.use('/bookings', bookingRouter)

const contactRouter = express.Router()
contactRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const c = req.body
    if (!c.name || !c.email || !c.message)
      throw new HttpError(400, 'Name, email, and message are required.')
    const result = await query(
      'INSERT INTO contacts (name,email,phone,subject,message) VALUES (?,?,?,?,?)',
      [
        c.name,
        String(c.email).trim().toLowerCase(),
        c.phone || null,
        c.subject || null,
        c.message
      ]
    )
    const rows = await query('SELECT * FROM contacts WHERE id = ?', [
      result.insertId
    ])
    res.status(201).json(rows[0])
  })
)
contactRouter.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) =>
    res.json(await query('SELECT * FROM contacts ORDER BY date DESC'))
  )
)
contactRouter.put(
  '/:id/read',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await query(
      'UPDATE contacts SET isRead = TRUE WHERE id = ?',
      [req.params.id]
    )
    if (!result.affectedRows) throw new HttpError(404, 'Contact not found.')
    const rows = await query('SELECT * FROM contacts WHERE id = ?', [
      req.params.id
    ])
    res.json(rows[0])
  })
)
contactRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await query('DELETE FROM contacts WHERE id = ?', [
      req.params.id
    ])
    if (!result.affectedRows) throw new HttpError(404, 'Contact not found.')
    res.status(204).end()
  })
)
router.use('/contacts', contactRouter)

const reviewRouter = express.Router()
reviewRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const packageId = req.query.packageId
    const rows = packageId
      ? await query(
          'SELECT * FROM reviews WHERE packageId = ? ORDER BY date DESC',
          [packageId]
        )
      : await query('SELECT * FROM reviews ORDER BY date DESC')
    res.json(rows)
  })
)
reviewRouter.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const r = req.body
    const rating = Number(r.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new HttpError(400, 'Rating must be an integer from 1 to 5.')
    if (!r.name) throw new HttpError(400, 'Name is required.')
    const result = await query(
      'INSERT INTO reviews (packageId,userId,name,avatar,rating,comment) VALUES (?,?,?,?,?,?)',
      [
        r.packageId || null,
        req.user.id,
        r.name,
        r.avatar || null,
        rating,
        r.comment || null
      ]
    )
    const rows = await query('SELECT * FROM reviews WHERE id = ?', [
      result.insertId
    ])
    res.status(201).json(rows[0])
  })
)
reviewRouter.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM reviews WHERE id = ?', [
      req.params.id
    ])
    if (!rows.length) throw new HttpError(404, 'Review not found.')
    if (
      Number(rows[0].userId) !== Number(req.user.id) &&
      req.user.role !== 'ADMIN'
    )
      throw new HttpError(403, 'You can only update your own review.')
    const fields = ['name', 'avatar', 'rating', 'comment']
    const payload = {}
    for (const field of fields)
      if (req.body[field] !== undefined) payload[field] = req.body[field]
    if (
      payload.rating !== undefined &&
      (!Number.isInteger(Number(payload.rating)) ||
        Number(payload.rating) < 1 ||
        Number(payload.rating) > 5)
    )
      throw new HttpError(400, 'Rating must be an integer from 1 to 5.')
    const keys = Object.keys(payload)
    if (!keys.length) throw new HttpError(400, 'No supported fields provided.')
    await query(
      `UPDATE reviews SET ${keys
        .map(k => `\`${k}\` = ?`)
        .join(',')} WHERE id = ?`,
      [...keys.map(k => payload[k]), req.params.id]
    )
    res.json(
      (await query('SELECT * FROM reviews WHERE id = ?', [req.params.id]))[0]
    )
  })
)
reviewRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await query('SELECT * FROM reviews WHERE id = ?', [
      req.params.id
    ])
    if (!rows.length) throw new HttpError(404, 'Review not found.')
    if (
      Number(rows[0].userId) !== Number(req.user.id) &&
      req.user.role !== 'ADMIN'
    )
      throw new HttpError(403, 'You can only delete your own review.')
    await query('DELETE FROM reviews WHERE id = ?', [req.params.id])
    res.status(204).end()
  })
)
router.use('/reviews', reviewRouter)

const userRouter = express.Router()
userRouter.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) =>
    res.json(
      await query(
        'SELECT id,name,email,phone,joined,role FROM users ORDER BY id DESC'
      )
    )
  )
)
userRouter.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === Number(req.user.id))
      throw new HttpError(
        400,
        'You cannot delete your own administrator account.'
      )
    const result = await query('DELETE FROM users WHERE id = ?', [
      req.params.id
    ])
    if (!result.affectedRows) throw new HttpError(404, 'User not found.')
    res.status(204).end()
  })
)
router.use('/users', userRouter)
module.exports = router
