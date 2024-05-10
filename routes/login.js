const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Firebase 관련 모듈 import
const { initializeApp } = require("firebase-admin/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase-admin/auth");

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Firebase 앱 초기화
const firebaseConfig = {
  apiKey: "AIzaSyDVOW_tka935YrTMqwm70Gl-4lS1YUU9g8",
  projectId: "hanbat-capstone-d4979"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// 회원가입 엔드포인트
app.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Firebase Authentication을 사용하여 회원가입
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 회원가입 성공 시 토큰 발급
    const token = jwt.sign({ userId: user.uid }, 'your_secret_key', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).send('Error signing up');
  }
});

// 로그인 엔드포인트
app.post('/login', async (req, res) => {
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
});

// 회원가입 정보 완료 엔드포인트
app.post('/complete-signup', (req, res) => {
  // 클라이언트로부터 추가 정보를 받아옴
  const { userId, gender } = req.body;

  console.log('Additional information saved for user:', userId);
  res.status(200).send('회원가입이 완료되었습니다.');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
