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

// 블라인드 해제
router.put("/unblind/:commentId", reportManageController.unblindContent);

// 주기적으로 자동 블라인드 처리
setInterval(reportManageController.autoBlindReports, 24 * 60 * 60 * 1000); // 하루마다 실행되도록 해둠,, 나중에 수정


module.exports = router;
