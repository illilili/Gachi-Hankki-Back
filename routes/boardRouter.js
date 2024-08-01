const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const multer = require("multer");

const db = admin.firestore(); // Firestore에 접근하는 부분을 라우터의 밖으로 이동

// Multer 설정 (이미지)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 파일 크기 제한 (5MB)
  },
});

// 게시글 작성 (이미지 업로드 기능 추가)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, content } = req.body;
    const file = req.file;
    const bucket = admin.storage().bucket();
    let imageUrl = null;

    // 이미지가 포함된 경우 Firebase Storage에 업로드
    if (file) {
      const fileName = `${Date.now()}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      stream.on("error", (error) => {
        res
          .status(500)
          .json({ error: "이미지 업로드 중 오류가 발생했습니다." });
      });

      stream.on("finish", () => {
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
        // 게시글 데이터 작성
        const post = {
          title,
          content,
          imageUrl, // 이미지 URL 추가
          createdAt: new Date().toISOString(),
        };

        // Firestore에 게시글 추가
        db.collection("posts")
          .add(post)
          .then((docRef) => {
            res
              .status(201)
              .json({ message: "게시글이 작성되었습니다.", postId: docRef.id });
          })
          .catch((error) => {
            res.status(500).json({ error: error.message });
          });
      });

      // 파일 스트림을 업로드 스트림으로 파이프
      stream.end(file.buffer);
    } else {
      // 이미지가 포함되지 않은 경우
      const post = {
        title,
        content,
        createdAt: new Date().toISOString(),
      };

      // Firestore에 게시글 추가
      db.collection("posts")
        .add(post)
        .then((docRef) => {
          res
            .status(201)
            .json({ message: "게시글이 작성되었습니다.", postId: docRef.id });
        })
        .catch((error) => {
          res.status(500).json({ error: error.message });
        });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 게시글 목록 조회
router.get("/", async (req, res) => {
  try {
    const postsSnapshot = await db.collection("posts").get();
    const posts = [];
    postsSnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    res.json(posts);
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
      res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
      return;
    }
    const postData = { id: postDoc.id, ...postDoc.data() };
    res.json(postData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 게시글 수정
router.put("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const updateData = req.body;
    await db.collection("posts").doc(postId).update(updateData);
    res.json({ message: "게시글이 수정되었습니다." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 게시글 삭제
router.delete("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    await db.collection("posts").doc(postId).delete();
    res.json({ message: "게시글이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
