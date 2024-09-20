const admin = require("firebase-admin");
const realtimeDB = admin.database(); 
const firestoreDB = admin.firestore(); 

const getKoreanTime = () => {
  const date = new Date();
  const offsetInMillis = 9 * 60 * 60 * 1000;
  const koreanTime = new Date(date.getTime() + offsetInMillis);
  return koreanTime.toISOString().replace('T', ' ').split('.')[0];
};

// Firebase 인증 미들웨어 
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '엑세스 토큰이 필요합니다.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next(); 
  } catch (error) {
    return res.status(403).json({ success: false, message: '엑세스 토큰이 유효하지 않습니다.' });
  }
};

// 1:1 쪽지방 생성
exports.createRoom = async (req, res) => {
  const { receiverNickname } = req.body; 
  const senderNickname = req.user.nickname; 

  if (!senderNickname || !receiverNickname) {
    return res.status(400).json({ success: false, message: '발신자와 수신자 닉네임이 필요합니다.' });
  }

  try {
    const userSnapshot = await firestoreDB.collection('userProfile')
      .where('nickname', '==', receiverNickname)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ success: false, message: '수신자 닉네임이 유효하지 않습니다. 회원가입된 사용자가 아닙니다.' });
    }

    const roomRef = realtimeDB.ref('ChatRooms').push();
    const roomId = roomRef.key;
    const now = getKoreanTime();

    await roomRef.set({
      roomId: roomId,
      members: [senderNickname, receiverNickname], 
      lastUpdated: now,
    });

    res.status(201).json({ success: true, message: '1:1 쪽지방이 생성되었습니다.', roomId: roomId });
  } catch (error) {
    console.error("쪽지방 생성 오류:", error);
    res.status(500).json({ success: false, message: '쪽지방 생성 중 오류가 발생했습니다.', details: error.message });
  }
};

// 특정 방 메시지 전체 가져오기
exports.getMessages = async (req, res) => {
  const roomId = req.params.roomId;

  if (!roomId) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId가 필요합니다.' });
  }

  try {
    const messagesRef = realtimeDB.ref(`ChatRooms/${roomId}/messages`);
    const snapshot = await messagesRef.once("value");

    if (snapshot.exists()) {
      const messages = snapshot.val();

      for (let key in messages) {
        if (messages[key].timestamp) {
          const timestamp = messages[key].timestamp;
          messages[key].timestamp = new Date(timestamp).toISOString().replace('T', ' ').split('.')[0];
        }
      }

      res.status(200).json({ success: true, messages: messages });
    } else {
      res.status(200).json({ success: true, messages: [] });
    }
  } catch (error) {
    console.error("메시지 가져오기 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 메시지 추가하기
exports.addMessage = async (req, res) => {
  const roomId = req.params.roomId;
  const { senderNickname, text } = req.body; 

  if (!roomId || !senderNickname || !text) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId, senderNickname, text가 필요합니다.' });
  }

  const now = getKoreanTime();

  try {
    const messagesRef = realtimeDB.ref(`ChatRooms/${roomId}/messages`);
    const newMessageRef = messagesRef.push();

    await newMessageRef.set({
      sender: senderNickname, 
      text: text,
      timestamp: now,
    });

    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}`);
    await roomRef.update({
      lastUpdated: now,
    });

    res.status(201).json({ success: true, message: "메시지가 추가되었습니다." });
  } catch (error) {
    console.error("메시지 추가 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 쪽지방 삭제하기
exports.deleteRoom = async (req, res) => {
  const roomId = req.params.roomId;

  if (!roomId) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId가 필요합니다.' });
  }

  try {
    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}`);

    await roomRef.child('messages').remove();
    await roomRef.remove();

    res.status(200).json({ success: true, message: '쪽지방이 삭제되었습니다.' });
  } catch (error) {
    console.error("쪽지방 삭제 오류:", error);
    res.status(500).json({ success: false, message: '쪽지방 삭제 중 오류가 발생했습니다.', details: error.message });
  }
};

// 쪽지방 목록 가져오기
exports.getRooms = async (req, res) => {
  try {
    const roomsRef = realtimeDB.ref('ChatRooms');
    const snapshot = await roomsRef.once("value");

    if (snapshot.exists()) {
      const rooms = snapshot.val();

      const roomList = {};
      for (let roomId in rooms) {
        roomList[roomId] = {
          roomId: roomId,
          members: rooms[roomId].members,
          lastUpdated: rooms[roomId].lastUpdated ? new Date(rooms[roomId].lastUpdated).toISOString().replace('T', ' ').split('.')[0] : "",
          lastMessage: rooms[roomId].lastMessage || ""
        };
      }

      res.status(200).json({ success: true, rooms: roomList });
    } else {
      res.status(200).json({ success: true, rooms: [] });
    }
  } catch (error) {
    console.error("쪽지방 목록 가져오기 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};
