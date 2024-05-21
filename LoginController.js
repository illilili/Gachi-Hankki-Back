const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { signInWithEmailAndPassword } = require("firebase-admin/auth");
const firebaseApp = admin.initializeApp(firebaseConfig);
const auth = admin.auth();

// 로그인 핸들러
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Firebase Authentication을 사용하여 로그인
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 로그인 성공 시 토큰 발급
    const token = jwt.sign({ userId: user.uid }, 'your_secret_key', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(401).send('Invalid email or password');
  }
};
