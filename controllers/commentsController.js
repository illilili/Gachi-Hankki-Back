// commentsController.js
const admin = require("firebase-admin");
const db = admin.firestore();

// 댓글 작성
const addComment = async (req, res) => {
  try {
    console.log("Request URL:", req.originalUrl); // 요청 URL 로그
    console.log("Request Params:", req.params); // 요청 파라미터 로그
    console.log("Request Body:", req.body); // 요청 본문 로그

    const postId = req.params.postId; // URL 파라미터에서 postId 추출
    const { content, userNum, nickName } = req.body;

    // 로그를 추가하여 데이터를 확인
    console.log(
      `postId: ${postId}, content: ${content}, userNum: ${userNum}, nickName: ${nickName}`
    );

    // 필수 데이터 체크
    if (!postId || !content || !userNum || !nickName) {
      return res.status(400).json({ error: "필수 데이터가 누락되었습니다." });
    }

    const comment = {
      content,
      userNum,
      nickName,
      createdAt: new Date().toISOString(),
    };

    const commentsRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments");
    await commentsRef.add(comment);

    res.status(201).json({ message: "댓글이 추가되었습니다." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 댓글 조회
const getComments = async (req, res) => {
  try {
    const postId = req.params.postId; // URL 파라미터에서 postId 추출
    const commentsRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments");
    const snapshot = await commentsRef.orderBy("createdAt", "desc").get();

    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  addComment,
  getComments,
};
