const express = require("express");
const bodyParser = require("body-parser");
const app = express();

var admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://hanbat-capstone-d4979-default-rtdb.asia-southeast1.firebasedatabase.app",
});

// 미들웨어 설정
app.use(bodyParser.json());

// 라우트 예시
app.get("/", (req, res) => {
  res.send("성공!");
});

// 게시판 라우트를 분리한 파일을 추가
const boardRouter = require("./routes/boardRouter.js");
app.use("/board", boardRouter);

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
