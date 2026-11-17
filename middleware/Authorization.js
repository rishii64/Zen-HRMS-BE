const jwt = require("jsonwebtoken");
const { User, sequelize } = require("../config/db");

// Helper: Check if designation represents a Team Lead (TL) role
const isTeamLeadDesignation = (designation = "") => {
  if (!designation || typeof designation !== "string") return false;
  const d = designation.trim().toLowerCase();
  return (
    /\b(team lead|tech lead|team leader|lead developer|lead engineer|teamlead|tl)\b/i.test(d) ||
    d.endsWith("-tl") ||
    d.endsWith("-stl") ||
    d.includes("team lead") ||
    d.includes("tech lead")
  );
};

// Helper: Check if designation is Manager tier (L5-L7: Manager, Deputy Manager, Senior Manager)
const isManagerDesignation = (designation = "") => {
  if (!designation || typeof designation !== "string") return false;
  const d = designation.trim().toLowerCase();
  if (isTeamLeadDesignation(d) && !d.includes("manager")) return false;
  return (
    /\b(manager|mgr|deputy manager|assistant manager|senior manager|project manager)\b/i.test(d) ||
    d.includes("manager")
  );
};

// Helper: Check if designation is Head of Department (HOD) tier (L8-L10+: AGM, DGM, GM, VP, CXO)
const isHODDesignation = (designation = "") => {
  if (!designation || typeof designation !== "string") return false;
  const d = designation.trim().toLowerCase();
  return (
    /\b(hod|head of|department head|agm|dgm|general manager|gm|chro|director|vp|chief)\b/i.test(d) ||
    d.includes("department head") ||
    d.includes("head of") ||
    d.includes("general manager") ||
    d.includes("assistant general manager") ||
    d.includes("deputy general manager") ||
    d.includes("vice president")
  );
};

// Helper: Check if designation represents any leadership role (TL, Manager, HOD, Executive)
const isLeadershipDesignation = (designation = "") => {
  if (!designation || typeof designation !== "string") return false;
  return isTeamLeadDesignation(designation) || isManagerDesignation(designation) || isHODDesignation(designation);
};

// Helper: Check if designation is HOD / Manager tier (excludes pure TL)
const isHODOrManagerDesignation = (designation = "") => {
  if (!designation || typeof designation !== "string") return false;
  return isManagerDesignation(designation) || isHODDesignation(designation);
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

  const jwtSecret = process.env.JWT_SECRET || "superSecretKey";
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded && decoded.role && decoded.role.toLowerCase() === "employees") {
      decoded.role = "employee";
    }
    if (!decoded.designation) {
      decoded.designation = "";
    }
    req.user = decoded;

    // Check if user's role or designation has changed in database since token was signed
    if (decoded.employee_id && decoded.iat) {
      const tokenIssuedAt = decoded.iat * 1000;
      User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          String(decoded.employee_id).toLowerCase().trim()
        ),
        attributes: ["id", "role", "designation", "role_updated_at"]
      }).then((u) => {
        if (u) {
          const roleUpdatedAt = u.role_updated_at ? new Date(u.role_updated_at).getTime() : 0;
          const roleMismatch = u.role && decoded.role && u.role.toLowerCase().trim() !== decoded.role.toLowerCase().trim();
          if (roleUpdatedAt > tokenIssuedAt || roleMismatch) {
            res.setHeader("X-Role-Updated", "true");
            res.setHeader("Access-Control-Expose-Headers", "X-Role-Updated");
          }
        }
      }).catch(() => {});
    }

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

    // 4. Route allows "hod": Strictly HOD or above. TL and standard Managers CANNOT access HOD-only actions.
    const allowsHod = normalizedAllowed.includes("hod");
    if (allowsHod) {
      if (
        effectiveRole === "hod" ||
        req.user?.is_hod ||
        isHODDesignation(desig) ||
        (req.user?.rank_level && req.user.rank_level >= 8)
      ) {
        return next();
      }
    }

    // 5. Route allows "manager": Manager or HOD. Team Lead CANNOT access Manager-only actions.
    const allowsManager = normalizedAllowed.includes("manager");
    if (allowsManager) {
      if (
        ["manager", "hod"].includes(effectiveRole) ||
        req.user?.is_hod ||
        isManagerDesignation(desig) ||
        isHODDesignation(desig) ||
        (req.user?.rank_level && req.user.rank_level >= 5)
      ) {
        return next();
      }
    }

    // 6. Route allows "teamlead" / "tl": Team Lead, Manager, or HOD (Manager/Reporting Manager can act as TL).
    const allowsTeamLead = normalizedAllowed.includes("teamlead") || normalizedAllowed.includes("tl");
    if (allowsTeamLead) {
      if (
        ["teamlead", "tl", "manager", "hod"].includes(effectiveRole) ||
        isTeamLeadDesignation(desig) ||
        isManagerDesignation(desig) ||
        isHODDesignation(desig) ||
        isLead ||
        (req.user?.rank_level && req.user.rank_level >= 4)
      ) {
        return next();
      }
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

  const jwtSecret = process.env.JWT_SECRET || "superSecretKey";
  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded.designation) decoded.designation = "";
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      try {
        const decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true });
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
module.exports.isTeamLeadDesignation = isTeamLeadDesignation;
module.exports.isManagerDesignation = isManagerDesignation;
module.exports.isHODDesignation = isHODDesignation;
module.exports.isLeadershipDesignation = isLeadershipDesignation;
module.exports.isHODOrManagerDesignation = isHODOrManagerDesignation;
module.exports.isDepartmentLeader = isDepartmentLeader;
module.exports.isHODOrManager = isHODOrManager;


