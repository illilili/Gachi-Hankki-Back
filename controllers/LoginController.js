const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = admin.auth();
const db = admin.firestore();

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login request received:', email, password);

    // 한밭대 이메일 형식 확인
    if (!validateEmail(email)) {
      return res.status(400).send('한밭대 이메일 형식이 잘못되었습니다.');
    }

    if (!email || !password) {
      return res.status(400).send('이메일과 비밀번호를 입력해주세요.');
    }

    // Firebase Authentication에서 사용자 정보를 가져옵니다.
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord) {
      return res.status(400).send('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // Firestore에서 추가 정보를 가져옵니다.
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    if (!userData) {
      return res.status(400).send('사용자 정보를 찾을 수 없습니다.');
    }

    // 비밀번호 비교
    const isPasswordValid = await bcrypt.compare(password, userData.passwordHash);

    if (!isPasswordValid) {
      return res.status(400).send('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 로그인 성공 시 토큰 발급
    const token = jwt.sign({ userId: userRecord.uid }, 'your_secret_key', { expiresIn: '1h' });

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).send('로그인 중 오류가 발생했습니다.');
  }
};

// 한밭대 이메일 형식 확인 함수를 내보냅니다.
module.exports = {
  validateEmail
};
