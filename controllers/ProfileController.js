const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const auth = admin.auth();
const db = admin.firestore();

// 프로필 생성
exports.createProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { nickname, bio, profileImageUrl } = req.body;

    // Firestore에 프로필 정보 생성
    const userProfile = {
      nickname,
      bio,
    };

    if (profileImageUrl) {
      userProfile.profileImageUrl = profileImageUrl;
    }

    await db.collection('userProfile').doc(userId).set(userProfile); // 컬렉션 이름 수정

    console.log('Profile created for user:', userId);
    res.status(201).json({ message: 'Profile created successfully' });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).send('Error creating profile');
  }
};

// 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('userProfile').doc(userId).get(); // 컬렉션 이름 수정

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const userProfile = userDoc.data();
    console.log('Profile retrieved for user:', userId);
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error retrieving profile:', error);
    res.status(500).send('Error retrieving profile');
  }
};
