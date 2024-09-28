const admin = require("firebase-admin");
const moment = require("moment-timezone");
const db = admin.firestore();

// 게시글 신고
exports.reportPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body; // 신고 사유만 받음
    const reporterId = req.user ? req.user.uid : null;
    if (!reporterId) {
      return res.status(400).json({ error: "신고자 정보가 필요합니다." });
    }

    if (!postId || !reason) {
      return res.status(400).json({ error: "postId와 reason이 필요합니다." });
    }

    // Firestore에서 게시글 정보 조회
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: "해당 게시글을 찾을 수 없습니다." });
    }

    const postData = postDoc.data();
    console.log("Post Data:", postData); // 추가: 게시글 데이터 확인
    const postOwnerId = postData.UserNum; // 게시글 작성자의 uid

    if (!postOwnerId) {
      console.error("게시글 작성자 정보가 없습니다:", postData);
      return res
        .status(400)
        .json({ error: "게시글 작성자 정보가 필요합니다." });
    }

    const existingReport = await db
      .collection("reports")
      .doc("posts")
      .collection(postId)
      .where("reporterId", "==", reporterId)
      .get();

    if (!existingReport.empty) {
      return res.status(400).json({ error: "이미 신고한 게시글입니다." });
    }

    // 신고 정보를 Firestore에 저장
    await db.collection("reports").doc("posts").collection(postId).add({
      postId: postId,
      reporterId: reporterId, // 신고자 uid
      postOwnerId: postOwnerId, // 게시글 작성자 uid
      reason: reason,
      PostTitle: postData.PostTitle,
      postContent: postData.PostContent, // 게시글 내용
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "게시글이 성공적으로 신고되었습니다." });
  } catch (error) {
    console.error("Error reporting post:", error);
    res.status(500).json({ error: "게시글 신고 중 오류가 발생했습니다." });
  }
};

// 댓글 신고
exports.reportComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params; // URL에서 댓글 ID 가져오기
    const { reason } = req.body; // 신고 사유만 받음
    const reporterId = req.user ? req.user.uid : null; // 신고자 ID

    // 신고자 정보가 없으면 에러 반환
    if (!reporterId) {
      return res.status(400).json({ error: "신고자 정보가 필요합니다." });
    }

    // commentId와 reason이 없는 경우 에러 반환
    if (!commentId || !reason) {
      return res
        .status(400)
        .json({ error: "commentId와 reason이 필요합니다." });
    }

    console.log("Post ID:", postId, "Comment ID:", commentId);

    // Firestore에서 댓글 정보 조회
    const commentDoc = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .get();

    // 댓글이 존재하지 않으면 에러 반환
    if (!commentDoc.exists) {
      return res.status(404).json({ error: "해당 댓글을 찾을 수 없습니다." });
    }

    const commentData = commentDoc.data();
    console.log("Comment Data:", commentData); // 추가: 댓글 데이터 확인
    const commentOwnerId = commentData.userNum; // 댓글 작성자의 uid

    // 댓글 작성자 정보가 없는 경우 에러 반환
    if (!commentOwnerId) {
      console.error("댓글 작성자 정보가 없습니다:", commentData);
      return res.status(400).json({ error: "댓글 작성자 정보가 필요합니다." });
    }

    // 중복 신고 확인
    const existingReport = await db
      .collection("reports")
      .doc("comments")
      .collection(commentId)
      .where("reporterId", "==", reporterId)
      .get();

    if (!existingReport.empty) {
      return res.status(400).json({ error: "이미 신고한 댓글입니다." });
    }

    // 신고 정보를 Firestore에 저장
    await db.collection("reports").doc("comments").collection(commentId).add({
      postId: postId,
      commentId: commentId,
      reporterId: reporterId, // 신고자 uid
      commentOwnerId: commentOwnerId, // 댓글 작성자 uid
      reason: reason,
      content: commentData.content, // 댓글 내용
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "댓글이 성공적으로 신고되었습니다." });
  } catch (error) {
    console.error("Error reporting comment:", error);
    res.status(500).json({ error: "댓글 신고 중 오류가 발생했습니다." });
  }
};


// 대댓글 신고
exports.reportReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params; // URL에서 대댓글 ID 가져오기
    const { reason } = req.body; // 신고 사유만 받음
    const reporterId = req.user ? req.user.uid : null; // 신고자 ID

    // 신고자 정보가 없으면 에러 반환
    if (!reporterId) {
      return res.status(400).json({ error: "신고자 정보가 필요합니다." });
    }

    // replyId와 reason이 없는 경우 에러 반환
    if (!replyId || !reason) {
      return res.status(400).json({ error: "replyId와 reason이 필요합니다." });
    }

    console.log("Post ID:", postId, "Comment ID:", commentId, "Reply ID:", replyId);

    // Firestore에서 대댓글 정보 조회
    const replyDoc = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .doc(replyId)
      .get();

    // 대댓글이 존재하지 않으면 에러 반환
    if (!replyDoc.exists) {
      return res.status(404).json({ error: "해당 대댓글을 찾을 수 없습니다." });
    }

    const replyData = replyDoc.data();
    const replyOwnerId = replyData.userNum; // 대댓글 작성자의 uid

    // 대댓글 작성자 정보가 없는 경우 에러 반환
    if (!replyOwnerId) {
      console.error("대댓글 작성자 정보가 없습니다:", replyData);
      return res.status(400).json({ error: "대댓글 작성자 정보가 필요합니다." });
    }

    // 중복 신고 확인
    const existingReport = await db
      .collection("reports")
      .doc("replies")
      .collection(replyId)
      .where("reporterId", "==", reporterId)
      .get();

    if (!existingReport.empty) {
      return res.status(400).json({ error: "이미 신고한 대댓글입니다." });
    }

    // 신고 정보를 Firestore에 저장
    await db.collection("reports").doc("replies").collection(replyId).add({
      postId: postId,
      commentId: commentId,
      replyId: replyId,
      reporterId: reporterId, // 신고자 uid
      replyOwnerId: replyOwnerId, // 대댓글 작성자 uid
      reason: reason,
      content: replyData.content, // 대댓글 내용
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "대댓글이 성공적으로 신고되었습니다." });
  } catch (error) {
    console.error("Error reporting reply:", error);
    res.status(500).json({ error: "대댓글 신고 중 오류가 발생했습니다." });
  }
};