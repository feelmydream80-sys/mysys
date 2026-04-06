-- TB_API_KEY_MNGR_MAIL_LOG 테이블 생성 SQL
-- API 키 만료 알림 메일 전송 이력 테이블
CREATE TABLE TB_API_KEY_MNGR_MAIL_LOG (
    log_id SERIAL PRIMARY KEY,
    cd VARCHAR(100) NOT NULL,           -- API 키 코드
    mail_tp VARCHAR(10) NOT NULL,       -- 'mail30', 'mail7', 'mail0'
    sent_dt DATE NOT NULL,              -- 발송 날짜
    success BOOLEAN DEFAULT FALSE,      -- 발송 성공 여부
    error_msg TEXT,                     -- 실패 사유
    reg_dt TIMESTAMP DEFAULT NOW()      -- 기록 시간
);

-- 인덱스 생성 (CD + mail_tp + sent_dt 조합으로 빠른 조회)
CREATE INDEX idx_mail_log_cd_tp_dt ON TB_API_KEY_MNGR_MAIL_LOG(cd, mail_tp, sent_dt);
CREATE INDEX idx_mail_log_sent_dt ON TB_API_KEY_MNGR_MAIL_LOG(sent_dt DESC);