// commentsRouter.js
const express = require("express");
const router = express.Router();
const commentsController = require("../controllers/commentsController");

// 댓글 작성
router.post("/", commentsController.addComment);

// 댓글 조회
router.get("/", commentsController.getComments);

module.exports = router;
