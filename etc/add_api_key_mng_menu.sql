-- TB_MENU 테이블에 API 키 관리 메뉴 추가
INSERT INTO TB_MENU (
    MENU_ID,
    MENU_NM,
    MENU_URL,
    PARENT_MENU_ID,
    MENU_LEVEL,
    MENU_ORDER,
    USE_YN,
    CREATED_DT,
    UPDATED_DT
) VALUES (
    'api_key_mng',
    'API 키 관리',
    '/api_key_mng',
    NULL,
    1,
    10,
    'Y',
    NOW(),
    NOW()
);

-- TB_USER_AUTH_CTRL 테이블에 관리자 권한 추가
INSERT INTO TB_USER_AUTH_CTRL (
    USER_ID,
    PERMISSION_TYPE,
    MENU_ID,
    USE_YN,
    CREATED_DT,
    UPDATED_DT
) VALUES (
    'admin',
    'mngr_sett',
    'api_key_mng',
    'Y',
    NOW(),
    NOW()
);