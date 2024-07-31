const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateHanbatEmail } = require('../utils/validators'); 

const auth = admin.auth();
const db = admin.firestore();

exports.signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, verificationCode, name, gender, department, birthdate, purpose, path } = req.body;

    // 필수 필드 유효성 검사
    if (!email || !password || !confirmPassword || !verificationCode) {
      return res.status(400).send('이메일, 비밀번호, 비밀번호 확인, 인증번호는 필수 입력 사항입니다.');
    }

    // 이메일 형식 확인 
    if (!validateHanbatEmail(email)) { 
      return res.status(422).send('한밭대 이메일 주소를 입력하세요.'); 
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      return res.status(422).send('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

    // 인증번호 확인
    const verificationDoc = await db.collection('emailVerifications').doc(email).get();
    if (!verificationDoc.exists || verificationDoc.data().code !== verificationCode) {
      return res.status(401).send('유효하지 않은 인증번호입니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // Firebase Authentication을 사용하여 회원가입
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).send('이미 가입된 이메일입니다.');
      }
      throw error;
    }

    // 회원가입 성공 시 토큰 발급
    const token = jwt.sign({ userId: userRecord.uid }, 'your_secret_key', { expiresIn: '1h' });

    // 파이어베이스에 추가 정보 저장
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      gender,
      department,
      birthdate,
      purpose,
      path,
      passwordHash: hashedPassword
    });

    console.log('Additional information saved for user:', userRecord.uid);
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).send('회원가입 중 오류가 발생했습니다.');
  }
};
