const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  console.log(
    "Auth middleware - Authorization header:",
    req.headers.authorization,
  );
  console.log("Auth middleware - Extracted token:", token);

  if (!token) {
    console.log("Auth middleware - No token provided");
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "your_secret_key";
    console.log("Auth middleware - Using JWT_SECRET:", jwtSecret);
    const decoded = jwt.verify(token, jwtSecret);
    console.log("Auth middleware - Token decoded successfully:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Auth middleware - Token verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
