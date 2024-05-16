const express = require('express');
const bodyParser = require('body-parser');

const { initializeApp } = require("firebase-admin/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase-admin/auth");
const serviceAccount = require('./serviceAccountKey.json');
const app = express();

var admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://hanbat-capstone-d4979-default-rtdb.asia-southeast1.firebasedatabase.app",
});



const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = admin.firestore(); // Firestore 인스턴스 생성


   


// 라우트 예시
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// 게시판 라우트를 분리한 파일을 추가
const boardRouter = require("./routes/boardRouter.js");
app.use("/board", boardRouter);

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
