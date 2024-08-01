const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const multer = require("multer"); // multer 모듈 추가

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 파일 크기 제한 (5MB)
  },
});

// 이미지 업로드
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "이미지를 업로드하세요." });
    }

    const bucket = admin.storage().bucket();
    const fileName = `${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on("error", (error) => {
      res.status(500).json({ error: "이미지 업로드 중 오류가 발생했습니다." });
    });

    stream.on("finish", () => {
      const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
      res.status(200).json({ imageUrl });
    });

    stream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
