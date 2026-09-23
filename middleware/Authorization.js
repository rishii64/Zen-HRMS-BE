const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  let token = req.cookies?.token;

  // Fallback to Authorization header (e.g. Bearer <token>)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// Role-based protection helper
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

// Middleware allowing expired JWT verification for session expiry auto-clockout
const authenticateAllowExpired = (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token && req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        req.user = decoded;
        return next();
      } catch (innerErr) {
        const decoded = jwt.decode(token);
        if (decoded && (decoded.employee_id || decoded.id)) {
          req.user = decoded;
          return next();
        }
      }
    }
    return res.status(401).json({ error: "Invalid token." });
  }
};

// Export authenticate as primary function, with authorizeRoles attached
module.exports = authenticate;
module.exports.authorizeRoles = authorizeRoles;
module.exports.authenticateAllowExpired = authenticateAllowExpired;

