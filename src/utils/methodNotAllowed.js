const AppError = require('./AppError');

module.exports = (...allowedMethods) => (req, res, next) => {
  res.set('Allow', allowedMethods.join(', '));
  next(new AppError(`Method ${req.method} not allowed on ${req.originalUrl}`, 405));
};
