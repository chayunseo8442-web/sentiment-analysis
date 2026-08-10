# 03. API 및 OpenAI 상세 구현

## 1. 엔드포인트

`POST /api/analyze`

## 2. 요청

```json
{
  "text": "배송이 빨라서 정말 만족했습니다."
}
```

### 서버 검증

- body가 JSON이어야 한다.
- `text`가 문자열이어야 한다.
- trim 후 비어 있지 않아야 한다.
- UTF-8 기준 5,000자 이하를 권장한다.

---

## 3. OpenAI 호출 원칙

OpenAI API 호출은 Node.js 서버에서만 실행한다.

브라우저 코드에 `OPENAI_API_KEY`를 넣으면 안 된다.

모델에게 자유로운 문장을 반환하게 하지 않고 구조화된 JSON을 요구한다.

개념적인 출력 구조:

```json
{
  "sentiment": "positive",
  "confidence": 92,
  "reason": "‘빠르다’, ‘만족했다’는 긍정적인 표현이 있어 긍정적으로 판단했습니다."
}
```

---

## 4. 허용값

### sentiment

```text
positive
negative
neutral
```

다른 값은 오류.

### confidence

- 숫자
- 0 이상
- 100 이하

조건을 만족하지 않으면 오류.

### reason

- 문자열
- 공백 제거 후 빈 문자열이 아니어야 함
- 입력 내용에 근거한 짧은 설명이어야 함

---

## 5. AI 지시문 원칙

시스템 지시문은 최소한 다음 의미를 포함한다.

- 주어진 텍스트만 분석한다.
- 감성은 positive/negative/neutral 중 하나만 선택한다.
- confidence는 0~100 사이의 숫자로 반환한다.
- reason은 한국어로 짧게 작성한다.
- 입력에 없는 사실을 만들어내지 않는다.
- JSON 형식 외의 설명을 반환하지 않는다.

프롬프트 자체는 구현 후에도 버전 관리한다.

예시 개념:

```text
당신은 텍스트 감성 분석기다.
입력된 텍스트의 전반적인 감성을 positive, negative, neutral 중 하나로 분류한다.
입력에 없는 사실을 근거로 사용하지 않는다.
confidence는 0~100 숫자다.
reason은 한국어로 1~3문장 이내다.
정해진 JSON 스키마 외의 텍스트를 반환하지 않는다.
```

---

## 6. 서버 응답

### 성공

HTTP 200

```json
{
  "success": true,
  "data": {
    "sentiment": "neutral",
    "confidence": 74,
    "reason": "특별한 긍정 또는 부정 표현 없이 사실을 전달하는 문장이라 중립적으로 판단했습니다."
  }
}
```

### 잘못된 입력

HTTP 400

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "분석할 문장을 입력해 주세요."
  }
}
```

### 외부 서비스 실패

HTTP 502 또는 프로젝트에서 정한 동일 계열 오류 코드

```json
{
  "success": false,
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "분석 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요."
  }
}
```

---

## 7. 중요한 제약: confidence의 의미

`confidence: 92`를 “92% 확률로 정답”이라고 사용자에게 설명하면 안 된다.

MVP에서 confidence는 모델에게 요청한 “현재 분류에 대한 확신 수준”이다.
통계적으로 보정(calibration)된 확률이나 실제 정확도를 의미하지 않는다.

나중에 실제 확률 보정이 필요하면 별도의 실험/평가 설계를 추가한다.

---

## 8. 서버 처리 순서

```text
1. 요청 받기
2. 입력 검증
3. OpenAI 호출
4. JSON 파싱
5. sentiment 검증
6. confidence 검증
7. reason 검증
8. Supabase 저장
9. 성공 JSON 반환
```

어느 단계에서 실패했는지 내부 로그에서는 구분한다.
사용자에게는 지나치게 기술적인 오류를 보여주지 않는다.

---

## 9. 테스트 기준

다음은 최소 테스트 세트다.

- 긍정 문장
- 부정 문장
- 중립 문장
- 빈 입력
- 공백 입력
- 5,001자 입력
- OpenAI 오류
- JSON 파싱 오류
- sentiment 잘못된 값
- confidence 범위 초과
- reason 누락
