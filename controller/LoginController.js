const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = admin.auth();
const db = admin.firestore();

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Firebase Authentication을 사용하여 이메일로 사용자 조회
    const userRecord = await auth.getUserByEmail(email);

    // 데이터베이스에서 사용자 정보 가져오기
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    if (!userDoc.exists) {
      return res.status(401).send('Invalid email or password');
    }

    const userData = userDoc.data();

    // 비밀번호 검증
    const passwordMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!passwordMatch) {
      return res.status(401).send('Invalid email or password');
    }

    // 로그인 성공 시 토큰 발급
    const token = jwt.sign({ userId: userRecord.uid }, 'your_secret_key', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(401).send('Invalid email or password');
  }
};

