const express = require('express');
const router = express.Router();
const LoginController = require('./LoginController');
const SignupController = require('./SignupController');

router.post('/login', LoginController.login);
router.post('/signup', SignupController.signup);

module.exports = router;
