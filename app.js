require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
var admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
var serviceAccount = require("./serviceAccountKey.json");
const authenticateToken = require("./middlewares/authenticateToken.js");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || "60d";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "hanbat-capstone-d4979.appspot.com",
  databaseURL:
    "https://hanbat-capstone-d4979-default-rtdb.asia-southeast1.firebasedatabase.app",
});

// 미들웨어 설정
app.use(bodyParser.json());

// 라우트 예시
app.get("/", (req, res) => {
  res.send("성공!");
});

// 게시판 라우터
const boardRouter = require("./routes/boardRouter.js");
app.use("/board", boardRouter);

// 이메일 인증 라우터
const emailVerificationRouter = require("./routes/emailVerificationRouter.js");
app.use("/email-verification", emailVerificationRouter);

// 회원가입 라우터
const signupRouter = require("./routes/signupRouter.js");
app.use("/signup", signupRouter);

// 로그인 라우터
const loginRouter = require("./routes/loginRouter.js");
app.use("/", loginRouter);

// 프로필 설정 라우터
const profileRouter = require("./routes/profileRouter.js");
app.use("/profile", profileRouter);

// 쪽지
const chatRouter = require("./routes/chatRouter.js");
app.use("/", chatRouter);

// 신고
const reportRouter = require("./routes/reportRouter.js");
app.use("/", reportRouter);

// 테스트 엔드포인트
app.get("/test", authenticateToken, (req, res) => {
  console.log("User object:", req.user); // 로그 추가
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: "User ID is not found in token." });
  }
  res.json({ message: "Token is valid!", user: req.user });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
