const express = require('express');
const bodyParser = require('body-parser');
const boardRouter = require('./routes/boardRouter');

const app = express();

// 미들웨어 등록
app.use(bodyParser.json());

// boardRouter를 Express 애플리케이션에 등록
app.use("/board", boardRouter);

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
