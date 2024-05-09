const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Middleware 설정
app.use(express.json()); // JSON 파싱 미들웨어 등록
app.use(express.urlencoded({ extended: true })); // URL 인코딩 미들웨어 등록

// 라우트 파일 불러오기
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");

// 라우트 등록
app.use("/auth", authRoutes); // 로그인 관련 라우트
app.use("/posts", postRoutes); // 게시물 관련 라우트

// 서버 시작
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
