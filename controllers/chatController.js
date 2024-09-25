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

// 1:1 쪽지방 생성 (발신자와 수신자가 같은 방이 있는지 확인)
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

      return res.status(409).json({
        success: false,
        message: '이미 존재하는 쪽지방입니다.',
        roomId: existingRoomId
      });
    }

    // 새로운 방 생성
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
    res.status(500).json({ success: false, message: '쪽지방 생성 중 오류가 발생했습니다.', details: error.message });
  }
};

// 메시지 추가하기
exports.addMessage = async (req, res) => {
  const roomId = req.params.roomId;
  const { senderNickname, text } = req.body; // 발신자 닉네임과 메시지 내용을 Body에서 전달받음

  if (!roomId || !senderNickname || !text) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId, senderNickname, text가 필요합니다.' });
  }

  const now = getKoreanTime();

  try {
    // 새 메시지를 추가
    const messagesRef = realtimeDB.ref(`ChatRooms/${roomId}/messages`);
    const newMessageRef = messagesRef.push();

    await newMessageRef.set({
      sender: senderNickname,
      text: text,
      timestamp: now,
    });

    // 방의 lastUpdated와 lastMessage를 업데이트
    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}`);
    await roomRef.update({
      lastUpdated: now,  // 마지막 업데이트 시간
      lastMessage: text  // 마지막 메시지 업데이트
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

  try {
    const roomsRef = realtimeDB.ref('ChatRooms');
    const snapshot = await roomsRef.once("value");

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
        } else {
          console.log(`방 ${roomId}에 members 필드가 존재하지 않거나 배열이 아닙니다.`);
        }
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

// 특정 방 메시지 전체 가져오기 
exports.getMessages = async (req, res) => {
  const roomId = req.params.roomId;

  if (!roomId) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다. roomId가 필요합니다.' });
  }

  try {
    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}`);
    const roomSnapshot = await roomRef.once("value");

    if (!roomSnapshot.exists()) {
      return res.status(404).json({ success: false, message: '해당 방을 찾을 수 없습니다.' });
    }

    const roomData = roomSnapshot.val();
    const { members } = roomData;

    const senderNickname = members[0]; 
    const receiverNickname = members[1]; 

    const messagesRef = roomRef.child('messages');
    const messagesSnapshot = await messagesRef.once("value");

    let messages = {};
    if (messagesSnapshot.exists()) {
      messages = messagesSnapshot.val();

      for (let key in messages) {
        if (messages[key].timestamp) {
          const timestamp = messages[key].timestamp;
          messages[key].timestamp = new Date(timestamp).toISOString().replace('T', ' ').split('.')[0];
        }
      }
    }

    res.status(200).json({
      success: true,
      messages: messages,
      senderNickname: senderNickname, 
      receiverNickname: receiverNickname 
    });
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

