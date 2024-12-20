const admin = require("firebase-admin");
const jwt = require('jsonwebtoken');

// 환경 변수에서 비밀 키를 가져옵니다.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

// 토큰 검증 미들웨어
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("Authorization Header:", authHeader);
  console.log("Extracted Token:", token);

  if (token == null) return res.status(401).send('액세스 토큰이 필요합니다.');

  jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, user) => {
    if (err) {
      console.log("Token Verification Error:", err.message);
      return res.status(403).send('유효하지 않은 액세스 토큰입니다.');
    }

    console.log("Decoded Token User:", user);

    if (!user || !user.uid) {
      return res.status(400).json({ error: '유효한 uid를 포함한 토큰이 필요합니다.' });
    }

    try {
      // Firestore에서 사용자 정보 가져오기
      const userDoc = await admin.firestore().collection("users").doc(user.uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      const userData = userDoc.data();
      const isAdmin = userData.isAdmin || false; // 기본값 false

      let nickname = null;  // nickname을 기본값으로 선언

      // 프로필 생성 전에 프로필 검사 건너뜀
      if (!req.originalUrl.includes('/profile')) {
        const userProfileDoc = await admin.firestore().collection("userProfile").doc(user.uid).get();
        if (!userProfileDoc.exists) {
          console.log("User profile not found for uid:", user.uid);
          return res.status(404).json({ error: "사용자 프로필을 찾을 수 없습니다." });
        }

        const userProfileData = userProfileDoc.data();
        nickname = userProfileData ? userProfileData.nickname : null;

        if (!nickname) {
          console.log("NickName is missing in userProfile");
          return res.status(404).json({ error: "사용자 닉네임을 찾을 수 없습니다." });
        }
      }

      // 사용자 정보를 req.user에 추가
      req.user = { uid: user.uid, isAdmin: isAdmin, nickname: nickname };

      console.log("Verified user:", req.user);

      next(); // 미들웨어 통과
    } catch (error) {
      console.error("Firestore User Fetch Error:", error);
      res.status(500).json({ error: "서버에서 사용자 정보를 가져오는 중 오류가 발생했습니다." });
    }
  });
};

module.exports = authenticateToken;
