const express = require("express");
const router = express.Router();
const LoginController = require("../controllers/LoginController");
const SignupController = require("../controllers/SignupController");

router.post("/login", LoginController.login);
router.post("/signup", SignupController.signup);

module.exports = router;
