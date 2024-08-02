const express = require("express");
const router = express.Router();
const ProfileController = require("../controllers/ProfileController");

// 프로필 생성 라우트
router.post("/:userId", ProfileController.createProfile);

// 프로필 조회 라우트
router.get("/:userId", ProfileController.getProfile);

module.exports = router;
