-- ==============================================================================
-- 파일명: 001_create_sentiment_analyses_table.sql
-- 설명: 텍스트 감성 분석 결과를 저장하기 위한 Supabase 데이터베이스 테이블 생성 쿼리
-- 생성일: 2026-08-10
-- ==============================================================================

-- 1. 기존 테이블이 존재하면 삭제 후 새로 생성하지 않고, 안전하게 생성하기 위해 CREATE TABLE IF NOT EXISTS 문법을 사용합니다.
CREATE TABLE IF NOT EXISTS sentiment_analyses (
  -- id: 각 분석 기록을 구별하기 위한 고유 식별자 (UUID 자동 생성)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- input_text: 사용자가 분석을 위해 입력한 원본 문장 (빈 값 허용 안 함)
  input_text TEXT NOT NULL,
  
  -- sentiment: AI가 판단한 감성 결과 ('positive', 'negative', 'neutral' 중 하나만 허용)
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  
  -- confidence: AI 분석 결과에 대한 신뢰도 백분율 (0 이상 100 이하 정수만 허용)
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  
  -- reason: AI가 문장의 감성을 판단한 근거 설명 (한국어 1~3문장, 빈 값 허용 안 함)
  reason TEXT NOT NULL,
  
  -- model: 사용된 AI 모델 식별자 (예: 'gpt-4o-mini')
  model TEXT NOT NULL,
  
  -- created_at: 분석 데이터가 DB에 저장된 시각 (기본값: 현재 타임스탬프)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 검색 및 조회 성능 향상을 위한 인덱스 생성 (필요 시 활용)
CREATE INDEX IF NOT EXISTS idx_sentiment_analyses_created_at ON sentiment_analyses (created_at DESC);
