<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 🚨 중복 블로그 포스트 작성 방지 지침 (AI 에이전트 전용 규칙)

블로그 내에 동일하거나 유사한 주제의 글이 여러 번 게시되는 것은 검색 엔진 노출(SEO)과 사용자 경험에 매우 해롭습니다. 모든 AI 에이전트는 새로운 블로그 글을 생성하거나 작성하기 전에 반드시 아래 규칙을 준수하여 중복 여부를 검사해야 합니다.

### 1. 포스트 작성 전 사전 검사 절차
새로운 글 생성을 시작하기 전, 다음 단계를 엄격히 수행합니다:
1. **기존 파일명 대조**: `src/content/posts/` 폴더 내의 모든 마크다운(`.md`) 파일명을 훑어보며 작성하려는 키워드나 주제와 겹치는지 체크합니다.
2. **데이터 및 내용 검사**: 기존 글들의 내용(제목 `title`, 원본 고유 ID인 `original_id`, 원본 이름 `original_name`)을 확인하여 현재 작성하려는 내용과 동일한 서비스나 대상이 이미 다루어졌는지 전수 조사합니다.
3. **출처 URL(링크) 검사**: 작성하려는 복지 혜택이나 정보의 공식 안내 주소(`link`)가 기존 글들(예: `[공식 홈페이지 바로가기](링크)`)에 이미 삽입되어 있는지 확인합니다.

### 2. 중복 판정 시 대응
- 위 검사 항목 중 **하나라도 일치하거나 매우 유사**하다면 이미 작성된 글로 판단하여 **새로운 포스트 생성을 즉시 취소**해야 합니다.
- 만약 기존 글의 정보가 최신 정보로 변경된 경우(예: 작년 혜택 정보에서 올해 혜택 정보로 업데이트), 새 글을 파생시키는 대신 **기존의 마크다운 글 내용을 수정(업데이트)하는 방향**을 우선으로 검토합니다.
