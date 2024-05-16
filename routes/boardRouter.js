const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

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

// 회원가입 엔드포인트
router.post('/signup', boardController.signup);

// 로그인 엔드포인트
router.post('/login', boardController.login);

// 회원가입 정보 완료 엔드포인트
router.post('/complete-signup', boardController.completeSignup);

module.exports = router;
