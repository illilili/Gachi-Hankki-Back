const express = require("express");
const router = express.Router();
const { reportPost } = require("../controllers/reportController");
const { reportComment } = require("../controllers/reportController");
const authenticateToken = require("../middlewares/authenticateToken.js");

// 게시글 신고
router.post("/board/:postId/report", authenticateToken, reportPost);

// 댓글 신고
router.post(
  "/board/:postId/comments/:commentId/report",
  authenticateToken,
  reportComment
);

module.exports = router;
