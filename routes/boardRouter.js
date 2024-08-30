const express = require("express");
const router = express.Router();
const multer = require("multer");
const postController = require("../controllers/postController.js");
const commentsController = require("../controllers/commentsController.js");
const replyController = require("../controllers/replyController.js");
const authenticateToken = require("../middlewares/authenticateToken.js");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    console.log("File field name:", file.fieldname); // 필드 이름 로그
    if (file.fieldname === "image") {
      cb(null, true);
    } else {
      cb(new Error("Unexpected field"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 파일 크기 제한 (10MB)
});


// 게시글 작성
router.post("/", upload.single("image"), authenticateToken, postController.createPost);

// 게시글 목록 조회
router.get("/", postController.getAllPosts);

// 게시글 조회
router.get("/:id", postController.getPostById);

// 게시글 수정
router.put("/:id", authenticateToken, postController.updatePost);

// 게시글 삭제
router.delete("/:id", authenticateToken, postController.deletePost);

// 댓글 관련 라우트
router.post("/:postId/comments", authenticateToken, commentsController.addComment); // 댓글 작성
router.get("/:postId/comments", commentsController.getComments); // 댓글 조회
router.delete("/:postId/comments/:commentId", authenticateToken, commentsController.deleteComment); // 댓글 삭제

// 대댓글 관련 라우트
router.post("/:postId/comments/:commentId/replies", authenticateToken, replyController.addReply); // 대댓글 작성
router.get("/:postId/comments/:commentId/replies", replyController.getReplies); // 대댓글 조회
router.delete("/:postId/comments/:commentId/replies/:replyId", authenticateToken, replyController.deleteReply); // 대댓글 삭제
module.exports = router;
