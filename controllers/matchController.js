const admin = require("firebase-admin");
const db = admin.firestore();
const realtimeDB = admin.database();
const moment = require("moment");
const authenticateToken = require("../middlewares/authenticateToken.js");

// 한국 시간 기준
const getKoreanTime = () => {
  const date = new Date();
  const offsetInMillis = 9 * 60 * 60 * 1000; // 9시간 더하기 (UTC+9)
  const koreanTime = new Date(date.getTime() + offsetInMillis);
  return koreanTime.toISOString().replace("T", " ").split(".")[0];
};

// 매칭 로직 (날짜 > 시간 > 결제방법 순 우선, 시간은 ±1시간 범위 허용)
exports.filterPostsWithPriority = async (req, res) => {
  const { date, time, payMethod } = req.query;

  try {
    const currentDate = moment().format("YYYY-MM-DD"); // 현재 날짜
    let dateMatchQuery = db.collection("posts").where("status", "==", "매칭중");

    // 1단계: 날짜가 정확히 일치하는 게시물 검색 (지난 게시물 제외)
    if (date) {
      dateMatchQuery = dateMatchQuery
        .where("PromiseDate", ">=", currentDate)
        .where("PromiseDate", "==", date);
    } else {
      dateMatchQuery = dateMatchQuery.where("PromiseDate", ">=", currentDate); // 약속 날짜가 지난 게시물 제외
    }

    const dateMatchSnapshot = await dateMatchQuery.get();

    // 매칭할 수 있는 게시물이 없을 때 처리
    if (dateMatchSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: "매칭 가능한 게시물이 없습니다.",
        post: null,
      });
    }

    // 2단계: 날짜와 시간이 모두 일치하는 게시물 검색 (±1시간 범위 내)
    let dateAndTimeMatchSnapshot = null;
    if (!dateMatchSnapshot.empty && time) {
      const targetTime = moment(time, "HH:mm");
      const minTime = targetTime.clone().subtract(1, "hours").format("HH:mm");
      const maxTime = targetTime.clone().add(1, "hours").format("HH:mm");

      const dateAndTimeMatchQuery = dateMatchQuery
        .where("PromiseTime", ">=", minTime)
        .where("PromiseTime", "<=", maxTime);

      dateAndTimeMatchSnapshot = await dateAndTimeMatchQuery.get();
    }

    // 3단계: 결제 방법까지 모두 일치하는 게시물 검색 (결제 방법이 없으면 상관없음)
    let exactMatchSnapshot = null;
    if (dateAndTimeMatchSnapshot && payMethod) {
      const exactMatchQuery = db
        .collection("posts")
        .where("PromiseDate", ">=", currentDate)
        .where("PromiseDate", "==", date)
        .where("PromiseTime", ">=", minTime)
        .where("PromiseTime", "<=", maxTime)
        .where("PatMethod", "==", payMethod || "상관없음");

      exactMatchSnapshot = await exactMatchQuery.get();
    }

    // 4단계: 가장 일치하는 게시물 반환 (하나의 게시물만 반환)
    if (exactMatchSnapshot && !exactMatchSnapshot.empty) {
      const exactMatch = exactMatchSnapshot.docs[0].data();
      return res.status(200).json({ success: true, post: exactMatch });
    }

    if (dateAndTimeMatchSnapshot && !dateAndTimeMatchSnapshot.empty) {
      const dateAndTimeMatch = dateAndTimeMatchSnapshot.docs[0].data();
      return res.status(200).json({
        success: true,
        message: "날짜와 시간이 일치하는 게시물을 반환합니다.",
        post: dateAndTimeMatch,
      });
    }

    if (!dateMatchSnapshot.empty) {
      const dateMatch = dateMatchSnapshot.docs[0].data();
      return res.status(200).json({
        success: true,
        message: "날짜만 일치하는 게시물을 반환합니다.",
        post: dateMatch,
      });
    }

    // 5단계: 조건이 일치하는 게시물이 없을 경우, 랜덤으로 가까운 날짜의 게시물 반환
    const randomPostsSnapshot = await db
      .collection("posts")
      .where("PromiseDate", ">=", currentDate) // 약속 날짜가 지난 게시물 제외
      .where("status", "==", "매칭중") // 상태가 매칭중인 것만
      .orderBy("PromiseDate", "asc") // 가까운 날짜 우선 정렬
      .limit(1)
      .get();

    if (randomPostsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: "매칭 가능한 게시물이 없습니다.",
        post: null,
      });
    }

    const randomPost = randomPostsSnapshot.docs[0].data();

    return res.status(200).json({
      success: true,
      message: "매칭 가능한 게시물이 없어 가까운 날짜의 게시물을 반환합니다.",
      post: randomPost,
    });
  } catch (error) {
    console.error("게시물 필터링 중 오류 발생:", error); // 에러 로그 추가
    return res.status(500).json({
      success: false,
      message: "게시물 필터링 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

// 식당 미리보기 및 상대방 정보 확인
exports.previewRestaurant = async (req, res) => {
  const postId = req.params.postId;

  try {
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists()) {
      return res
        .status(404)
        .json({ success: false, message: "게시물을 찾을 수 없습니다." });
    }

    const postData = postDoc.data();

    const userProfileDoc = await db
      .collection("userProfile")
      .doc(postData.UserNum)
      .get();

    if (!userProfileDoc.exists()) {
      return res
        .status(404)
        .json({ success: false, message: "사용자 프로필을 찾을 수 없습니다." });
    }

    const userProfile = userProfileDoc.data();

    res.status(200).json({
      success: true,
      restaurant: {
        name: postData.RestaurantName,
        promiseDate: postData.PromiseDate || "상관없음",
        promiseTime: postData.PromiseTime || "상관없음",
        patMethod: postData.PatMethod || "상관없음", // 결제 방법이 없을 경우 처리
      },
      user: {
        nickname: userProfile.nickname,
        department: userProfile.department,
        gender: userProfile.gender,
      },
    });
  } catch (error) {
    console.error("식당 미리보기 중 오류 발생:", error); // 에러 로그 추가
    res.status(500).json({
      success: false,
      message: "식당 미리보기 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

// 매칭 확정
exports.matchUser = async (req, res) => {
  try {
    const { postId } = req.params;
    const senderNickname = req.user.nickname;

    // 게시물 조회
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists()) {
      return res
        .status(404)
        .json({ success: false, message: "게시물을 찾을 수 없습니다." });
    }

    const postData = postDoc.data();
    const receiverNickname = postData.nickname; // 게시물 작성자 닉네임 가져오기

    // memberKey 생성
    const memberKey = [senderNickname, receiverNickname].sort().join("_");

    // 이미 채팅방이 있는지 확인
    const roomsRef = realtimeDB.ref("ChatRooms");
    const existingRoomSnapshot = await roomsRef
      .orderByChild("memberKey")
      .equalTo(memberKey)
      .once("value");

    // 이미 존재하는 채팅방이 있으면 반환
    if (existingRoomSnapshot.exists()) {
      const existingRoomData = existingRoomSnapshot.val();
      const existingRoomId = Object.keys(existingRoomData)[0];

      return res.status(200).json({
        success: true,
        message: "이미 존재하는 채팅방입니다.",
        roomId: existingRoomId,
      });
    }

    // 새로운 채팅방 생성
    const roomRef = roomsRef.push();
    const roomId = roomRef.key;
    const now = getKoreanTime(); // 한국 시간 사용

    await roomRef.set({
      roomId: roomId,
      members: [senderNickname, receiverNickname],
      memberKey: memberKey,
      lastUpdated: now,
    });

    return res.status(201).json({
      success: true,
      message: "채팅방이 생성되었습니다.",
      roomId: roomId,
    });
  } catch (error) {
    console.error("매칭 확정 중 오류 발생:", error); // 에러 로그 추가
    return res.status(500).json({
      success: false,
      message: "매칭 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
};
