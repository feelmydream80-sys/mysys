-- TB_API_KEY_MNGR_MAIL_SETT 테이블 생성 SQL (이력 관리 버전)
-- API 키 만료 알림 메일 설정 테이블
CREATE TABLE TB_API_KEY_MNGR_MAIL_SETT (
    seq SERIAL PRIMARY KEY,              -- 이력 번호 (자동 증가)
    mail_tp VARCHAR(10) NOT NULL,        -- 'mail30', 'mail7', 'mail0'
    subject VARCHAR(500),
    from_email VARCHAR(255),
    body TEXT,
    is_active BOOLEAN DEFAULT TRUE,      -- 현재 활성화 여부
    reg_dt TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_tb_api_key_mngr_mail_sett_tp ON TB_API_KEY_MNGR_MAIL_SETT(mail_tp);
CREATE INDEX idx_tb_api_key_mngr_mail_sett_active ON TB_API_KEY_MNGR_MAIL_SETT(mail_tp, is_active);

-- 초기 데이터 삽입
INSERT INTO TB_API_KEY_MNGR_MAIL_SETT (mail_tp, subject, from_email, body, is_active)
VALUES 
    ('mail30', '[API 키 만료 알림] 30일 후 만료됩니다.', 'admin@example.com', '안녕하세요.\n\nAPI 키가 30일 후 만료될 예정입니다.\n\nCD: {cd}\n만료일: {expiry_dt}\n\n빠른 조치 부탁드립니다.', TRUE),
    ('mail7', '[API 키 만료 알림] 7일 후 만료됩니다.', 'admin@example.com', '안녕하세요.\n\nAPI 키가 7일 후 만료될 예정입니다.\n\nCD: {cd}\n만료일: {expiry_dt}\n\n빠른 조치 부탁드립니다.', TRUE),
    ('mail0', '[API 키 만료 알림] 오늘 만료됩니다.', 'admin@example.com', '안녕하세요.\n\nAPI 키가 오늘 만료됩니다.\n\nCD: {cd}\n만료일: {expiry_dt}\n\n즉시 조치 부탁드립니다.', TRUE);
