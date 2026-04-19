const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const errorMsg = err.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    error: errorMsg
  });
};

module.exports = errorHandler;
