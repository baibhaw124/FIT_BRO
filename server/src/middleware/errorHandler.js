
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "API endpoint not found",
    },
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) ? err.status : 500;

  if (status >= 500) {
    console.error(err.message);
  }

  res.status(status).json({
    success: false,
    error: {
      code: err.code || (status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
      message: status >= 500 ? "Internal server error" : err.message,
    },
  });
}
