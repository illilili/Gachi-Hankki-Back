const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  if (!token) {
    return res.status(401).send("토큰이 필요합니다.");
  }

  try {
    const decoded = jwt.verify(token, "your_secret_key");
    const userRecord = await admin.auth().getUser(decoded.uid);
    req.user = userRecord;
    next();
  } catch (error) {
    console.error("JWT 인증 중 오류 발생:", error);
    res.status(401).send("유효하지 않은 토큰입니다.");
  }
};

module.exports = authMiddleware;
