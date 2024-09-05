const admin = require("firebase-admin");
const moment = require("moment-timezone");
const db = admin.firestore();


// 게시글 작성
exports.createPost = async (req, res) => {
  try {
    console.log("Request user in createPost:", req.user); // 로그 추가

    const uid = req.user ? req.user.uid : null;
    console.log("User ID (uid):", uid); // uid 로그

    if (!uid) {
      console.log("User ID (uid) is missing");
      return res.status(400).json({ error: '사용자 정보가 필요합니다.' });
    }

    const {
      PostTitle,
      RestaurantName,
      PromiseDate,
      PromiseTime,
      PatMethod,
      NumberOfParticipants, // 모집 인원
      PostContent,
    } = req.body;


    // uid를 사용하여 users 컬렉션에서 사용자 문서를 가져옵니다.
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.log("User document not found for uid:", uid);
      return res.status(404).json({ error: '사용자 정보를 찾을 수 없습니다.' });
    }

    // 사용자 정보를 가져온 후, userprofile에서 닉네임을 가져옵니다.
    const userProfileDoc = await db.collection('userProfile').doc(uid).get();
    if (!userProfileDoc.exists) {
      console.log("User profile not found for uid:", uid);
      return res.status(404).json({ error: '사용자 프로필을 찾을 수 없습니다.' });
    }

    const userProfileData = userProfileDoc.data();
    console.log("User profile data:", userProfileData); // 로그 추가
    const nickname = userProfileData ? userProfileData.nickname : null;

    if (!nickname) {
      console.log("NickName is missing in userProfile");
      return res.status(404).json({ error: '사용자 닉네임을 찾을 수 없습니다.' });
    }


    // 필수 필드 확인
    if (!PostTitle || !PostContent) {
      return res
        .status(400)
        .json({ error: "PostTitle and PostContent are required." });
    }

    const file = req.file;
    const bucket = admin.storage().bucket();
    let Attachment = null;

    if (file) {
      const fileName = `${Date.now()}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      stream.on("error", (error) => {
        return res
          .status(500)
          .json({ error: "이미지 업로드 중 오류가 발생했습니다." });
      });

      stream.on("finish", async () => {
        Attachment = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
        console.log(`File uploaded successfully. URL: ${Attachment}`);

        try {
          const post = {
            PostTitle,
            PostDate: moment().tz("Asia/Seoul").format(),
            RestaurantName,
            PromiseDate,
            PromiseTime,
            PatMethod,
            NumberOfParticipants,
            PostContent,
            Attachment,
            UserNum: uid,
            nickname,
          };
          const docRef = await db.collection("posts").add(post);
          res
            .status(201)
            .json({ message: "게시글이 작성되었습니다.", postId: docRef.id });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      stream.end(file.buffer);
    } else {
      try {
        const post = {
          PostTitle,
          PostDate: new Date().toISOString(),
          RestaurantName,
          PromiseDate,
          PromiseTime,
          PatMethod,
          NumberOfParticipants,
          PostContent,
          Attachment,
          UserNum: uid,
          nickname,
        };
        const docRef = await db.collection("posts").add(post);
        res
          .status(201)
          .json({ message: "게시글이 작성되었습니다.", postId: docRef.id });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 게시글 목록 조회
exports.getAllPosts = async (req, res) => {
  try {
    const postsSnapshot = await db
      .collection("posts")
      .orderBy("PostDate", "desc")
      .get();
    const posts = [];
    postsSnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 게시글 조회
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const postDoc = await db.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
      return;
    }
    res.json({ id: postDoc.id, ...postDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 게시글 수정
exports.updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const uid = req.user.uid;
    const updateData = req.body;

    // 게시글 문서 가져오기
    const postDoc = await db.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    const post = postDoc.data();

    // 게시글 작성자 확인
    if (post.UserNum !== uid) {
      return res.status(403).json({ message: "권한이 없습니다. 이 게시글을 수정할 수 없습니다." });
    }

    await db.collection("posts").doc(postId).update(updateData);
    res.json({ message: "게시글이 수정되었습니다." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 게시글 삭제
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const uid = req.user.uid;
    const postDoc = await db.collection("posts").doc(postId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }
    const post = postDoc.data();

    // 게시글 작성자 확인
    if (post.UserNum !== uid) {
      return res.status(403).json({ message: "권한이 없습니다. 이 게시글을 삭제할 수 없습니다." });
    }

    await db.collection("posts").doc(postId).delete();
    res.json({ message: "게시글이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
