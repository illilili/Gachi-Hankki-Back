## 가치한끼 (Gachi-Hankki)

가치한끼는 식사 시간, 장소, 결제 방식을 기준으로 사용자를 매칭해주는 소셜 식사 파트너 플랫폼입니다.
사용자는 게시글을 등록하거나 댓글을 통해 참여할 수 있으며, 매칭 상태(매칭중, 매칭대기)에 따라 리스트가 자동으로 필터링됩니다.
Firebase Authentication을 활용해 사용자 인증/인가를 처리하고, Firestore 기반 데이터베이스를 통해 실시간 데이터 관리가 이루어집니다.

### 주요 기능

- 게시글/댓글 작성, 수정, 삭제, 조회 (CRUD)

- 매칭 상태값(매칭중, 매칭대기) 기반 리스트 필터링

- 사용자 인증 및 권한 제어, 비정상 접근 예외 처리

### 기술 스택

- Back-End: Node.js, Express

- Database: Firebase Firestore

- Auth: Firebase Authentication, JWT

- Collaboration/Tools: GitHub, Notion
