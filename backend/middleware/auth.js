const jwt = require("jsonwebtoken");
const { User } = require("../models");

const SECRET_KEY = process.env.SECRET_KEY || "dev_secret_key_change_me";

/**
 * JWT Authentication Middleware.
 * Verifies the Bearer token and attaches `req.user` to the request.
 */
const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token is missing" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired" });
    }
    return res.status(401).json({ message: "Token is invalid" });
  }
};

module.exports = { authMiddleware, SECRET_KEY };
