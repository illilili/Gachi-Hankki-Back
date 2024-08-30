const admin = require("firebase-admin");
const db = admin.firestore();

// 댓글 작성
const addComment = async (req, res) => {
  try {
    const postId = req.params.postId; // URL 파라미터에서 postId 추출
    const { content } = req.body;

    const uid = req.user ? req.user.uid : null;
    if (!uid) {
      return res.status(400).json({ error: "사용자 정보가 필요합니다." });
    }

    // uid를 사용하여 사용자 프로필에서 닉네임을 가져옴
    const userProfileDoc = await db.collection("userProfile").doc(uid).get();
    if (!userProfileDoc.exists) {
      return res.status(404).json({ error: "사용자 프로필을 찾을 수 없습니다." });
    }

    const Nickname = userProfileDoc.data().Nickname;
    if (!Nickname) {
      return res.status(404).json({ error: "닉네임을 찾을 수 없습니다." });
    }


    if (!postId || !content) {
      return res.status(400).json({ error: "postId와 content가 필요합니다." });
    }

    const comment = {
      content,
      userNum: uid,
      Nickname: Nickname,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

// 댓글 삭제
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const uid = req.user.uid;

    if (!postId || !commentId) {
      return res
        .status(400)
        .json({ error: "postId와 commentId가 필요합니다." });
    }

    const commentRef = db.collection("posts").doc(postId).collection("comments").doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    }

    // 댓글 작성자 확인
    if (commentDoc.data().userNum !== uid) {
      return res.status(403).json({ message: "권한이 없습니다. 이 댓글을 삭제할 수 없습니다." });
    }

    await commentRef.delete();

    res.status(200).json({ message: "댓글이 삭제되었습니다." });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "댓글 삭제 중 오류가 발생했습니다." });
  }
};

module.exports = {
  addComment,
  getComments,
  deleteComment
};
