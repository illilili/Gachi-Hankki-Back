const express = require('express');
const router = express.Router();
const boardLoginController = require('./boardLoginController');
const boardSignupController = require('./boardSignupController');

router.post('/login', boardLoginController.login);
router.post('/signup', boardSignupController.signup);

module.exports = router;
