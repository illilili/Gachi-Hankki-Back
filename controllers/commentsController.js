const admin = require("firebase-admin");
const db = admin.firestore();

// 댓글 작성
const addComment = async (req, res) => {
  try {
    console.log("댓글 작성 라우트에 도착했습니다.");
    console.log("Request URL:", req.originalUrl);
    console.log("Request Params:", req.params);
    console.log("Request Body:", req.body);

    const postId = req.params.postId; // URL 파라미터에서 postId 추출
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

    const comments = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt.toDate(); // Firestore Timestamp를 JavaScript Date로 변환

      // 한국 시간으로 변환
      const koreaTime = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000); // UTC+9 시간 추가

      return {
        id: doc.id,
        userNum: data.userNum,
        nickName: data.nickName,
        content: data.content,
        createdAt: koreaTime.toISOString(), // ISO 포맷으로 변환
      };
    });

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error); // 서버 로그에 에러 출력
    res.status(500).json({ error: "댓글 조회 중 오류가 발생했습니다." });
  }
};

// 댓글에 대댓글 추가
const addReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params; // URL 파라미터에서 postId와 commentId 추출
    const { content, userNum, nickName } = req.body;

    if (!postId || !commentId || !content || !userNum || !nickName) {
      return res.status(400).json({ error: "필수 데이터가 누락되었습니다." });
    }

    const reply = {
      content,
      userNum,
      nickName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const repliesRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies");

    await repliesRef.add(reply);

    res.status(201).json({ message: "대댓글이 추가되었습니다." });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ error: "대댓글 추가 중 오류가 발생했습니다." });
  }
};

// 댓글의 대댓글 조회
const getReplies = async (req, res) => {
  try {
    const { postId, commentId } = req.params; // URL 파라미터에서 postId와 commentId 추출

    if (!postId || !commentId) {
      return res
        .status(400)
        .json({ error: "postId와 commentId가 필요합니다." });
    }

    const repliesRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies");

    const snapshot = await repliesRef.orderBy("createdAt", "asc").get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "대댓글이 없습니다." });
    }

    const replies = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt.toDate(); // Firestore Timestamp를 JavaScript Date로 변환

      // 한국 시간으로 변환
      const koreaTime = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000); // UTC+9 시간 추가

      return {
        id: doc.id,
        userNum: data.userNum,
        nickName: data.nickName,
        content: data.content,
        createdAt: koreaTime.toISOString(), // ISO 포맷으로 변환
      };
    });

    res.json(replies);
  } catch (error) {
    console.error("Error fetching replies:", error);
    res.status(500).json({ error: "대댓글 조회 중 오류가 발생했습니다." });
  }
};

module.exports = { addComment, getComments, addReply, getReplies };
