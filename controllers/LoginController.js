const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateHanbatEmail } = require('../utils/validators');
const authenticateToken = require("../middlewares/authenticateToken.js");


const auth = admin.auth();
const db = admin.firestore();


const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '60d';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login request received:', email, password);

    // 한밭대 이메일 형식 확인
    if (!validateHanbatEmail(email)) {
      return res.status(400).send('한밭대 이메일 형식이 잘못되었습니다.');
    }

    if (!email || !password) {
      return res.status(400).send('이메일과 비밀번호를 입력해주세요.');
    }

    // Firebase Authentication에서 사용자 정보를 가져오기
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord) {
      return res.status(400).send('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // Firestore에서 추가 정보를 가져오기
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();

    if (!userData) {
      return res.status(400).send('사용자 정보를 찾을 수 없습니다.');
    }

    // 정지 또는 영구 탈퇴 확인
    if (userData.banned) {
      return res.status(403).send('이 계정은 영구 탈퇴되었습니다.');
    }

    if (userData.suspended) {
      const suspendedUntil = userData.suspendedUntil.toDate(); // Firestore Timestamp -> Date 변환
      const now = new Date();

      if (suspendedUntil > now) {
        const remainingDays = Math.ceil((suspendedUntil - now) / (1000 * 60 * 60 * 24));
        return res.status(403).send(`이 계정은 ${remainingDays}일 동안 정지되었습니다.`);
      }
    }

    // 비밀번호 확인
    const passwordMatch = await bcrypt.compare(password, userData.passwordHash);
    if (!passwordMatch) {
      return res.status(400).send('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 액세스 토큰과 리프레시 토큰 생성
    const accessToken = jwt.sign({ uid: userRecord.uid }, ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ uid: userRecord.uid }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });

    // 리프레시 토큰을 Firestore에 저장
    await db.collection('refreshTokens').doc(userRecord.uid).set({ token: refreshToken });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('로그인 중 오류가 발생했습니다.');
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).send('리프레시 토큰이 필요합니다.');
  }

  try {
    // 리프레시 토큰 유효성 검사
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Firestore에서 리프레시 토큰 확인
    const tokenDoc = await db.collection('refreshTokens').doc(payload.uid).get();
    if (!tokenDoc.exists || tokenDoc.data().token !== refreshToken) {
      return res.status(403).send('유효하지 않은 리프레시 토큰입니다.');
    }

    // 새로운 액세스 토큰 생성
    const newAccessToken = jwt.sign({ uid: payload.uid }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).send('유효하지 않은 리프레시 토큰입니다.');
  }
};

exports.logout = async (req, res) => {
  const { uid } = req.body;

  try {
    // Firestore에서 리프레시 토큰 삭제
    await db.collection('refreshTokens').doc(uid).delete();
    res.status(200).send('로그아웃 되었습니다.');
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).send('로그아웃 중 오류가 발생했습니다.');
  }
};
