const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// Firestore 인스턴스 초기화
const db = admin.firestore();
const authenticateToken = require("../middlewares/authenticateToken.js");

// URL 매핑 정의
const profileImageMap = {
  1: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/1.png?alt=media&token=f9346465-c861-40d0-a817-5cbc909204f5',
  2: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/2.png?alt=media&token=26257b4d-2023-4940-a3b5-a429fcabdbb3',
  3: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/3.png?alt=media&token=62c67f33-457d-42da-8ef5-fddf965083d6',
  4: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/4.png?alt=media&token=ca629e4d-e80c-4bd9-8411-a79ab72bb923',
  5: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/5.png?alt=media&token=f72824b2-213d-43ef-adc6-cd3a825eb5cb',
  6: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/6.png?alt=media&token=1b221932-efae-4195-8f98-f8b8dc38035c',
  7: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/7.png?alt=media&token=51224f74-7084-4d7b-828a-e1f26d3ac69a',
  8: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/8.png?alt=media&token=67058fd0-5ea7-48d9-a8ff-3b278a52ff07',
  9: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/9.png?alt=media&token=5c840358-1736-46b0-bc16-d6bff0ff53ea',
  10: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/10.png?alt=media&token=46e6590c-9e6d-4f4e-8411-a79ab72bb923',
  11: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/11.png?alt=media&token=313ce22a-521f-4415-bdd4-fb5d07e550aa',
  12: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/12.png?alt=media&token=ab0175c3-993f-4e6d-baee-37bd3e6ea7b0',
  13: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/13.png?alt=media&token=905897bb-1844-41ea-b483-6dccbeefd2c2',
  14: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/14.png?alt=media&token=7d98a02e-1d55-4123-8e8a-461b7cb023b9',
  15: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/15.png?alt=media&token=7f2eeb23-ca0f-40a0-ad25-55cd94e92c35',
  16: 'https://firebasestorage.googleapis.com/v0/b/hanbat-capstone-d4979.appspot.com/o/16.png?alt=media&token=29d34986-e119-4637-b8f1-825557e4b2f3',
};

// 프로필 생성
exports.createProfile = async (req, res) => {
  try {
    const { uid } = req.user; 
    const { nickname, bio, profileImageUrl, profileImageNumber } = req.body;

    // 닉네임 중복 확인
    const existingProfileQuery = await db.collection('userProfile').where('nickname', '==', nickname).get();
    if (!existingProfileQuery.empty) {
      return res.status(400).json({ message: 'nickname already in use' });
    }

    const userProfile = {
      nickname,
      bio,
      profileImageNumber: 1 
    };

    if (profileImageNumber) {
      userProfile.profileImageNumber = profileImageNumber;
    } else if (profileImageUrl) {
      const foundProfileImageNumber = Object.keys(profileImageMap).find(key => profileImageMap[key] === profileImageUrl);
      if (foundProfileImageNumber) {
        userProfile.profileImageNumber = foundProfileImageNumber;
      } else {
        console.error('Profile image URL not found in map');
        return res.status(400).json({ message: 'Invalid profile image URL' });
      }
    }

    await db.collection('userProfile').doc(uid).set(userProfile);

    console.log('Profile created for user:', uid);
    res.status(201).json({ message: 'Profile created successfully' });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ message: 'Error creating profile' });
  }
};

// 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    console.log("Fetching profile for uid:", uid);

    // userProfile 문서에서 프로필 정보 가져오기
    const userProfileDoc = await db.collection('userProfile').doc(uid).get();
    if (!userProfileDoc.exists) {
      console.log("Profile not found for uid:", uid);
      return res.status(404).json({ message: 'Profile not found' });
    }

    const userProfile = userProfileDoc.data();

    // users 컬렉션에서 학과 정보 가져오기
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      userProfile.department = userData.department; 
    } else {
      console.error("User department not found for uid:", uid);
      return res.status(500).json({ message: 'Error retrievig department information' });
    }

    // 프로필 이미지 설정
    if (userProfile.profileImageNumber) {
      userProfile.profileImageUrl = profileImageMap[userProfile.profileImageNumber];
    }

    console.log('Profile retrieved for user:', uid);
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error retrieving profile:', error);
    res.status(500).json({ message: 'Error retrieving profile' });
  }
};

// 프로필 이미지 변경
exports.updateProfileImage = async (req, res) => {
  try {
    const { uid } = req.user;
    const { profileImageUrl, profileImageNumber } = req.body;

    // 유효한 프로필 이미지 입력이 없을 경우
    if (!profileImageNumber && !profileImageUrl) {
      return res.status(400).json({ message: 'Profile image or image number is required' });
    }

    // 기존 프로필 정보 가져오기
    const userProfileDoc = await db.collection('userProfile').doc(uid).get();
    if (!userProfileDoc.exists) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const updatedProfile = {};

    // 프로필 이미지 업데이트
    if (profileImageNumber) {
      updatedProfile.profileImageNumber = profileImageNumber;
      updatedProfile.profileImageUrl = profileImageMap[profileImageNumber];
    } else if (profileImageUrl) {
      const foundProfileImageNumber = Object.keys(profileImageMap).find(key => profileImageMap[key] === profileImageUrl);
      if (foundProfileImageNumber) {
        updatedProfile.profileImageNumber = foundProfileImageNumber;
        updatedProfile.profileImageUrl = profileImageUrl;
      } else {
        return res.status(400).json({ message: 'Invalid profile image URL' });
      }
    }

    // Firestore에 프로필 이미지 업데이트
    await db.collection('userProfile').doc(uid).update(updatedProfile);

    console.log('Profile image updated for user:', uid);
    res.status(200).json({ message: 'Profile image updated successfully' });
  } catch (error) {
    console.error('Error updating profile image:', error);
    res.status(500).json({ message: 'Error updating profile image' });
  }
};

// 한줄 소개 변경 
exports.updateBio = async (req, res) => {
  try {
    const { uid } = req.user;
    const { bio } = req.body;

    // 유효한 bio 입력이 없을 경우
    if (!bio) {
      return res.status(400).json({ message: 'Bio is required' });
    }

    // 기존 프로필 정보 가져오기
    const userProfileDoc = await db.collection('userProfile').doc(uid).get();
    if (!userProfileDoc.exists) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Firestore에 한줄 소개 업데이트
    await db.collection('userProfile').doc(uid).update({ bio });

    console.log('Bio updated for user:', uid);
    res.status(200).json({ message: 'Bio updated successfully' });
  } catch (error) {
    console.error('Error updating bio:', error);
    res.status(500).json({ message: 'Error updating bio' });
  }
};
