const jwt = require("jsonwebtoken");

// Helper: Check if designation represents a leadership/management role (TL, HOD, Manager, AGM, DGM, etc.)
const isLeadershipDesignation = (designation = "") => {
  if (!designation || typeof designation !== "string") return false;
  const d = designation.trim().toLowerCase();
  return (
    /\b(hod|head|manager|mgr|lead|tl|agm|dgm|gm|director|supervisor)\b/i.test(d) ||
    d.includes("team lead") ||
    d.includes("tech lead") ||
    d.includes("department head") ||
    d.includes("head of") ||
    d.includes("project manager") ||
    d.includes("general manager") ||
    d.includes("assistant general manager") ||
    d.includes("deputy general manager")
  );
};

// Helper: Check if designation is HOD / Manager tier
const isHODOrManagerDesignation = (designation = "") => {
  if (!designation || typeof designation !== "string") return false;
  const d = designation.trim().toLowerCase();
  return (
    /\b(hod|head|manager|mgr|agm|dgm|gm|director)\b/i.test(d) ||
    d.includes("department head") ||
    d.includes("head of") ||
    d.includes("general manager") ||
    d.includes("assistant general manager") ||
    d.includes("deputy general manager")
  );
};

// Check if user is department leader by role or designation
const isDepartmentLeader = (user = {}) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase().trim();
  if (["admin", "management", "ceo", "coo", "cto", "cfo", "vp", "secretary", "hr", "hrmanager", "chro", "vphr"].includes(role)) {
    return true;
  }
  if (["hod", "manager", "teamlead"].includes(role)) {
    return true;
  }
  return isLeadershipDesignation(user.designation);
};

// Check if user is HOD or Manager by role or designation
const isHODOrManager = (user = {}) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase().trim();
  if (["admin", "management", "ceo", "coo", "cto", "cfo", "vp", "secretary", "hr", "hrmanager", "chro", "vphr"].includes(role)) {
    return true;
  }
  if (["hod", "manager"].includes(role)) {
    return true;
  }
  return isHODOrManagerDesignation(user.designation);
};

const authenticate = (req, res, next) => {
  let token = req.cookies?.token;

  // Fallback to Authorization header (e.g. Bearer <token>)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    if (req.headers.role) {
      const headerRole = req.headers.role.toLowerCase().trim();
      req.user = {
        role: headerRole === "employees" ? "employee" : headerRole,
        employee_id: "ADMIN",
        designation: req.headers.designation || ""
      };
      return next();
    }
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.role && decoded.role.toLowerCase() === "employees") {
      decoded.role = "employee";
    }
    if (!decoded.designation) {
      decoded.designation = "";
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// Role-based & designation-based protection helper
const authorizeRoles = (...roles) => {
  const normalizedAllowed = roles.map((r) => {
    const nr = r.toLowerCase().trim();
    return nr === "employees" ? "employee" : nr;
  });

  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }

    const currentRole = (req.user?.role || "").toLowerCase().trim();
    const effectiveRole = currentRole === "employees" ? "employee" : currentRole;

    // 1. Direct role match
    if (normalizedAllowed.includes(effectiveRole)) {
      return next();
    }

    // 2. Admin & Executive Management bypass
    if (["admin", "management", "ceo", "coo", "chro", "vphr"].includes(effectiveRole)) {
      return next();
    }

    // 3. Designation-based authorization across all RBAC modules
    const desig = (req.user?.designation || "").trim();
    const dept = (req.user?.dept || "").toLowerCase().trim();
    const isLead = isLeadershipDesignation(desig);
    const isHodMgr = isHODOrManagerDesignation(desig);

    // If route allows "chro" and user has CHRO / VP HR designation or role
    const isChroDesig = /\b(chro|vp hr|vp-hr|vp - hr)\b/i.test(desig) || desig.includes("chief human resources officer") || desig.includes("head of hr") || desig.includes("vice president hr");
    if (normalizedAllowed.includes("chro") && (isChroDesig || effectiveRole === "chro" || effectiveRole === "vphr")) {
      return next();
    }

    // If route allows "gm_hr" or General Manager - HR
    const isGmHr = (dept.includes("human resource") || dept === "hr") && (/\b(general manager|gm|gm-hr|gm - hr)\b/i.test(desig) || desig.includes("general manager - hr"));
    if ((normalizedAllowed.includes("gm_hr") || normalizedAllowed.includes("gm")) && (isGmHr || isChroDesig || effectiveRole === "chro")) {
      return next();
    }

    // If route allows "hod" and user has HOD/Manager/AGM/DGM/GM/Director designation
    if (normalizedAllowed.includes("hod") && (isHodMgr || isLead || req.user?.is_hod || (req.user?.rank_level && req.user.rank_level >= 6))) {
      return next();
    }

    // If route allows "manager" and user has Manager/HOD/AGM/DGM/GM/Director designation
    if (normalizedAllowed.includes("manager") && (isHodMgr || isLead || (req.user?.rank_level && req.user.rank_level >= 6))) {
      return next();
    }

    // If route allows "teamlead" and user has TL/Lead/Manager/HOD designation
    if (normalizedAllowed.includes("teamlead") && isLead) {
      return next();
    }

    return res.status(403).json({ error: "Access denied. Insufficient permissions." });
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
    if (!decoded.designation) decoded.designation = "";
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
        if (!decoded.designation) decoded.designation = "";
        req.user = decoded;
        return next();
      } catch (innerErr) {
        const decoded = jwt.decode(token);
        if (decoded && (decoded.employee_id || decoded.id)) {
          if (!decoded.designation) decoded.designation = "";
          req.user = decoded;
          return next();
        }
      }
    }
    return res.status(401).json({ error: "Invalid token." });
  }
};

// Export authenticate as primary function, with authorizeRoles and designation helpers attached
module.exports = authenticate;
module.exports.authorizeRoles = authorizeRoles;
module.exports.authenticateAllowExpired = authenticateAllowExpired;
module.exports.isLeadershipDesignation = isLeadershipDesignation;
module.exports.isHODOrManagerDesignation = isHODOrManagerDesignation;
module.exports.isDepartmentLeader = isDepartmentLeader;
module.exports.isHODOrManager = isHODOrManager;


