const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = admin.auth();
const db = admin.firestore();

exports.signup = async (req, res) => {
  try {
    const { email, password, confirmPassword, name, gender, department, birthdate, purpose, path } = req.body;

    // 필수 필드 유효성 검사
    if (!email || !password || !confirmPassword) {
      return res.status(400).send('한밭대 이메일, 비밀번호, 비밀번호 확인은 필수 입력 사항입니다.');
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      return res.status(400).send('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // Firebase Authentication을 사용하여 회원가입
    const userRecord = await auth.createUser({
      email: email,
      password: hashedPassword
    });

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
    res.status(500).send('Error signing up');
  }
};
