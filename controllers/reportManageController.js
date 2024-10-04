const admin = require("firebase-admin");
const db = admin.firestore();
const cron = require("node-cron");

// 신고 리스트 조회
const getReports = async (req, res) => {
	try {
		// 관리자 확인
		if (!req.user.isAdmin) {
			return res.status(403).json({ error: "접근 권한이 없습니다." });
		}

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
		// 관리자 확인
		if (!req.user.isAdmin) {
			return res.status(403).json({ error: "접근 권한이 없습니다." });
		}

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

		// 관리자 확인
		if (!req.user.isAdmin) {
			return res.status(403).json({ error: "접근 권한이 없습니다." });
		}

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

// 회원 정지 또는 영구 탈퇴 처리
const manageUserStatus = async (req, res) => {
	try {
		const { userId } = req.params; // 대상 회원 ID
		const { status, days } = req.body; // 상태와 정지 기간
		const isAdmin = req.user ? req.user.isAdmin : false; // 관리자 여부 확인

		if (!isAdmin) {
			return res.status(403).json({ error: "관리자 권한이 필요합니다." });
		}

		const userDoc = await db.collection("users").doc(userId).get();
		if (!userDoc.exists) {
			return res.status(404).json({ error: "해당 회원을 찾을 수 없습니다." });
		}

		if (status === "suspend") {
			if (!days || typeof days !== 'number' || days <= 0) {
				return res.status(400).json({ error: "유효한 정지 일수를 입력해야 합니다." });
			}

			// 회원 계정 정지 처리 (정지 기간 설정)
			await db.collection("users").doc(userId).update({
				suspended: true,
				suspendedUntil: admin.firestore.FieldValue.serverTimestamp() + days * 24 * 60 * 60 * 1000 // 입력된 일수만큼 정지
			});
			return res.status(200).json({ message: `${days}일간 회원이 정지되었습니다.` });
		} else if (status === "ban") {
			// 회원 계정 영구 탈퇴 처리
			await db.collection("users").doc(userId).update({
				banned: true
			});
			return res.status(200).json({ message: "회원이 영구 탈퇴되었습니다." });
		} else {
			return res.status(400).json({ error: "유효한 status 값이 필요합니다." });
		}
	} catch (error) {
		console.error("Error managing user status:", error);
		res.status(500).json({ error: "회원 상태 관리 중 오류가 발생했습니다." });
	}
};


// 자동 정지 해제
cron.schedule('0 0 * * *', async () => {
	try {
		const now = admin.firestore.Timestamp.now();
		const suspendedUsers = await db.collection("users").where("suspended", "==", true).get();

		suspendedUsers.forEach(async (doc) => {
			const userData = doc.data();
			const suspendedUntil = userData.suspendedUntil;

			// 정지 기간이 만료되었는지 확인
			if (suspendedUntil && suspendedUntil.toMillis() <= now.toMillis()) {
				// 정지 상태 해제
				await db.collection("users").doc(doc.id).update({
					suspended: false,
					suspendedUntil: admin.firestore.FieldValue.delete() // suspendedUntil 필드 삭제
				});
				console.log(`User ${doc.id} has been unsuspended.`);
			}
		});
	} catch (error) {
		console.error("Error unsuspending users:", error);
	}
});

// 신고된 사용자 조회
const getReportedUsers = async (req, res) => {
	try {
		// 관리자 확인
		if (!req.user.isAdmin) {
			return res.status(403).json({ error: "접근 권한이 없습니다." });
		}

		// 신고된 사용자 정보 가져오기
		const usersSnapshot = await db.collection("reports").doc("users").listCollections();
		const usersReports = [];

		for (const userCollection of usersSnapshot) {
			const userReportsSnapshot = await userCollection.get();
			userReportsSnapshot.forEach(doc => {
				usersReports.push({ id: doc.id, ...doc.data() });
			});
		}

		res.json({
			usersReports,
		});
	} catch (error) {
		console.error("Error fetching reported users:", error);
		res.status(500).json({ error: "신고된 사용자 조회 중 오류가 발생했습니다." });
	}
};



module.exports = {
	getReports,
	unblindContent,
	getBlindedContent,
	manageUserStatus,
	getReportedUsers,
};