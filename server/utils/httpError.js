// Creates an Error carrying an HTTP status code (read by errorMiddleware)
module.exports = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};
