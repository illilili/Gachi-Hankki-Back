const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.firestore(); // Firestore에 접근하는 부분을 라우터의 밖으로 이동

// 게시글 목록 조회
router.get("/", async (req, res) => {
  try {
    const postsSnapshot = await db.collection("posts").get();
    console.log("Firestore에서 가져온 데이터:", postsSnapshot.docs);
    const posts = [];
    postsSnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    console.log("게시글 목록 조회 성공:", posts);
    res.json(posts);
  } catch (error) {
    console.error("게시글 목록 조회 오류:", error);
    res.status(500).json({ error: error.message });
  }
});

// 게시글 작성
router.post("/", async (req, res) => {
  try {
    const postData = req.body;
    const docRef = await db.collection("posts").add(postData);
    const postId = docRef.id; // 새로 생성된 문서의 ID 가져오기
    console.log("게시글 작성 성공:", postId);
    res
      .status(201)
      .json({ message: "게시글이 작성되었습니다.", postId: postId }); // 생성된 문서의 ID를 클라이언트에 반환
  } catch (error) {
    console.error("게시글 작성 오류:", error);
    res.status(500).json({ error: error.message });
  }
});

// 게시글 조회
router.get("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const postDoc = await db.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      console.log("게시글 조회 실패: 해당 ID의 게시글이 없습니다."); // 로그 추가
      res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
      return;
    }
    const postData = { id: postDoc.id, ...postDoc.data() };
    console.log("게시글 조회 성공:", postData); // 로그 추가
    res.json(postData);
  } catch (error) {
    console.error("게시글 조회 오류:", error); // 로그 추가
    res.status(500).json({ error: error.message });
  }
});

// 게시글 수정
router.put("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const updateData = req.body;
    await db.collection("posts").doc(postId).update(updateData);
    console.log("게시글 수정 성공:", postId); // 로그 추가
    res.json({ message: "게시글이 수정되었습니다." });
  } catch (error) {
    console.error("게시글 수정 오류:", error); // 로그 추가
    res.status(500).json({ error: error.message });
  }
});

// 게시글 삭제
router.delete("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    await db.collection("posts").doc(postId).delete();
    console.log("게시글 삭제 성공:", postId); // 로그 추가
    res.json({ message: "게시글이 삭제되었습니다." });
  } catch (error) {
    console.error("게시글 삭제 오류:", error); // 로그 추가
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
