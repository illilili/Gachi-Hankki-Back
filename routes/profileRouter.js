const express = require('express');
const { createProfile, getProfile } = require('../controllers/ProfileController');
const authenticateToken = require('../middlewares/authenticateToken'); 

const router = express.Router();

router.post('/', authenticateToken, createProfile);

router.get('/', authenticateToken, getProfile);

module.exports = router;
