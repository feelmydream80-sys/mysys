-- TB_API_KEY_MNGR_MAIL_SCHD 테이블 생성 SQL
-- API 키 만료 알림 메일 스케줄 설정 테이블
CREATE TABLE TB_API_KEY_MNGR_MAIL_SCHD (
    schd_id SERIAL PRIMARY KEY,
    schd_tp VARCHAR(20) NOT NULL,       -- 스케줄 유형: '30일전', '7일전', '당일'
    schd_cycle INTEGER NOT NULL,        -- 실행 주기 (일 단위, 예: 15, 7, 1)
    schd_hour INTEGER NOT NULL,         -- 실행 시간 (0~23)
    is_active BOOLEAN DEFAULT TRUE,     -- 활성화 여부
    last_run_dt TIMESTAMP,              -- 마지막 실행 시간
    last_run_result VARCHAR(20),        -- 마지막 실행 결과 ('success', 'failed', 'partial')
    reg_dt TIMESTAMP DEFAULT NOW(),     -- 등록 시간
    upd_dt TIMESTAMP DEFAULT NOW()      -- 수정 시간
);

-- 인덱스 생성
CREATE INDEX idx_mail_schd_tp ON TB_API_KEY_MNGR_MAIL_SCHD(schd_tp);
CREATE INDEX idx_mail_schd_active ON TB_API_KEY_MNGR_MAIL_SCHD(is_active);

-- 초기 데이터 삽입 (3개 스케줄)
INSERT INTO TB_API_KEY_MNGR_MAIL_SCHD (schd_tp, schd_cycle, schd_hour, is_active)
VALUES 
    ('30일전', 15, 23, TRUE),
    ('7일전', 3, 9, TRUE),
    ('당일', 1, 9, TRUE)
ON CONFLICT DO NOTHING;