const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middlewares/authenticateToken');

// POST 쪽지방 생성하기 (인증)
router.post('/rooms', authenticateToken, chatController.createRoom);

// POST 요청: 메시지 추가하기 (인증)
router.post('/rooms/:roomId/messages', authenticateToken, chatController.addMessage);

// GET 사용자의 쪽지방 목록 가져오기 (인증)
router.get('/rooms', authenticateToken, chatController.getRooms);

// GET 특정 방의 메시지 전체 가져오기 (인증)
router.get('/rooms/:roomId/messages', authenticateToken, chatController.getMessages);

// DELETE 요청: 쪽지방 삭제하기 (인증)
router.delete('/rooms/:roomId', authenticateToken, chatController.deleteRoom);

// GET 요청: 상대방 프로필 조회하기 (인증)
router.get('/rooms/:roomId/profile', authenticateToken, chatController.getUserProfile);

// 채팅 상대방 신고
router.post('/rooms/:roomId/profile/report', authenticateToken, chatController.reportUser);

module.exports = router;
