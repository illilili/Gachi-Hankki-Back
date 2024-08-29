const express = require('express');
const router = express.Router();
const LoginController = require('../controllers/LoginController');

// 기존 로그인 라우트
router.post('/login', LoginController.login);

// 리프레시 토큰 라우트
router.post('/refresh-token', LoginController.refreshToken);

//로그아웃 라우트
router.post('/logout', LoginController.logout);

module.exports = router;
