export function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// SQL Server THROW messages qua tedious driver doi khi bi encode sai (Latin-1 thay vi UTF-8).
function fixEncoding(str) {
  try {
    const fixed = Buffer.from(str, 'latin1').toString('utf8');
    return /\uFFFD/.test(fixed) ? str : fixed;
  } catch {
    return str;
  }
}

// Bỏ tiền tố tên driver mà ODBC/SQL Server gắn vào thông báo, vd. "[Microsoft][ODBC Driver 17 for SQL Server][SQL Server]",
// để người dùng chỉ thấy câu thông báo (D-067).
export function cleanDriverMessage(message) {
  return String(message ?? '').replace(/^\s*(?:\[(?:Microsoft|ODBC[^\]]*|SQL\s*Server|SQLSTATE[^\]]*|msnodesqlv8)\]\s*)+/i, '');
}

export function mapDatabaseError(error, statusMap = {}) {
  if (error && typeof error.number === 'number' && statusMap[error.number]) {
    throw createServiceError(cleanDriverMessage(fixEncoding(error.message)), statusMap[error.number]);
  }

  throw error;
}
