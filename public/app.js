// ==============================================================================
// 파일명: public/app.js
// 설명: 클라이언트 측 UI 조작 및 Serverless API(/api/analyze) 연동 자바스크립트
// 주요 기능:
//   1. 텍스트 입력 글자 수 실시간 세기 (최대 5,000자)
//   2. 1차 클라이언트 검증 (빈 문자열 / 공백 입력 차단)
//   3. 중복 클릭 방지를 위한 로딩 상태 처리 (버튼 비활성화 & 스피너 연동)
//   4. /api/analyze API 호출 및 결과(긍정/부정/중립, 신뢰도 %, 이유) 카드 렌더링
//   5. 사용자 친화적 오류 메시지 표시 및 재시도 UX 지원
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM 주요 엘리먼트 참조 바인딩
  const textInput = document.getElementById('text-input');
  const charCount = document.getElementById('char-count');
  const analyzeBtn = document.getElementById('analyze-btn');
  const btnText = analyzeBtn.querySelector('.btn-text');
  const btnSpinner = analyzeBtn.querySelector('.btn-spinner');
  const inputError = document.getElementById('input-error');

  // 결과 카드 관련 엘리먼트
  const resultSection = document.getElementById('result-section');
  const sentimentBadge = document.getElementById('sentiment-badge');
  const confidenceValue = document.getElementById('confidence-value');
  const confidenceBar = document.getElementById('confidence-bar');
  const reasonText = document.getElementById('reason-text');

  // 에러 카드 관련 엘리먼트
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  const retryBtn = document.getElementById('retry-btn');

  // 2. 실시간 글자 수 세기 이벤트 리스너
  textInput.addEventListener('input', () => {
    const currentLength = textInput.value.length;
    charCount.textContent = `${currentLength.toLocaleString()} / 5,000자`;

    // 입력 중에는 1차 클라이언트 에러 안내 문구를 숨깁니다.
    if (!inputError.classList.contains('hidden')) {
      hideInputError();
    }
  });

  // 3. 키보드 단축키 지원 (Ctrl + Enter 또는 Cmd + Enter 입력 시 분석 실행)
  textInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalysis();
    }
  });

  // 4. 분석 버튼 클릭 이벤트 리스너
  analyzeBtn.addEventListener('click', () => {
    handleAnalysis();
  });

  // 5. 에러 시 재시도 버튼 클릭 이벤트 리스너
  retryBtn.addEventListener('click', () => {
    hideErrorSection();
    textInput.focus();
    textInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ==============================================================================
  // 핵심 분석 처리 함수
  // ==============================================================================
  async function handleAnalysis() {
    const rawText = textInput.value;
    const trimmedText = rawText.trim();

    // 1차 클라이언트 검증: 빈 입력값 또는 공백만 있는 경우
    if (trimmedText.length === 0) {
      showInputError('분석할 문장을 입력해 주세요.');
      return;
    }

    // 1차 클라이언트 검증: 5,000자 초과한 경우
    if (trimmedText.length > 5000) {
      showInputError('문장이 너무 깁니다. 5,000자 이하로 입력해 주세요.');
      return;
    }

    // 이전 상태 초기화
    hideInputError();
    hideResultSection();
    hideErrorSection();

    // 로딩 상태 시작 (중복 요청 방지)
    setLoadingState(true);

    try {
      // API 호출 (서버의 /api/analyze 엔드포인트로 POST 요청)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: trimmedText }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 성공 응답인 경우 결과 카드 표시
        renderResult(result.data);
      } else {
        // 에러 응답 처리 (서버에서 전달한 에러 메시지 또는 기본 메시지 사용)
        const errorMsg =
          result.error?.message || '분석 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        showErrorSection(errorMsg);
      }
    } catch (err) {
      console.error('[클라이언트 네트워크 또는 API 오류]', err);
      showErrorSection('일시적인 네트워크 연결 문제가 발생했습니다. 인터넷 상태를 확인해 주세요.');
    } finally {
      // 로딩 상태 종료
      setLoadingState(false);
    }
  }

  // ==============================================================================
  // UI 상태 조작 헬퍼 함수
  // ==============================================================================

  // 입력 에러 문구 표시/숨김 헬퍼
  function showInputError(message) {
    inputError.textContent = message;
    inputError.classList.remove('hidden');
    textInput.focus();
  }

  function hideInputError() {
    inputError.textContent = '';
    inputError.classList.add('hidden');
  }

  // 로딩 상태 UI 제어 함수 (버튼 비활성화 및 스피너 연동)
  function setLoadingState(isLoading) {
    if (isLoading) {
      analyzeBtn.disabled = true;
      btnText.textContent = '분석 중...';
      btnSpinner.classList.remove('hidden');
    } else {
      analyzeBtn.disabled = false;
      btnText.textContent = '감성 분석하기';
      btnSpinner.classList.add('hidden');
    }
  }

  // 성공적인 결과 렌더링 처리 함수
  function renderResult(data) {
    const { sentiment, confidence, reason } = data;

    // 1. 감성 배지 텍스트 및 클래스 설정 (긍정 / 부정 / 중립)
    sentimentBadge.className = 'sentiment-badge'; // 기존 클래스 초기화
    
    let sentimentKorean = '중립';
    if (sentiment === 'positive') {
      sentimentKorean = '긍정';
      sentimentBadge.classList.add('positive');
    } else if (sentiment === 'negative') {
      sentimentKorean = '부정';
      sentimentBadge.classList.add('negative');
    } else {
      sentimentKorean = '중립';
      sentimentBadge.classList.add('neutral');
    }
    
    sentimentBadge.textContent = sentimentKorean;

    // 2. 신뢰도 퍼센티지 텍스트 및 프로그래스 바 업데이트
    confidenceValue.textContent = `${confidence}%`;
    confidenceBar.style.width = `${confidence}%`;

    // 3. 판단 이유 텍스트 설정 (XSS 방지를 위해 textContent 적용)
    reasonText.textContent = reason;

    // 4. 결과 섹션 보이기 및 화면 자동 스크롤
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideResultSection() {
    resultSection.classList.add('hidden');
  }

  // 에러 화면 렌더링 헬퍼
  function showErrorSection(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideErrorSection() {
    errorSection.classList.add('hidden');
  }
});
