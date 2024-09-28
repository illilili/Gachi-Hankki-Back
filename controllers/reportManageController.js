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

// 3회 이상 신고된 내용 블라인드 처리
const autoBlindReports = async () => {
	try {
		const blindRef = db.collection("blindedContent"); // 블라인드 처리된 내용을 저장할 컬렉션
		const reportTypes = ['users', 'comments', 'replies', 'posts'];

		for (const type of reportTypes) {
			const reportsSnapshot = await db.collection("reports").doc(type).get(); // 해당 type의 문서 가져오기
			const reportsData = reportsSnapshot.data();

			const reportCounts = {};
			for (const reportId in reportsData) { // 각 신고 문서의 ID로 순회
				const reportData = reportsData[reportId];
				const idField = type === 'posts' ? 'postId' : type === 'comments' ? 'commentId' : 'replyId';
				reportCounts[reportData[idField]] = (reportCounts[reportData[idField]] || 0) + 1;
			}

			for (const id in reportCounts) {
				if (reportCounts[id] >= 3) {
					// 블라인드 처리
					await blindRef.add({
						[type]: id,
						createdAt: admin.firestore.FieldValue.serverTimestamp(),
					});
				}
			}

			// 신고 내역 삭제
			await Promise.all(Object.keys(reportsData).map(async reportId => {
				await db.collection("reports").doc(type).update({
					[reportId]: admin.firestore.FieldValue.delete()
				});
			}));
		}
	} catch (error) {
		console.error("Error blinding reports:", error);
	}
};

// 블라인드 해제
const unblindContent = async (req, res) => {
	try {
		const { id } = req.params; // 블라인드 해제할 ID (게시글, 댓글 또는 대댓글의 ID)

		// 블라인드 처리된 내용을 가져오기
		const blindRef = db.collection("blindedContent").where("id", "==", id);
		const blindDoc = await blindRef.get();

		if (blindDoc.empty) {
			return res.status(404).json({ error: "블라인드 처리된 내용이 없습니다." });
		}

		// 블라인드 해제 및 삭제
		await Promise.all(blindDoc.docs.map(doc => doc.ref.delete()));

		res.status(200).json({ message: "블라인드가 해제되었습니다." });
	} catch (error) {
		console.error("Error unblinding content:", error);
		res.status(500).json({ error: "블라인드 해제 중 오류가 발생했습니다." });
	}
};



module.exports = {
	getReports,
	autoBlindReports,
	unblindContent,
};
