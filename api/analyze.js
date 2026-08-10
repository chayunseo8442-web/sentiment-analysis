// ==============================================================================
// 파일명: api/analyze.js
// 설명: Vercel Serverless Function으로 작동하는 텍스트 감성 분석 API 핸들러
// 주 주요 기능:
//   1. 클라이언트 요청(POST) 수신 및 입력값 검증 (빈 값, 길이 제한 등)
//   2. OpenAI API(gpt-4o-mini)에 구조화된 감성 분석 요청 (긍정/부정/중립)
//   3. AI 응답 데이터의 유효성 검증 (허용된 범주의 값인지 체크)
//   4. 분석 결과를 Supabase 데이터베이스(sentiment_analyses)에 기록
//   5. 결과를 표준화된 JSON 형식으로 클라이언트에 반환
// ==============================================================================

const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 환경 변수 검증 및 클라이언트 객체 초기화 함수
function getClients() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let openai = null;
  let supabase = null;

  if (openaiApiKey && openaiApiKey !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: openaiApiKey });
  }

  if (
    supabaseUrl &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseServiceKey &&
    supabaseServiceKey !== 'your_supabase_service_role_key_here'
  ) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  return { openai, supabase };
}

// Vercel Serverless API 진입점 핸들러
module.exports = async function handler(req, res) {
  // 1. HTTP 메서드 체크: POST 요청만 허용합니다.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST 요청만 허용됩니다.',
      },
    });
  }

  try {
    // 2. 요청 Body 파싱 및 입력값 검증
    const { text } = req.body || {};

    // 2-1. text 필드 존재 및 데이터 타입 검증
    if (typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '분석할 문장을 입력해 주세요.',
        },
      });
    }

    // 2-2. 공백 제거 후 빈 입력값 검증
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '분석할 문장을 입력해 주세요.',
        },
      });
    }

    // 2-3. 글자 수 제한 검증 (최대 5,000자 이하)
    if (trimmedText.length > 5000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INPUT_TOO_LONG',
          message: '문장이 너무 깁니다. 5,000자 이하로 입력해 주세요.',
        },
      });
    }

    // 3. 외부 서비스(OpenAI 및 Supabase) 클라이언트 준비
    const { openai, supabase } = getClients();

    if (!openai) {
      console.error('[API 오류] OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: '분석 서비스 설정이 올바르지 않습니다. 서버 환경 변수를 확인해 주세요.',
        },
      });
    }

    // 4. OpenAI API 호출 (구조화된 JSON 응답 요구)
    const MODEL_NAME = 'gpt-4o-mini';
    let aiRawResponse;

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content:
              '당신은 텍스트 감성 분석기입니다.\n' +
              '사용자가 제시한 입력 문장의 감성을 분석하고 다음 규칙에 따라 엄격히 پاسخ하십시오.\n' +
              '1. 주어진 텍스트만 기반으로 분석하며, 입력에 없는 사실을 지어내지 마십시오.\n' +
              '2. sentiment는 "positive", "negative", "neutral" 중 정확히 하나만 작성하십시오.\n' +
              '3. confidence는 모델이 해당 분류에 대해 확신하는 정도를 0에서 100 사이의 정수로 반환하십시오.\n' +
              '4. reason은 어떤 단어나 분위기 때문에 그렇게 판단했는지 사람이 쉽게 이해할 수 있는 한국어로 1~3문장 이내로 작성하십시오.\n' +
              '5. 응답은 반드시 다음 JSON 스키마 형식에 맞춰 추가 텍스트 없이 출력하십시오:\n' +
              '{\n' +
              '  "sentiment": "positive" | "negative" | "neutral",\n' +
              '  "confidence": number (0-100),\n' +
              '  "reason": "한국어 설명 문장"\n' +
              '}',
          },
          {
            role: 'user',
            content: trimmedText,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // 주관적인 답변 편차를 줄이기 위해 낮은 온도를 사용합니다.
      });

      aiRawResponse = completion.choices[0]?.message?.content;
    } catch (openaiErr) {
      console.error('[OpenAI API 호출 실패]', openaiErr);
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: '분석 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
        },
      });
    }

    // 5. AI 응답 JSON 파싱
    let parsedData;
    try {
      parsedData = JSON.parse(aiRawResponse);
    } catch (parseErr) {
      console.error('[AI 응답 JSON 파싱 실패] Raw Content:', aiRawResponse);
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_INVALID_RESPONSE',
          message: '분석 결과를 확인하는 중 문제가 발생했습니다. 다시 시도해 주세요.',
        },
      });
    }

    // 6. AI 응답 값의 유효성 엄격 검증 (Strict Validation)
    const { sentiment, confidence, reason } = parsedData || {};

    // 6-1. sentiment 값 검증 (positive, negative, neutral 3가지만 허용)
    const allowedSentiments = ['positive', 'negative', 'neutral'];
    if (!sentiment || !allowedSentiments.includes(sentiment)) {
      console.error('[AI 응답 검증 실패] 올바르지 않은 sentiment 값:', sentiment);
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_INVALID_RESPONSE',
          message: '분석 결과를 확인하는 중 문제가 발생했습니다. 다시 시도해 주세요.',
        },
      });
    }

    // 6-2. confidence 값 검증 (0~100 사이의 정수)
    const isConfidenceValid =
      typeof confidence === 'number' &&
      Number.isInteger(confidence) &&
      confidence >= 0 &&
      confidence <= 100;

    if (!isConfidenceValid) {
      console.error('[AI 응답 검증 실패] 올바르지 않은 confidence 범위:', confidence);
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_INVALID_RESPONSE',
          message: '분석 결과를 확인하는 중 문제가 발생했습니다. 다시 시도해 주세요.',
        },
      });
    }

    // 6-3. reason 값 검증 (비어 있지 않은 문자열)
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      console.error('[AI 응답 검증 실패] 비어 있거나 올바르지 않은 reason:', reason);
      return res.status(502).json({
        success: false,
        error: {
          code: 'AI_INVALID_RESPONSE',
          message: '분석 결과를 확인하는 중 문제가 발생했습니다. 다시 시도해 주세요.',
        },
      });
    }

    const validData = {
      sentiment,
      confidence,
      reason: reason.trim(),
    };

    // 7. Supabase DB에 분석 기록 저장
    if (supabase) {
      try {
        const { error: dbError } = await supabase.from('sentiment_analyses').insert([
          {
            input_text: trimmedText,
            sentiment: validData.sentiment,
            confidence: validData.confidence,
            reason: validData.reason,
            model: MODEL_NAME,
          },
        ]);

        if (dbError) {
          // DB 저장 실패 시 정책: 사용자에게 결과를 보여주는 것을 우선하되 서버 로그에 실패 기록
          console.error('[Supabase 저장 실패]', dbError);
        } else {
          console.log('[Supabase 저장 성공] ID 및 레코드가 추가되었습니다.');
        }
      } catch (dbCatchErr) {
        console.error('[Supabase 처리 중 오류 발생]', dbCatchErr);
      }
    } else {
      console.warn('[Supabase 경고] Supabase 설정이 비어있어 기록 저장을 건너뜁니다.');
    }

    // 8. 성공 최종 JSON 응답 반환
    return res.status(200).json({
      success: true,
      data: validData,
    });
  } catch (err) {
    // 9. 예상치 못한 예외 처리
    console.error('[서버 내부 오류 발생]', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
      },
    });
  }
};
