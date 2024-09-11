const admin = require("firebase-admin");
const db = admin.firestore();

// 댓글에 대댓글 추가
const addReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;

    const uid = req.user ? req.user.uid : null;
    if (!uid) {
      return res.status(400).json({ error: "사용자 정보가 필요합니다." });
    }

    // uid를 사용하여 사용자 프로필에서 닉네임과 학과를 가져옴
    const userProfileDoc = await db.collection("userProfile").doc(uid).get();
    if (!userProfileDoc.exists) {
      return res
        .status(404)
        .json({ error: "사용자 프로필을 찾을 수 없습니다." });
    }

    const userProfileData = userProfileDoc.data();
    const { nickname, department = "미지정" } = userProfileData; // 기본 값 설정

    if (!nickname) {
      return res.status(404).json({ error: "닉네임을 찾을 수 없습니다." });
    }

    if (!postId || !commentId || !content) {
      return res
        .status(400)
        .json({ error: "postId, commentId, content가 필요합니다." });
    }

    const reply = {
      content,
      userNum: uid,
      nickname,
      department, // 학과 정보 추가
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const repliesRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies");

    const replyDocRef = await repliesRef.add(reply); // 대댓글 추가
    const replyId = replyDocRef.id; // 대댓글 문서의 ID 가져오기

    res.status(201).json({
      message: "대댓글이 추가되었습니다.",
      replyId, // 대댓글 ID 추가
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    res.status(500).json({ error: "대댓글 추가 중 오류가 발생했습니다." });
  }
};

// 댓글의 대댓글 조회
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

    const replies = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const createdAt = data.createdAt.toDate(); // Firestore Timestamp를 JavaScript Date로 변환

        // 한국 시간으로 변환
        const koreaTime = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000);

        // 대댓글 작성자의 프로필 정보 가져오기
        const userProfileDoc = await db
          .collection("userProfile")
          .doc(data.userNum)
          .get();

        const userProfile = userProfileDoc.exists ? userProfileDoc.data() : null;

        return {
          id: doc.id,
          userNum: data.userNum,
          nickname: data.nickname,
          content: data.content,
          department: data.department,
          createdAt: koreaTime.toISOString(),
          userProfile: userProfile || {}, // 프로필 정보 추가
        };
      })
    );

    res.json(replies);
  } catch (error) {
    console.error("Error fetching replies:", error);
    res.status(500).json({ error: "대댓글 조회 중 오류가 발생했습니다." });
  }
};

// 특정 대댓글 조회
const getSingleReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;

    if (!postId || !commentId || !replyId) {
      return res
        .status(400)
        .json({ error: "postId, commentId, replyId가 필요합니다." });
    }

    // 대댓글 정보 가져오기
    const replyRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .doc(replyId);
    const replyDoc = await replyRef.get();

    if (!replyDoc.exists) {
      return res.status(404).json({ error: "대댓글을 찾을 수 없습니다." });
    }

    const replyData = replyDoc.data();

    const userProfileDoc = await db
      .collection("userProfile")
      .doc(replyData.userNum)
      .get();
    const userProfileData = userProfileDoc.exists ? userProfileDoc.data() : {};

    // 한국 시간 변환
    const createdAt = replyData.createdAt.toDate();
    const koreaTime = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000);

    // 대댓글 및 작성자 프로필 정보 반환
    res.json({
      reply: {
        id: replyDoc.id,
        content: replyData.content,
        department: replyData.department,
        createdAt: koreaTime.toISOString(),
        userProfile: userProfileData,
      },
      // 작성자 프로필 정보가 필요한 경우 여기에 추가
    });
  } catch (error) {
    console.error("Error fetching reply:", error);
    res.status(500).json({ error: "대댓글 조회 중 오류가 발생했습니다." });
  }
};

// 대댓글 삭제
const deleteReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const uid = req.user.uid;

    if (!postId || !commentId || !replyId) {
      return res
        .status(400)
        .json({ error: "postId, commentId, replyId가 필요합니다." });
    }

    const replyRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .doc(replyId);
    const replyDoc = await replyRef.get();

    if (!replyDoc.exists) {
      return res.status(404).json({ error: "대댓글을 찾을 수 없습니다." });
    }

    // 대댓글 작성자 확인
    if (replyDoc.data().userNum !== uid) {
      return res
        .status(403)
        .json({ message: "권한이 없습니다. 이 대댓글을 삭제할 수 없습니다." });
    }

    await replyRef.delete();
    res.status(200).json({ message: "대댓글이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ error: "대댓글 삭제 중 오류가 발생했습니다." });
  }
};

module.exports = {
  addReply,
  getReplies,
  getSingleReply,
  deleteReply,
};
