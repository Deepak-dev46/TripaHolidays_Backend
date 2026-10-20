const { metrics } = require('@opentelemetry/api')

const meter = metrics.getMeter('tripaholidays-express-api')
const requestCount = meter.createCounter('http.server.request.count', {
  description: 'Number of completed HTTP requests handled by the API.'
})
const requestDuration = meter.createHistogram('http.server.request.duration', {
  description: 'Duration of completed HTTP requests handled by the API.',
  unit: 's'
})

module.exports = function requestMetrics (req, res, next) {
  const start = process.hrtime.bigint()

  res.once('finish', () => {
    const attributes = {
      'http.request.method': req.method,
      'http.route': req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched',
      'http.response.status_code': res.statusCode
    }
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9

    requestCount.add(1, attributes)
    requestDuration.record(durationSeconds, attributes)
  })

  next()
}
