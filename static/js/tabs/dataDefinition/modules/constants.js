// 데이터 정의 공통 상수 및 필드 정의
export const FIELD_DEFINITIONS = {
    'CD100': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8'],
    'CD200': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8'],
    'CD1000': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'],
    'CD2000': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10']
};

export const FIELD_LABELS = {
    'cd_desc': '활용목적',
    'item1': 'Category ID',
    'item2': 'Category', 
    'item3': 'Columns',
    'item4': 'save_path',
    'item5': 'filename',
    'item6': 'duration',
    'item7': 'URL',
    'item8': 'API_KEY',
    'item9': '추가 필드 9',
    'item10': '추가 필드 10'
};

export const DEFAULT_COLUMNS = [
    { key: 'CD', label: '코드' },
    { key: 'cd_nm', label: '명칭' },
    { key: 'cd_desc', label: '활용목적' },
    { key: 'use_yn', label: '사용여부' },
    { key: 'update_dt', label: '수정일시' }
];

export const DISPLAY_OPTIONS = [
    { value: 'codeName', label: '코드+명칭', default: true },
    { value: 'name', label: '명칭' },
    { value: 'deleted', label: '삭제그룹' }
];

export const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

export const API_ENDPOINTS = {
    GROUPS: 'data_definition/groups',
    CREATE: 'data_definition/create',
    GROUP_UPDATE: 'data_definition/group',
    DETAIL_UPDATE: 'data_definition/detail'
};