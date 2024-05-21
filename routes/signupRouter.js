const express = require('express');
const router = express.Router();
const SignupController = require('/Users/jo-eunhyeong/Gachi-Hankki-Back-test/controllers/SignupController');

router.post('/signup', SignupController.signup);

module.exports = router;
