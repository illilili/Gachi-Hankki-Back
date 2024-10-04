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



// 신고된 사용자 리스트 조회
router.get("/reports/users", authenticateToken, reportManageController.getReportedUsers);

// 회원 정지 및 탈퇴(관리자용)
router.post("/reports/users/:userId/manage", authenticateToken, reportManageController.manageUserStatus);

// 신고 리스트 조회(관리자용)
router.get("/reports", authenticateToken, reportManageController.getReports);

// 블라인드 리스트 조회(관리자용)
router.get("/reports/blinded", authenticateToken, reportManageController.getBlindedContent);

// 블라인드 해제(관리자용)
router.put("/reports/blinded/:id", authenticateToken, reportManageController.unblindContent);



module.exports = router;
