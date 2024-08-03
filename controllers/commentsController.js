const admin = require("firebase-admin");
const moment = require("moment-timezone");
const db = admin.firestore();

const addComment = async (req, res) => {
  try {
    console.log("댓글 작성 라우트에 도착했습니다.");
    console.log("Request URL:", req.originalUrl);
    console.log("Request Params:", req.params);
    console.log("Request Body:", req.body);

    const postId = req.params.postId; // URL 파라미터에서 postId 추출
    console.log("Extracted postId:", postId); // 디버깅 로그 추가

    const { content, userNum, nickName } = req.body;

    if (!postId || !content || !userNum || !nickName) {
      return res.status(400).json({ error: "필수 데이터가 누락되었습니다." });
    }

    const comment = {
      content,
      userNum,
      nickName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // 서버에서 시간을 설정
    };

    const commentsRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments");
    await commentsRef.add(comment);

    res.status(201).json({ message: "댓글이 추가되었습니다." });
  } catch (error) {
    console.error("Error adding comment:", error); // 서버 로그에 에러 출력
    res.status(500).json({ error: "댓글 추가 중 오류가 발생했습니다." });
  }
};

// 댓글 조회
const getComments = async (req, res) => {
  try {
    const postId = req.params.postId; // URL 파라미터에서 postId 추출
    console.log("Fetching comments for postId:", postId); // 디버깅 로그 추가
    if (!postId) {
      return res.status(400).json({ error: "postId가 필요합니다." });
    }
    const commentsRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments");
    const snapshot = await commentsRef.orderBy("createdAt", "desc").get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "댓글이 없습니다." });
    }

    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error); // 서버 로그에 에러 출력
    res.status(500).json({ error: "댓글 조회 중 오류가 발생했습니다." });
  }
};

module.exports = { addComment, getComments };
