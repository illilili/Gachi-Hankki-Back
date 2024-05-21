const express = require('express');
const router = express.Router();
const LoginController = require('/Users/jo-eunhyeong/Gachi-Hankki-Back-test/controllers/LoginController');

router.post('/login', LoginController.login);

module.exports = router;

