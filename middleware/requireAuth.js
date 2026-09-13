const { verifyToken } = require('../lib/jwt');

/**
 * Wraps an API route handler and enforces JWT authentication.
 * On success, attaches req.userId, req.storeId, and req.role.
 */
function requireAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.userId = decoded.userId;
    req.storeId = decoded.storeId;
    req.role = decoded.role;

    return handler(req, res);
  };
}

module.exports = requireAuth;
