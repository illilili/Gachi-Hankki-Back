const express = require("express");
const router = express.Router();
const LoginController = require("../controller/LoginController");
const SignupController = require("../controller/SignupController");

router.post("/login", LoginController.login);
router.post("/signup", SignupController.signup);

module.exports = router;
