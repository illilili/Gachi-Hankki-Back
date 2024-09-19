const express = require('express');
const { createProfile, getProfile, updateProfileImage, updateBio } = require('../controllers/ProfileController');
const authenticateToken = require('../middlewares/authenticateToken'); 

const router = express.Router();

// 프로필 생성
router.post('/', authenticateToken, createProfile);

// 프로필 조회
router.get('/', authenticateToken, getProfile);

// 프로필 이미지 변경 
router.patch('/image', authenticateToken, updateProfileImage);

// 한줄 소개 변경 
router.patch('/bio', authenticateToken, updateBio);

module.exports = router;
