const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { User } = require("./db");

// ---------- JWT ----------
let SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("SECRET_KEY must be set in production");
  }
  SECRET_KEY = crypto.randomBytes(32).toString("hex");
  console.warn("SECRET_KEY not set: using a temporary key, sessions reset on restart.");
}

const signToken = (user) =>
  jwt.sign({ userId: user.id }, SECRET_KEY, { algorithm: "HS256", expiresIn: "24h" });

// ---------- Errors ----------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Lets async route handlers throw instead of wrapping everything in try/catch.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.name === "MulterError") return res.status(400).json({ error: err.message });
  // Malformed or oversized request bodies (raised by express.json) are the client's fault.
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request body" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
};

// ---------- Input helpers ----------
/** Trimmed string capped at `max` characters; non-strings become "". */
const clip = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Positive integer from a route/body param, or 404 so bad ids never reach the DB. */
const parseId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, "Not found");
  return id;
};

// ---------- Auth ----------
const userFromRequest = async (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Authentication required");
  let payload;
  try {
    payload = jwt.verify(header.slice(7), SECRET_KEY, { algorithms: ["HS256"] });
  } catch (err) {
    throw new HttpError(401, err.name === "TokenExpiredError" ? "Session expired" : "Invalid token");
  }
  const user = await User.findByPk(payload.userId);
  if (!user) throw new HttpError(401, "User not found");
  return user;
};

/** Requires a valid Bearer token; sets req.user. */
const authMiddleware = asyncHandler(async (req, res, next) => {
  req.user = await userFromRequest(req);
  next();
});

/** Sets req.user when a valid token is present, otherwise continues anonymously. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  if (req.headers.authorization) {
    try {
      req.user = await userFromRequest(req);
    } catch {
      req.user = null;
    }
  }
  next();
});

// ---------- Rate limits (per server instance) ----------
const limiter = (windowMinutes, max, message, keyGenerator) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    ...(keyGenerator && { keyGenerator }),
  });

const authLimiter = limiter(15, 20, "Too many attempts, try again in a few minutes");
const uploadLimiter = limiter(60, 15, "Upload limit reached, try again later");
// Keyed by user id: used after authMiddleware, so the handoff code can't be brute-forced.
const verifyLimiter = limiter(15, 10, "Too many verification attempts", (req) => `user:${req.user.id}`);

module.exports = {
  HttpError,
  clip,
  parseId,
  asyncHandler,
  errorHandler,
  signToken,
  authMiddleware,
  optionalAuth,
  authLimiter,
  uploadLimiter,
  verifyLimiter,
};
