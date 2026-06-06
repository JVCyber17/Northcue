function createHttpError(message, statusCode = 500, code = "server_error") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function getPublicErrorResponse(error) {
  const statusCode = Number(error?.statusCode) || 500;
  const code = error?.code || "server_error";

  if (statusCode === 413 || code === "payload_too_large") {
    return {
      statusCode: 413,
      payload: {
        success: false,
        code: "payload_too_large",
        error: "This file is too large for Northcue right now. Please upload a smaller file."
      }
    };
  }

  if (statusCode === 429 || code === "rate_limited") {
    return {
      statusCode: 429,
      payload: {
        success: false,
        code: "rate_limited",
        error: "Northcue is receiving too many requests from this browser right now. Please wait a moment and try again."
      }
    };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return {
      statusCode,
      payload: {
        success: false,
        code,
        error: error.message || "Please check your request and try again."
      }
    };
  }

  return {
    statusCode: 500,
    payload: {
      success: false,
      code: "server_error",
      error: "Something went wrong. Please try again."
    }
  };
}

module.exports = {
  createHttpError,
  getPublicErrorResponse
};
