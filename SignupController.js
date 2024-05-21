const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { createUserWithEmailAndPassword } = require("firebase-admin/auth");
const serviceAccount = require('./serviceAccountKey.json');
const firebaseApp = admin.initializeApp(firebaseConfig);
const auth = admin.auth();
const db = admin.firestore(); // Firestore 인스턴스 생성

// 회원가입 핸들러
exports.signup = async (req, res) => {
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
};
