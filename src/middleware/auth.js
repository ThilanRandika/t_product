const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

/**
 * Middleware that validates a JWT by calling the User Auth Service's /auth/verify endpoint.
 * This demonstrates inter-service communication: product-service → user-service.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  try {
    const response = await axios.get(`${USER_SERVICE_URL}/auth/verify`, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });

    req.user = response.data.user;
    next();
  } catch (err) {
    if (err.response) {
      return res.status(401).json({ error: 'Invalid or expired token', detail: err.response.data?.error });
    }
    // User service is down or unreachable
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
