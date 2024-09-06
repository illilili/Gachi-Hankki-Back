const admin = require("firebase-admin");
const db = admin.database();

// 쪽지방 생성 함수
exports.createRoom = async (req, res) => {
  const { members } = req.body; 

  try {
    const roomRef = db.ref('ChatRooms').push(); 
    const roomId = roomRef.key; // 방 ID

    // 방 정보 저장
    await roomRef.set({
      roomId,
      members,
      lastMessage: '',
      lastUpdated: admin.database.ServerValue.TIMESTAMP,
    });

    res.status(201).json({ success: true, message: "쪽지방이 생성되었습니다.", roomId });
  } catch (error) {
    console.error("쪽지방 생성 오류:", error);
    res.status(500).json({ success: false, message: "쪽지방 생성 중 오류가 발생했습니다.", details: error.message });
  }
};

// 특정 방의 메시지 가져오기
exports.getMessages = async (req, res) => {
  const roomId = req.params.roomId;

  try {
    const messagesRef = db.ref(`ChatRooms/${roomId}/messages`);
    const snapshot = await messagesRef.once("value"); 

    if (snapshot.exists()) {
      const messages = snapshot.val();
      res.status(200).json({ success: true, messages: messages });
    } else {
      res.status(404).json({ success: false, message: "메시지가 없습니다." });
    }
  } catch (error) {
    console.error("메시지 가져오기 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 메시지 추가하기
exports.addMessage = async (req, res) => {
  const roomId = req.params.roomId; 
  const newMessage = req.body.message; 

  try {
    const messagesRef = db.ref(`ChatRooms/${roomId}/messages`);
    const newMessageRef = messagesRef.push(); 
    await newMessageRef.set(newMessage); 

    res.status(201).json({ success: true, message: "메시지가 추가되었습니다." });
  } catch (error) {
    console.error("메시지 추가 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 쪽지방 삭제 함수
exports.deleteRoom = async (req, res) => {
  const roomId = req.params.roomId; 

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
