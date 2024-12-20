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
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "사용자 정보를 찾을 수 없습니다." });
    }

    const userData = userDoc.data();
    const department = userData.department || "미지정"; // 학과 정보 추가

    const userProfileDoc = await db.collection("userProfile").doc(uid).get();
    if (!userProfileDoc.exists) {
      return res
        .status(404)
        .json({ error: "사용자 프로필을 찾을 수 없습니다." });
    }

    const nickname = userProfileDoc.data().nickname;
    if (!nickname) {
      return res.status(404).json({ error: "닉네임을 찾을 수 없습니다." });
    }

    if (!postId || !content) {
      return res.status(400).json({ error: "postId와 content가 필요합니다." });
    }

    const comment = {
      content,
      userNum: uid,
      nickname,
      department, // 학과 정보 추가
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const commentsRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments");

    const commentDocRef = await commentsRef.add(comment);
    const commentId = commentDocRef.id; // 댓글 문서의 ID 가져오기

    res.status(201).json({
      message: "댓글이 추가되었습니다.",
      commentId, // 댓글 ID 추가
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "댓글 추가 중 오류가 발생했습니다." });
  }
};

// 댓글 조회
const getComments = async (req, res) => {
  try {
    const postId = req.params.postId; // URL 파라미터에서 postId 추출
    console.log("Fetching comments for postId:", postId);

    if (!postId) {
      return res.status(400).json({ error: "postId가 필요합니다." });
    }

    const commentsRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments");

    const snapshot = await commentsRef
      //.where("isBlind", "==", false) // 블라인드 처리되지 않은 댓글만 조회
      .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "댓글이 없습니다." });
    }

    // 비동기 처리된 프로필 정보를 병렬로 처리
    const comments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const createdAt = data.createdAt.toDate(); // Firestore Timestamp를 JavaScript Date로 변환

        // 한국 시간으로 변환
        const koreaTime = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000); // UTC+9 시간 추가

        // 댓글 작성자의 프로필 정보 가져오기
        const userProfileDoc = await db
          .collection("userProfile")
          .doc(data.userNum)
          .get();

        const userProfile = userProfileDoc.exists
          ? userProfileDoc.data()
          : null;

        return {
          id: doc.id,
          userNum: data.userNum,
          nickname: data.nickname,
          content: data.content,
          department: data.department,
          createdAt: koreaTime.toISOString(), // ISO 포맷으로 변환
          userProfile: userProfile || {}, // 프로필 정보 추가
        };
      })
    );

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "댓글 조회 중 오류가 발생했습니다." });
  }
};

// 특정 댓글 조회
const getSingleComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    if (!postId || !commentId) {
      return res
        .status(400)
        .json({ error: "postId와 commentId가 필요합니다." });
    }

    // 댓글 정보 가져오기
    const commentRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    }
    const commentData = commentDoc.data();

    // 댓글 작성자의 프로필 정보 가져오기
    const userProfileDoc = await db
      .collection("userProfile")
      .doc(commentData.userNum)
      .get();
    const userProfileData = userProfileDoc.exists
      ? userProfileDoc.data()
      : null;

    // 한국 시간 변환
    const createdAt = commentData.createdAt.toDate();
    const koreaTime = new Date(createdAt.getTime() + 9 * 60 * 60 * 1000);

    // 댓글 및 작성자 정보 반환
    res.json({
      comment: {
        id: commentDoc.id,
        content: commentData.content,
        createdAt: koreaTime.toISOString(),
        department: commentData.department,
        userProfile: userProfileData || {},
      },
      // 프로필 정보 추가
    });
  } catch (error) {
    console.error("Error fetching comment and author info:", error);
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

    const commentRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    }

    // 댓글 작성자 확인
    if (commentDoc.data().userNum !== uid && !req.user.isAdmin) {
      return res
        .status(403)
        .json({ message: "권한이 없습니다. 이 댓글을 삭제할 수 없습니다." });
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
  deleteComment,
  getSingleComment,
};
