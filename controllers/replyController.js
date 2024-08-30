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

		// uid를 사용하여 사용자 프로필에서 닉네임을 가져옴
		const userProfileDoc = await db.collection("userProfile").doc(uid).get();
		if (!userProfileDoc.exists) {
			return res.status(404).json({ error: "사용자 프로필을 찾을 수 없습니다." });
		}

		const Nickname = userProfileDoc.data().Nickname;
		if (!Nickname) {
			return res.status(404).json({ error: "닉네임을 찾을 수 없습니다." });
		}


		if (!postId || !commentId || !content) {
			return res.status(400).json({ error: "postId, commentId, content가 필요합니다." });
		}

		const reply = {
			content,
			userNum: uid,
			Nickname: Nickname,
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

// 대댓글 삭제
const deleteReply = async (req, res) => {
	try {
		const { postId, commentId, replyId } = req.params;
		const uid = req.user.uid;

		if (!postId || !commentId || !replyId) {
			return res.status(400).json({ error: "postId, commentId, replyId가 필요합니다." });
		}

		const replyRef = db.collection("posts").doc(postId).collection("comments").doc(commentId).collection("replies").doc(replyId);
		const replyDoc = await replyRef.get();

		if (!replyDoc.exists) {
			return res.status(404).json({ error: "대댓글을 찾을 수 없습니다." });
		}

		// 대댓글 작성자 확인
		if (replyDoc.data().userNum !== uid) {
			return res.status(403).json({ message: "권한이 없습니다. 이 대댓글을 삭제할 수 없습니다." });
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
	deleteReply,
};