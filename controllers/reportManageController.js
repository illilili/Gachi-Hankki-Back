const admin = require("firebase-admin");
const db = admin.firestore();

// 신고 리스트 조회
const getReports = async (req, res) => {
	try {
		// Users 신고 정보 가져오기
		const usersSnapshot = await db.collection("reports").doc("users").listCollections();
		const usersReports = [];
		for (const userCollection of usersSnapshot) {
			const userReportsSnapshot = await userCollection.get();
			userReportsSnapshot.forEach(doc => {
				usersReports.push({ id: doc.id, ...doc.data() });
			});
		}

		// Comments 신고 정보 가져오기
		const commentsSnapshot = await db.collection("reports").doc("comments").listCollections();
		const commentsReports = [];
		for (const commentCollection of commentsSnapshot) {
			const commentReportsSnapshot = await commentCollection.get();
			commentReportsSnapshot.forEach(doc => {
				commentsReports.push({ id: doc.id, ...doc.data() });
			});
		}

		// Replies 신고 정보 가져오기
		const repliesSnapshot = await db.collection("reports").doc("replies").listCollections();
		const repliesReports = [];
		for (const replyCollection of repliesSnapshot) {
			const replyReportsSnapshot = await replyCollection.get();
			replyReportsSnapshot.forEach(doc => {
				repliesReports.push({ id: doc.id, ...doc.data() });
			});
		}

		// Posts 신고 정보 가져오기
		const postsSnapshot = await db.collection("reports").doc("posts").listCollections();
		const postsReports = [];
		for (const postCollection of postsSnapshot) {
			const postReportsSnapshot = await postCollection.get();
			postReportsSnapshot.forEach(doc => {
				postsReports.push({ id: doc.id, ...doc.data() });
			});
		}

		res.json({
			usersReports,
			commentsReports,
			repliesReports,
			postsReports,
		});
	} catch (error) {
		console.error("Error fetching reports:", error);
		res.status(500).json({ error: "신고 리스트 조회 중 오류가 발생했습니다." });
	}
};

// 블라인드 처리된 콘텐츠 조회
const getBlindedContent = async (req, res) => {
	try {
		const blindRef = db.collection("blindedContent");
		const blindSnapshot = await blindRef.get();

		const blindedContent = [];
		blindSnapshot.forEach(doc => {
			blindedContent.push({ id: doc.id, ...doc.data() });
		});

		res.json(blindedContent);
	} catch (error) {
		console.error("Error fetching blinded content:", error);
		res.status(500).json({ error: "블라인드 처리된 콘텐츠 조회 중 오류가 발생했습니다." });
	}
};

// 블라인드 해제 
const unblindContent = async (req, res) => {
	try {
		const { id } = req.params; // 블라인드 해제할 ID

		// 블라인드 처리된 내용을 가져오기
		const blindRef = db.collection("blindedContent").doc(id);
		const blindDoc = await blindRef.get();

		if (!blindDoc.exists) {
			return res.status(404).json({ error: "블라인드 처리된 내용이 없습니다." });
		}

		// 블라인드 해제 및 삭제
		await blindRef.delete();

		res.status(200).json({ message: "블라인드가 해제되었습니다." });
	} catch (error) {
		console.error("Error unblinding content:", error);
		res.status(500).json({ error: "블라인드 해제 중 오류가 발생했습니다." });
	}
};

module.exports = {
	getReports,
	unblindContent,
	getBlindedContent, // 추가
};