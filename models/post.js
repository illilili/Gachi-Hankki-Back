const { db } = require("../config/firebaseConfig");

// Firestore에 게시물 컬렉션을 참조합니다.
const postsCollection = db.collection("posts");

// 게시물을 생성하는 함수
async function createPost(postData) {
  try {
    // 게시물을 Firestore에 추가합니다.
    await postsCollection.add({
      ...postData,
      createdAt: new Date(),
    });
    console.log("Post created successfully!");
  } catch (error) {
    console.error("Error creating post: ", error);
  }
}

// 모든 게시물을 가져오는 함수
async function getAllPosts() {
  try {
    // 모든 게시물을 Firestore에서 가져옵니다.
    const snapshot = await postsCollection.get();
    const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return posts;
  } catch (error) {
    console.error("Error getting posts: ", error);
    return [];
  }
}

module.exports = {
  createPost,
  getAllPosts,
};
