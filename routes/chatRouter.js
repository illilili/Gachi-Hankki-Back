const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

// POST 요청: 쪽지방 생성
router.post("/rooms", chatController.createRoom);

// POST 요청: 새로운 메시지 추가하기
router.post("/rooms/:roomId/messages", chatController.addMessage);

// GET 요청: 특정 방의 메시지 가져오기
router.get("/rooms/:roomId/messages", chatController.getMessages);

// DELETE 요청: 쪽지방 삭제
router.delete("/rooms/:roomId", chatController.deleteRoom);

module.exports = router;
