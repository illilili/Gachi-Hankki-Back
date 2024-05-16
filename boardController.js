// boardController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase-admin/auth");
const serviceAccount = require('./serviceAccountKey.json');

// Firebase 앱 초기화
const firebaseConfig = {
    apiKey: "your_api_key",
    authDomain: "your_auth_domain",
    // 나머지 firebaseConfig 정보들...
};

const firebaseApp = admin.initializeApp(firebaseConfig);
const auth = admin.auth();
const db = admin.firestore(); // Firestore 인스턴스 생성

// 회원가입 핸들러
exports.signup = async (req, res) => {
  try {
    // 요청에서 필요한 데이터 추출
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
};

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

// 회원가입 정보 완료 핸들러
exports.completeSignup = (req, res) => {
  // 클라이언트로부터 추가 정보를 받아옴
  const { userId, gender } = req.body;

  console.log('Additional information saved for user:', userId);
  res.status(200).send('회원가입이 완료되었습니다.');
};
