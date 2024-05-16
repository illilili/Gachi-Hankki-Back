const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const router = express.Router();

// Firebase 관련 모듈 import
const { initializeApp } = require("firebase-admin/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase-admin/auth");
const serviceAccount = require('./serviceAccountKey.json');

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
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = admin.firestore(); // Firestore 인스턴스 생성

// 회원가입 엔드포인트
router.post('/signup', async (req, res) => {
  try {
    const { hanbatEmail, password, confirmPassword, name, gender, department, birthdate, purpose, path } = req.body;

    // 필수 필드 유효성 검사
    if (!hanbatEmail || !password || !confirmPassword) {
      return res.status(400).send('한밭대 이메일, 인증번호, 비밀번호, 비밀번호 확인은 필수 입력 사항입니다.');
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      return res.status(400).send('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10); // 비밀번호를 해싱한 후에 저장

    // Firebase Authentication을 사용하여 회원가입
    const userCredential = await createUserWithEmailAndPassword(auth, hanbatEmail, password);
    const user = userCredential.user;

    // 회원가입 성공 시 토큰 발급
    const token = jwt.sign({ userId: user.uid }, 'your_secret_key', { expiresIn: '1h' });

    // 파이어베이스에 추가 정보 저장
    await db.collection('users').doc(user.uid).set({
      name,
      gender,
      department,
      birthdate,
      purpose,
      path
    });

    console.log('Additional information saved for user:', user.uid);
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).send('Error signing up');
  }
});

// 로그인 엔드포인트
router.post('/login', async (req, res) => {
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
router.post('/complete-signup', (req, res) => {
  // 클라이언트로부터 추가 정보를 받아옴
  const { userId, gender } = req.body;

  console.log('Additional information saved for user:', userId);
  res.status(200).send('회원가입이 완료되었습니다.');
});

module.exports = router;
