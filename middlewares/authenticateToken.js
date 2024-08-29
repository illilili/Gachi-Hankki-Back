const jwt = require('jsonwebtoken');

// 환경 변수에서 비밀 키를 가져옵니다.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

// 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  // Authorization 헤더에서 Bearer 토큰을 가져옵니다.
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).send('액세스 토큰이 필요합니다.');

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).send('유효하지 않은 액세스 토큰입니다.');

    // 토큰이 유효하면 req.user에 사용자 정보를 저장합니다.
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
