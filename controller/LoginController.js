const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const { signInWithEmailAndPassword } = require("firebase-admin/auth");

// Firebase 앱 초기화
const firebaseConfig = {
  apiKey: "AIzaSyDVOW_tka935YrTMqwm70Gl-4lS1YUU9g8",
  authDomain: "hanbat-capstone-d4979.firebaseapp.com",
  databaseURL:
    "https://hanbat-capstone-d4979-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hanbat-capstone-d4979",
  storageBucket: "hanbat-capstone-d4979.appspot.com",
  messagingSenderId: "161505895450",
  appId: "1:161505895450:web:fe658dcb1756204a52dda3",
  measurementId: "G-XXLVKW595N",
};

const firebaseApp = admin.initializeApp(firebaseConfig);
const auth = admin.auth();

// 로그인 핸들러
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Firebase Authentication을 사용하여 로그인
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // 로그인 성공 시 토큰 발급
    const token = jwt.sign({ userId: user.uid }, "your_secret_key", {
      expiresIn: "1h",
    });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(401).send("Invalid email or password");
  }
};
