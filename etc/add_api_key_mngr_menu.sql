-- TB_MENU 테이블에 API 키 관리 메뉴 추가
INSERT INTO TB_MENU (
    MENU_ID,
    MENU_NM,
    MENU_URL,
    MENU_ORDER
) VALUES (
    'api_key_mngr',
    'API 키 관리',
    '/api_key_mngr',
    10
);

-- TB_USER_AUTH_CTRL 테이블에 관리자 권한 추가
INSERT INTO TB_USER_AUTH_CTRL (
    USER_ID,
    MENU_ID,
    AUTH_YN
) VALUES (
    'admin',
    'api_key_mngr',
    TRUE
);
