// Catches errors thrown/passed via next(err) anywhere in the app so every
// route can return a consistent JSON error shape instead of an HTML stack trace.
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value for a unique field' });
  }

  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Server error' });
};

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
