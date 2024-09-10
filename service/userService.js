const admin = require("firebase-admin");
const db = admin.firestore();

// 사용자 정보 조회
exports.getUserById = async (userId) => {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }
    return userDoc.data();
  } catch (error) {
    throw new Error(error.message);
  }
};
