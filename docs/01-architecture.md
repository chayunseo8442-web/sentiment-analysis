# 01. 시스템 구조와 구현 범위

## 1. 전체 구조

```text
[사용자 브라우저]
      |
      | POST /api/analyze
      v
[Node.js API on Vercel]
      |
      +--> 입력값 검증
      |
      +--> OpenAI API
      |       |
      |       +--> sentiment
      |       +--> confidence
      |       +--> reason
      |
      +--> AI 응답 검증
      |
      +--> Supabase 저장
      |
      v
[JSON 응답]
      |
      v
[결과 카드 표시]
```

## 2. 역할을 쉽게 설명하면

- HTML/CSS/JS: 사용자가 보는 화면
- Node.js: 브라우저와 AI/DB 사이에서 일을 전달하는 안전한 중간 담당자
- OpenAI API: 텍스트의 감성을 분석
- Supabase: 분석 기록을 저장
- Vercel: 웹사이트와 Node.js API를 인터넷에 공개

## 3. 권장 디렉터리

```text
/
├─ AGENTS.md
├─ PRD.md
├─ package.json
├─ .env.example
├─ public/
│  ├─ index.html
│  ├─ styles.css
│  └─ app.js
├─ api/
│  └─ analyze.js
└─ docs/
   ├─ 01-architecture.md
   ├─ 02-ui-spec.md
   ├─ 03-api-and-openai.md
   ├─ 04-supabase.md
   ├─ 05-validation-errors-security.md
   └─ 06-vercel-deploy-operations.md
```

## 4. API 흐름

### 요청

```json
{
  "text": "오늘 정말 좋은 서비스였습니다."
}
```

### 성공 응답

```json
{
  "success": true,
  "data": {
    "sentiment": "positive",
    "confidence": 92,
    "reason": "‘정말 좋은’이라는 긍정적인 표현이 사용되어 긍정적으로 판단했습니다."
  }
}
```

### 실패 응답

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "분석할 문장을 입력해 주세요."
  }
}
```

## 5. 핵심 설계 원칙

- 브라우저는 OpenAI와 Supabase의 비밀키를 알지 못한다.
- AI 결과는 그대로 믿지 않고 서버에서 형식을 검사한다.
- DB 저장과 사용자 응답의 순서를 명확히 한다.
- 실패 상태는 숨기지 않는다.
- MVP에 필요한 것만 만든다.

## 6. 범위 제한

별도 승인 없이 프레임워크, 인증 서버, 메시지 큐, 캐시 서버 등을 추가하지 않는다.
