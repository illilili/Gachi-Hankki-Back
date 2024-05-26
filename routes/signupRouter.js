const express = require("express");
const router = express.Router();
const SignupController = require("../controllers/SignupController");

router.post("/", SignupController.signup);

module.exports = router;

