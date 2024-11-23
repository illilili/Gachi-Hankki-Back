const admin = require("firebase-admin");
const realtimeDB = admin.database();
const firestoreDB = admin.firestore();
const authenticateToken = require("../middlewares/authenticateToken.js");

const getKoreanTime = () => {
  const date = new Date();
  const offsetInMillis = 9 * 60 * 60 * 1000;
  const koreanTime = new Date(date.getTime() + offsetInMillis);
  return koreanTime.toISOString().replace("T", " ").split(".")[0];
};

// 1:1 쪽지방 생성
exports.createRoom = async (req, res) => {
  const { receiverNickname } = req.body;
  const senderNickname = req.user.nickname;
  console.log("요청한 사용자 정보:", req.user.nickname);

  if (!senderNickname || !receiverNickname) {
    return res.status(400).json({
      success: false,
      message: "발신자와 수신자 닉네임이 필요합니다.",
    });
  }

  try {
    const userSnapshot = await firestoreDB
      .collection("userProfile")
      .where("nickname", "==", receiverNickname)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message:
          "수신자 닉네임이 유효하지 않습니다. 회원가입된 사용자가 아닙니다.",
      });
    }

    const memberKey = [senderNickname, receiverNickname].sort().join("_");

    const roomsRef = realtimeDB.ref("ChatRooms");
    const existingRoomSnapshot = await roomsRef
      .orderByChild("memberKey")
      .equalTo(memberKey)
      .once("value");

    if (existingRoomSnapshot.exists()) {
      const existingRoomData = existingRoomSnapshot.val();
      const existingRoomId = Object.keys(existingRoomData)[0];

      return res.status(200).json({
        success: true,
        message: "이미 존재하는 쪽지방입니다.",
        roomId: existingRoomId,
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

    res.status(201).json({
      success: true,
      message: "1:1 쪽지방이 생성되었습니다.",
      roomId: roomId,
    });
  } catch (error) {
    console.error("쪽지방 생성 오류:", error);
    res.status(500).json({
      success: true,
      message: "쪽지방 생성 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
};

// 메시지 추가하기
exports.addMessage = async (req, res) => {
  const roomId = req.params.roomId;
  const { senderNickname, text } = req.body;

  if (!roomId || !senderNickname || !text) {
    return res.status(400).json({
      success: false,
      message:
        "유효하지 않은 요청입니다. roomId, senderNickname, text가 필요합니다.",
    });
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
      lastMessage: text,
    });

    res
      .status(201)
      .json({ success: true, message: "메시지가 추가되었습니다." });
  } catch (error) {
    console.error("메시지 추가 오류:", error);
    res
      .status(500)
      .json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 쪽지방 목록 가져오기
exports.getRooms = async (req, res) => {
  const senderNickname = req.user.nickname;
  const { lastRoomId } = req.query;

  try {
    const roomsRef = realtimeDB.ref("ChatRooms");
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

        if (
          room &&
          Array.isArray(room.members) &&
          room.members.includes(senderNickname)
        ) {
          roomList[roomId] = {
            roomId: roomId,
            members: room.members,
            lastUpdated: room.lastUpdated
              ? new Date(room.lastUpdated)
                  .toISOString()
                  .replace("T", " ")
                  .split(".")[0]
              : "",
            lastMessage: room.lastMessage || "",
          };
        }
      }

      const lastFetchedRoomId = Object.keys(rooms).pop();

      res.status(200).json({
        success: true,
        rooms: roomList,
        lastRoomId: lastFetchedRoomId,
      });
    } else {
      res.status(200).json({ success: true, rooms: [], lastRoomId: null });
    }
  } catch (error) {
    console.error("쪽지방 목록 가져오기 오류:", error);
    res
      .status(500)
      .json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 특정 방 메시지 전체 가져오기
exports.getMessages = async (req, res) => {
  const roomId = req.params.roomId;
  const { lastMessageKey } = req.query;
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "유효하지 않은 요청입니다. roomId가 필요합니다.",
    });
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
          messages[key].timestamp = new Date(timestamp)
            .toISOString()
            .replace("T", " ")
            .split(".")[0];
        }
      }

      res.status(200).json({
        success: true,
        messages: messages,
        lastMessageKey: lastFetchedMessageKey,
      });
    } else {
      res
        .status(200)
        .json({ success: true, messages: [], lastMessageKey: null });
    }
  } catch (error) {
    console.error("메시지 가져오기 오류:", error);
    res
      .status(500)
      .json({ success: false, message: "서버 오류가 발생했습니다." });
  }
};

// 쪽지방 삭제하기
exports.deleteRoom = async (req, res) => {
  const roomId = req.params.roomId;

  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "유효하지 않은 요청입니다. roomId가 필요합니다.",
    });
  }

  try {
    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}`);

    await roomRef.child("messages").remove();
    await roomRef.remove();

    res
      .status(200)
      .json({ success: true, message: "쪽지방이 삭제되었습니다." });
  } catch (error) {
    console.error("쪽지방 삭제 오류:", error);
    res.status(500).json({
      success: false,
      message: "쪽지방 삭제 중 오류가 발생했습니다.",
      details: error.message,
    });
  }
};

const db = admin.firestore();

// 상대방 프로필 조회
exports.getUserProfile = async (req, res) => {
  const { roomId } = req.params;
  const senderNickname = req.user.nickname;
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "유효하지 않은 요청입니다. roomId가 필요합니다.",
    });
  }

  try {
    // 방 정보 가져오기
    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}`);
    const roomSnapshot = await roomRef.once("value");

    if (!roomSnapshot.exists()) {
      return res
        .status(404)
        .json({ success: false, message: "쪽지방을 찾을 수 없습니다." });
    }

    const roomData = roomSnapshot.val();
    const receiverNickname = roomData.members.find(
      (member) => member !== senderNickname
    );

    // Firestore에서 상대방 프로필 정보 가져오기 (닉네임으로 uid 찾기)
    const userProfileSnapshot = await firestoreDB
      .collection("userProfile")
      .where("nickname", "==", receiverNickname)
      .get();

    if (userProfileSnapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "상대방 프로필을 찾을 수 없습니다." });
    }

    const userProfile = userProfileSnapshot.docs[0].data();
    const uid = userProfileSnapshot.docs[0].id;
    const userDoc = await db.collection("users").doc(uid).get();

    const userData = userDoc.data();
    userProfile.department = userData.department;

    res.status(200).json({
      success: true,
      profile: {
        uid: uid,
        nickname: userProfile.nickname,
        bio: userProfile.bio,
        profileImageNumber: userProfile.profileImageNumber,
        department: userProfile.department,
        // 추가적인 프로필 정보가 필요하면 여기에 추가
      },
    });
  } catch (error) {
    console.error("상대방 프로필 조회 오류:", error);
    res
      .status(500)
      .json({ success: false, message: "프로필 조회 중 오류가 발생했습니다." });
  }
};

// 채팅 상대방 신고
exports.reportUser = async (req, res) => {
  const { roomId } = req.params;
  const { reason } = req.body;
  const senderNickname = req.user.nickname;

  try {
    console.log("방 정보 조회 시작."); // 로그 추가
    const roomRef = realtimeDB.ref(`ChatRooms/${roomId}`);
    const roomSnapshot = await roomRef.once("value");
    console.log("Fetching room data for roomId:", roomId);

    if (!roomSnapshot.exists()) {
      console.log("방이 존재하지 않음."); // 로그 추가
      return res
        .status(404)
        .json({ success: false, message: "쪽지방을 찾을 수 없습니다." });
    }

    const roomData = roomSnapshot.val();
    const receiverNickname = roomData.members.find(
      (member) => member !== senderNickname
    );
    const userProfileSnapshot = await firestoreDB
      .collection("userProfile")
      .where("nickname", "==", senderNickname)
      .get();

    if (userProfileSnapshot.empty) {
      console.log("상대방 프로필을 찾을 수 없음."); // 로그 추가
      return res
        .status(404)
        .json({ success: false, message: "상대방 프로필을 찾을 수 없습니다." });
    }

    const reportedUid = userProfileSnapshot.docs[0].id;
    console.log("신고할 UID:", reportedUid); // 로그 추가

    if (!receiverNickname || !reason) {
      console.log("유효하지 않은 요청."); // 로그 추가
      return res.status(400).json({
        success: false,
        message:
          "유효하지 않은 요청입니다. reportedNickname과 reason이 필요합니다.",
      });
    }

    const reportsRef = firestoreDB
      .collection("reports")
      .doc("users")
      .collection(reportedUid);
    await reportsRef.add({
      reporter: req.user.nickname,
      reported: receiverNickname,
      reason: reason,
      timestamp: getKoreanTime(),
    });

    res
      .status(201)
      .json({ success: true, message: "상대방이 신고되었습니다." });
  } catch (error) {
    console.error("오류 발생:", error);
    res
      .status(500)
      .json({ success: false, message: "신고 처리 중 오류가 발생했습니다." });
  }
};
