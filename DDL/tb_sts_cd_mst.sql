-- ==============================================
-- TB_STS_CD_MST 상태코드 마스터
-- CD900 계열 표준 규칙 적용
-- 아이콘 테이블 연동 지원
-- SQL 예약어 DESC 대신 DESCR 사용
-- ==============================================
CREATE TABLE IF NOT EXISTS TB_STS_CD_MST (
    CD          VARCHAR(20)     NOT NULL PRIMARY KEY,
    NM          VARCHAR(100)    NOT NULL,
    DESCR       VARCHAR(500),
    COLR        VARCHAR(7),
    ICON_CD     VARCHAR(20),
    ORD         INT             DEFAULT 999,
    BG_COLR     VARCHAR(10)     DEFAULT '#F3F4F6',
    TXT_COLR    VARCHAR(10)     DEFAULT '#374151',
    REG_DT      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UPD_DT      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- CD900 계열 기본 데이터
INSERT INTO TB_STS_CD_MST (CD, NM, DESCR, COLR, ICON_CD, ORD, BG_COLR, TXT_COLR) VALUES
('CD901', '성공', '✅', '#dcfce7', '#166534', 999, '#dcfce7', '#166534'),
('CD902', '실패', '❌', '#fee2e2', '#991b1b', 999, '#fee2e2', '#991b1b'),
('CD903', '데이터 존재안함', '⚫', '#fef9c3', '#854d0e', 999, '#fef9c3', '#854d0e'),
('CD904', '진행중', '💾', '#ededed', '#374151', 999, '#ededed', '#374151'),
('CD905', 'DMZ완료', '🛡️', '#ededed', '#828282', 999, '#ededed', '#828282'),
('CD906', '재시도', '🔄', '#ccddff', '#12299b', 999, '#ccddff', '#12299b'),
('CD907', '예정', '📅', '#ededed', '#6b7280', 999, '#ededed', '#6b7280'),
('CD908', '미수집', '⏱️', '#fff352', '#7d8000', 999, '#fff352', '#7d8000')
ON CONFLICT (CD) DO UPDATE SET
    NM = EXCLUDED.NM,
    DESCR = EXCLUDED.DESCR,
    COLR = EXCLUDED.COLR,
    ICON_CD = EXCLUDED.ICON_CD,
    ORD = EXCLUDED.ORD,
    BG_COLR = EXCLUDED.BG_COLR,
    TXT_COLR = EXCLUDED.TXT_COLR,
    UPD_DT = CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS IDX_TB_STS_CD_MST_ORD ON TB_STS_CD_MST(ORD);

COMMENT ON COLUMN TB_STS_CD_MST.BG_COLR IS '상태별 배경색';
COMMENT ON COLUMN TB_STS_CD_MST.TXT_COLR IS '상태별 텍스트색';