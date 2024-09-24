const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticateToken = require('../middlewares/authenticateToken');

// POST 쪽지방 생성하기 (인증)
router.post('/rooms', authenticateToken, chatController.createRoom);

// POST 요청: 메시지 추가하기 
router.post('/rooms/:roomId/messages', chatController.addMessage);

// GET 사용자의 쪽지방 목록 가져오기 (인증)
router.get('/rooms', authenticateToken, chatController.getRooms);

// GET 특정 방의 메시지 전체 가져오기
router.get('/rooms/:roomId/messages', chatController.getMessages); 

// DELETE 요청: 쪽지방 삭제하기 
router.delete('/rooms/:roomId', chatController.deleteRoom);

module.exports = router;
