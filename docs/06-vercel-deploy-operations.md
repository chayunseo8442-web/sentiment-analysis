# 06. Vercel 배포 및 운영

## 1. 배포 구조

```text
Git repository
      |
      v
Vercel
  ├─ 정적 프론트엔드
  └─ Node.js API (/api/analyze)
      |
      +---- OpenAI API
      |
      +---- Supabase
```

---

## 2. 환경변수

Vercel Project Settings에 다음 값을 등록한다.

```text
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

실제 값은 문서나 Git에 적지 않는다.

`.env.example`에는 변수 이름만 기록한다.

---

## 3. 로컬 실행

Node.js 버전을 프로젝트에서 고정하는 것을 권장한다.

기본 흐름:

```bash
npm install
npm run dev
```

실제 명령어는 프로젝트의 `package.json`에 정의된 스크립트를 따른다.

---

## 4. 배포 전 체크

### 코드

- [ ] `npm install` 성공
- [ ] 문법 오류 없음
- [ ] API 테스트 통과
- [ ] 브라우저 콘솔에 심각한 오류 없음

### 환경변수

- [ ] OpenAI key 등록
- [ ] Supabase URL 등록
- [ ] Supabase service role key 등록
- [ ] 비밀값이 저장소에 없음

### DB

- [ ] `sentiment_analyses` 테이블 생성
- [ ] insert 성공 확인

---

## 5. 운영 스모크 테스트

배포 URL에서 다음을 직접 실행한다.

### 테스트 A — 긍정

`정말 만족스러운 서비스였습니다.`

확인:
- 결과가 표시되는가?
- sentiment가 positive/negative/neutral 중 하나인가?
- confidence가 0~100인가?
- reason이 보이는가?

### 테스트 B — 부정

`응대가 너무 늦어서 불편했습니다.`

동일 확인.

### 테스트 C — 중립

`제품이 오늘 도착했습니다.`

동일 확인.

### 테스트 D — 오류

빈 입력을 제출한다.

확인:
- API 요청이 불필요하게 발생하지 않는가?
- 사용자에게 입력 오류가 보이는가?

---

## 6. 운영 로그

로그에 기록할 수 있는 정보:

- 요청 성공/실패
- 내부 오류 코드
- 처리 시간
- AI 호출 성공/실패

로그에 기록하지 않는 것이 원칙인 정보:

- API 키
- service role key
- 사용자의 원문 전체
- 민감할 수 있는 개인정보

원문 로그가 필요하면 별도 개인정보/보존 정책을 먼저 확정한다.

---

## 7. 장애 대응

### OpenAI 장애

- 사용자에게 재시도 메시지
- 서버 로그에서 AI_SERVICE_ERROR 확인
- Vercel 로그에서 요청 시간 확인

### Supabase 장애

- DB 연결/권한 확인
- 테이블 존재 확인
- 저장 정책 확인

### Vercel 장애

- 배포 상태 확인
- 환경변수 확인
- 함수 로그 확인

---

## 8. 성능/비용 보호

MVP에서는 복잡한 캐시 시스템을 만들지 않는다.

대신 최소한 다음을 검토한다.

- 최대 입력 길이 제한
- 요청 중 중복 클릭 방지
- 타임아웃
- 필요 시 간단한 rate limit

실제 rate limit의 숫자는 트래픽과 비용 정책이 정해진 뒤 결정한다. 에이전트가 임의의 숫자를 제품 요구사항으로 확정하지 않는다.

---

## 9. 배포 완료 기준

- Vercel URL에서 페이지가 열림
- HTTPS로 동작
- 분석 요청 성공
- 결과 표시 성공
- Supabase 저장 확인
- 오류 케이스 확인
- 브라우저에 비밀키가 노출되지 않음
