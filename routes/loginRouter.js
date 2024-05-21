const express = require("express");
const router = express.Router();
<<<<<<< HEAD
const LoginController = require("../controller/LoginController");
const SignupController = require("../controller/SignupController");
=======
const LoginController = require('../controllers/LoginController');
const SignupController = require('../controllers/SignupController');
>>>>>>> 816ea2affe9ba2ac71680f084e3fdf3ea833b83f

router.post("/login", LoginController.login);
router.post("/signup", SignupController.signup);

module.exports = router;

