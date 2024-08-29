require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '60d';

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

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
