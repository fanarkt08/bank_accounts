const AppError = require('../utils/AppError');

const handleCastError = (err) => new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateFieldsError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`This ${field} is already in use`, 409);
};

const handleValidationError = (err) => {
  const message = Object.values(err.errors)
    .map((el) => el.message)
    .join('. ');
  return new AppError(message, 400);
};

const handleJsonParseError = () => new AppError('Invalid JSON payload', 400);

const isExposableHttpError = (err) => typeof err.status === 'number' && err.expose === true;

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  if (error.name === 'CastError') error = handleCastError(error);
  if (error.code === 11000) error = handleDuplicateFieldsError(error);
  if (error.name === 'ValidationError') error = handleValidationError(error);
  if (error.type === 'entity.parse.failed') error = handleJsonParseError();
  if (!(error instanceof AppError) && isExposableHttpError(error)) {
    error = new AppError(error.message, error.status);
  }

  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';

  if (!error.isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }

  res.status(statusCode).json({
    status,
    message: error.isOperational ? error.message : 'Something went wrong',
  });
};
