-- DDL for TB_GRP_MEMO table
-- 그룹 메모 테이블 (데이터 수집 일정 히트맵의 그룹별 메모 저장)

CREATE TABLE IF NOT EXISTS TB_GRP_MEMO (
    grp_id VARCHAR(20) NOT NULL,
    depth INTEGER NOT NULL DEFAULT 1,
    memo_date DATE NOT NULL,
    content TEXT,
    writer_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_grp_memo PRIMARY KEY (grp_id, depth, memo_date),
    CONSTRAINT tb_grp_memo_content_check CHECK (char_length(content) <= 2000)
);

COMMENT ON TABLE TB_GRP_MEMO IS '그룹 메모 테이블';
COMMENT ON COLUMN TB_GRP_MEMO.grp_id IS '그룹 ID (CD100, CD101 등)';
COMMENT ON COLUMN TB_GRP_MEMO.depth IS '그룹 깊이 (1=상위그룹, 2=하위그룹, 3=개별job)';
COMMENT ON COLUMN TB_GRP_MEMO.memo_date IS '메모 대상 날짜';
COMMENT ON COLUMN TB_GRP_MEMO.content IS '메모 내용 (최대 2000자)';
COMMENT ON COLUMN TB_GRP_MEMO.writer_id IS '작성자 ID';
COMMENT ON COLUMN TB_GRP_MEMO.created_at IS '생성일시';
COMMENT ON COLUMN TB_GRP_MEMO.updated_at IS '수정일시';

CREATE INDEX IF NOT EXISTS idx_grp_memo_date ON TB_GRP_MEMO(memo_date);
CREATE INDEX IF NOT EXISTS idx_grp_memo_grp_date ON TB_GRP_MEMO(grp_id, memo_date);