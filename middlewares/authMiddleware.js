import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    // Get token from headers
    const token = req.headers.authorization;
    console.log(token)

    if (!token) {
      return res.status(401).json({ message: "No token, access denied" });
    }

    // token format: Bearer <token>
    const actualToken = token.split(" ")[1];
    console.log(process.env.JWT_SECRET)

    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    // attach user info to request
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default authMiddleware;