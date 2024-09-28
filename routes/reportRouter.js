const express = require("express");
const router = express.Router();
const { reportPost, reportComment, reportReply } = require("../controllers/reportController");
const reportManageController = require("../controllers/reportManageController");
const authenticateToken = require("../middlewares/authenticateToken.js");

// 게시글 신고
router.post("/board/:postId/report", authenticateToken, reportPost);

// 댓글 신고
router.post(
  "/board/:postId/comments/:commentId/report",
  authenticateToken,
  reportComment
);

// 대댓글 신고
router.post(
  "/board/:postId/comments/:commentId/replies/:replyId/report",
  authenticateToken,
  reportReply
);

// 신고 리스트 조회
router.get("/reports", reportManageController.getReports);

// 블라인드 리스트 조회
router.get("/blinded", reportManageController.getBlindedContent);


// 블라인드 해제
router.put("/blinded/:id", reportManageController.unblindContent);



module.exports = router;
