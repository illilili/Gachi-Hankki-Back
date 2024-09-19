const admin = require("firebase-admin");
const db = admin.database();

const getKoreanTime = () => {
  const date = new Date();
  
  
  const offsetInMillis = 9 * 60 * 60 * 1000;
  const koreanTime = new Date(date.getTime() + offsetInMillis);
  
  return koreanTime.toISOString().replace('T', ' ').split('.')[0];
};


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
    const roomRef = db.ref('ChatRooms').push();
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

// 특정 방의 메시지 가져오기
exports.getMessages = async (req, res) => {
  const roomId = req.params.roomId;

  // roomId가 없는 경우 400 Bad Request 반환
  if (!roomId) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId가 필요합니다.' });
  }

  try {
    const messagesRef = db.ref(`ChatRooms/${roomId}/messages`);
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
      // 메시지가 없는 경우 빈 배열 반환
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
  const senderNickname = req.user.nickname;
  const { text } = req.body;

  // roomId가 없는 경우 400 Bad Request 반환
  if (!roomId) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId가 필요합니다.' });
  }

  const now = getKoreanTime();

  try {
    const messagesRef = db.ref(`ChatRooms/${roomId}/messages`);
    const newMessageRef = messagesRef.push();

    await newMessageRef.set({
      sender: senderNickname,
      text: text,
      timestamp: now,
    });

    const roomRef = db.ref(`ChatRooms/${roomId}`);
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

  // roomId가 없는 경우 400 Bad Request 반환
  if (!roomId) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId가 필요합니다.' });
  }

  try {
    const roomRef = db.ref(`ChatRooms/${roomId}`);

    // 방의 모든 메시지를 삭제
    await roomRef.child('messages').remove();

    // 방 자체를 삭제
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
    const roomsRef = db.ref('ChatRooms');
    const snapshot = await roomsRef.once("value");

    if (snapshot.exists()) {
      const rooms = snapshot.val();

      for (let key in rooms) {
        if (rooms[key].lastUpdated) {
          const lastUpdated = rooms[key].lastUpdated;
          rooms[key].lastUpdated = new Date(lastUpdated).toISOString().replace('T', ' ').split('.')[0];
        }
      }

      res.status(200).json({ success: true, rooms: rooms });
    } else {
      res.status(200).json({ success: true, rooms: [] }); 
    }
  } catch (error) {
    console.error("쪽지방 목록 가져오기 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};
