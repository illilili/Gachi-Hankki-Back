const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const { validateHanbatEmail } = require('../utils/validators');

const auth = admin.auth();
const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: 'Gmail', 
  auth: {
    user: '20212061@edu.hanbat.ac.kr', 
    pass: 'jfyp rtpv zrid fbfg' 
  }
});

exports.sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  if (!validateHanbatEmail(email)) {
    return res.status(400).send('유효한 한밭대 이메일 주소를 입력하세요.');
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 인증번호 생성

  // Firestore에 인증번호 저장
  await db.collection('emailVerifications').doc(email).set({
    code: verificationCode,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 이메일로 인증번호 전송
  const mailOptions = {
    from: '"가치한끼" <noreply@edu.hanbat.ac.kr>',
    to: email,
    subject: '한밭대 이메일 인증번호',
    text: `인증번호: ${verificationCode}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).send('이메일 전송 중 오류가 발생했습니다.');
    }
    res.status(200).send('인증번호가 이메일로 전송되었습니다.');
  });
};
