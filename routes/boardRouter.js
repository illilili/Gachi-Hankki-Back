const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// Firebase Admin SDK 초기화
const serviceAccount = require("./path/to/serviceAccountKey.json"); // 서비스 계정 키 경로
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com", // 파이어베이스 프로젝트의 데이터베이스 URL
});

// Firebase 데이터베이스에 접근
const db = admin.firestore();

// 게시판 글 목록 가져오기
router.get("/posts", (req, res) => {
  const postsRef = db.collection("posts");

  postsRef
    .get()
    .then((snapshot) => {
      const posts = [];
      snapshot.forEach((doc) => {
        posts.push(doc.data());
      });
      res.json(posts);
    })
    .catch((error) => {
      console.log("Error getting documents:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    });
});

module.exports = router;
