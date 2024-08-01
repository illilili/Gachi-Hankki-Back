const express = require('express');
const { sendVerificationCode } = require('../controllers/emailVerificationController');

const router = express.Router();

router.post('/send-code', sendVerificationCode);

module.exports = router;
