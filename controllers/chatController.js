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

    const memberKey = [senderNickname, receiverNickname].sort().join("_");

    const roomsRef = realtimeDB.ref('ChatRooms');
    const existingRoomSnapshot = await roomsRef
      .orderByChild('memberKey')
      .equalTo(memberKey)
      .once("value");

    if (existingRoomSnapshot.exists()) {
      const existingRoomData = existingRoomSnapshot.val();
      const existingRoomId = Object.keys(existingRoomData)[0]; 

      return res.status(200).json({
        success: false,
        message: '이미 존재하는 쪽지방입니다.',
        roomId: existingRoomId
      });
    }

    const roomRef = roomsRef.push();
    const roomId = roomRef.key;
    const now = getKoreanTime();

    await roomRef.set({
      roomId: roomId,
      members: [senderNickname, receiverNickname], 
      memberKey: memberKey,  
      lastUpdated: now,
    });

    res.status(201).json({ success: true, message: '1:1 쪽지방이 생성되었습니다.', roomId: roomId });
  } catch (error) {
    console.error("쪽지방 생성 오류:", error);
    res.status(500).json({ success: true, message: '쪽지방 생성 중 오류가 발생했습니다.', details: error.message });
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
      lastMessage: text  
    });

    res.status(201).json({ success: true, message: "메시지가 추가되었습니다." });
  } catch (error) {
    console.error("메시지 추가 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 쪽지방 목록 가져오기
exports.getRooms = async (req, res) => {
  const senderNickname = req.user.nickname; 
  const { lastRoomId } = req.query; 

  try {
    const roomsRef = realtimeDB.ref('ChatRooms');
    let query = roomsRef.orderByKey().limitToFirst(15);

    if (lastRoomId) {
     
      query = roomsRef.orderByKey().startAfter(lastRoomId).limitToFirst(10);
    }

    const snapshot = await query.once("value");

    if (snapshot.exists()) {
      const rooms = snapshot.val();
      const roomList = {};

      for (let roomId in rooms) {
        const room = rooms[roomId];

        if (room && Array.isArray(room.members) && room.members.includes(senderNickname)) {
          roomList[roomId] = {
            roomId: roomId,
            members: room.members,
            lastUpdated: room.lastUpdated ? new Date(room.lastUpdated).toISOString().replace('T', ' ').split('.')[0] : "",
            lastMessage: room.lastMessage || ""
          };
        }
      }

      const lastFetchedRoomId = Object.keys(rooms).pop(); 

      res.status(200).json({ 
        success: true, 
        rooms: roomList, 
        lastRoomId: lastFetchedRoomId 
      });
    } else {
      res.status(200).json({ success: true, rooms: [], lastRoomId: null });
    }
  } catch (error) {
    console.error("쪽지방 목록 가져오기 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 특정 방 메시지 전체 가져오기 
exports.getMessages = async (req, res) => {
  const roomId = req.params.roomId;
  const { lastMessageKey } = req.query; 
  if (!roomId) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId가 필요합니다.' });
  }

  try {
    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}/messages`);
    let query = roomRef.orderByKey().limitToLast(15);  

    if (lastMessageKey) {
      query = roomRef.orderByKey().endBefore(lastMessageKey).limitToLast(15);
    }

    const snapshot = await query.once("value");

    if (snapshot.exists()) {
      const messages = snapshot.val();
      const lastFetchedMessageKey = Object.keys(messages).shift();  

      for (let key in messages) {
        if (messages[key].timestamp) {
          const timestamp = messages[key].timestamp;
          messages[key].timestamp = new Date(timestamp).toISOString().replace('T', ' ').split('.')[0];
        }
      }

      res.status(200).json({
        success: true,
        messages: messages,
        lastMessageKey: lastFetchedMessageKey  
      });
    } else {
      res.status(200).json({ success: true, messages: [], lastMessageKey: null });
    }
  } catch (error) {
    console.error("메시지 가져오기 오류:", error);
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
