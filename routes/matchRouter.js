const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController.js");
const authenticateToken = require("../middlewares/authenticateToken.js");

// 매칭 필터
router.get(
  "/filter",
  authenticateToken,
  matchController.filterPostsWithPriority
);

// 메뉴 미리보기 및 상대방 정보 확인
router.get(
  "/preview/:postId",
  authenticateToken,
  matchController.previewRestaurant
);

// 매칭 확정
router.post("/match/:postId", authenticateToken, matchController.matchUser);

module.exports = router;
