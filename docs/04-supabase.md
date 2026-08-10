# 04. Supabase 데이터 설계

## 1. 목적

Supabase는 사용자가 요청한 감성 분석 결과를 저장하는 용도로 사용한다.

MVP에서는 로그인 기능 없이도 분석 기록을 저장할 수 있도록 설계한다.

---

## 2. 권장 테이블

테이블명: `sentiment_analyses`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid | 기본 키 |
| input_text | text | 사용자가 입력한 텍스트 |
| sentiment | text | positive / negative / neutral |
| confidence | integer | 0~100 |
| reason | text | AI가 반환한 분석 이유 |
| model | text | 사용한 모델 식별자 |
| created_at | timestamptz | 생성 시간 |

---

## 3. 제약조건

### sentiment

허용값:
- positive
- negative
- neutral

### confidence

0~100 사이의 정수.

### input_text

빈 값은 저장하지 않는다.

---

## 4. SQL 예시

실제 적용 전 Supabase 프로젝트의 정책과 환경에 맞게 검토한다.

```sql
create table sentiment_analyses (
  id uuid primary key default gen_random_uuid(),
  input_text text not null,
  sentiment text not null check (sentiment in ('positive', 'negative', 'neutral')),
  confidence integer not null check (confidence >= 0 and confidence <= 100),
  reason text not null,
  model text not null,
  created_at timestamptz not null default now()
);
```

---

## 5. 보안 원칙

- 브라우저에서 service role key를 사용하지 않는다.
- 서버 환경에서만 DB 저장을 수행한다.
- 공개적으로 모든 분석 기록을 조회하는 기능은 MVP에 포함하지 않는다.
- DB 접근 권한은 필요한 작업만 허용한다.

---

## 6. 개인정보/보존 정책

사용자가 민감한 개인정보를 입력할 가능성을 고려해야 한다.

MVP에서는 다음 문구를 입력 UI 근처에 안내하는 것을 권장한다.

`개인정보나 비밀번호 등 민감한 정보는 입력하지 마세요.`

운영 환경에서는 데이터 보존 기간을 별도로 정해야 한다.
요구사항으로 확정되지 않은 기간을 AI 에이전트가 임의로 정하지 않는다.

---

## 7. 저장 실패 처리

OpenAI 분석은 성공했지만 Supabase 저장에 실패한 경우:

- 사용자에게 “결과 저장에 문제가 있어 완료되지 않았다”는 메시지를 보여줄지,
- 분석 결과는 보여주고 저장만 실패 처리할지

중 하나를 제품 정책으로 확정해야 한다.

**MVP 기본 권장안:** 분석 결과 자체의 전달을 우선하되, 서버 로그에서 저장 실패를 명확히 기록한다. 단, 제품에서 “모든 결과가 반드시 저장된다”고 약속한다면 저장 실패를 전체 요청 실패로 처리한다.

이 선택은 구현 전에 확정해야 하며 에이전트가 임의로 결정하지 않는다.

---

## 8. 검증

Supabase Dashboard에서 다음을 확인한다.

- 분석 요청 후 row가 추가되는가?
- sentiment가 세 값 중 하나인가?
- confidence가 0~100인가?
- reason이 비어 있지 않은가?
- created_at이 정상인가?
