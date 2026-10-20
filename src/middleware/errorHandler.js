function notFound(req, res) {
  res.status(404).json({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: `Route ${req.method} ${req.originalUrl} was not found` });
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number(err.status || err.statusCode || 500);
  if (status >= 500) console.error(err);
  res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: status >= 500 ? 'Internal Server Error' : (status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Bad Request'),
    message: status >= 500 ? 'An unexpected server error occurred.' : err.message,
    ...(err.details ? { details: err.details } : {})
  });
}
module.exports = { notFound, errorHandler };
