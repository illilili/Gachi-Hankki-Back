const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const multer = require("multer"); // multer 모듈 추가
const authMiddleware = require("../middleware/authMiddleware"); // authMiddleware 추가

const db = admin.firestore(); // Firestore에 접근하는 부분을 라우터의 밖으로 이동

// Multer 설정 (이미지)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 파일 크기 제한 (5MB)
  },
});

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

// 게시글 작성 (이미지 업로드 기능 추가)
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { title, content } = req.body;
    const user = req.user;

    // 이미지 업로드 확인
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "이미지를 업로드하세요." });
    }

    // 이미지를 Firebase Storage에 업로드
    const bucket = admin.storage().bucket();
    const fileName = `${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on("error", (error) => {
      res.status(500).json({ error: "이미지 업로드 중 오류가 발생했습니다." });
    });

    stream.on("finish", async () => {
      // 이미지 URL 생성
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;

      // 게시글 데이터 작성
      const post = {
        title,
        content,
        imageUrl, // 이미지 URL 추가
        author: {
          uid: user.uid,
          name: user.displayName || "익명",
        },
        createdAt: new Date().toISOString(),
      };

      // Firestore에 게시글 추가
      const docRef = await db.collection("posts").add(post);
      const postId = docRef.id;
      res
        .status(201)
        .json({ message: "게시글이 작성되었습니다.", postId: postId });
    });

    // 파일 스트림을 업로드 스트림으로 파이프
    stream.end(req.file.buffer);
  } catch (error) {
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
