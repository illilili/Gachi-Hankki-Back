const express = require("express");
const router = express.Router();
const multer = require("multer");
const postController = require("../controllers/postController");
const commentsRouter = require("./commentsRouter"); // 댓글 라우터 가져오기

// Multer 설정 (이미지)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 파일 크기 제한 (5MB)
  },
});

// 게시글 작성
router.post("/", upload.single("image"), postController.createPost);

// 게시글 목록 조회
router.get("/", postController.getAllPosts);

// 게시글 조회
router.get("/:id", postController.getPostById);

// 게시글 수정
router.put("/:id", postController.updatePost);

// 게시글 삭제
router.delete("/:id", postController.deletePost);

// 댓글 라우터
router.use("/:postId/comments", commentsRouter);

module.exports = router;
