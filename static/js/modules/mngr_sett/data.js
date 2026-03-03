import { getAdminSettings as fetchAdminSettings, getIcons as fetchIcons, refreshAdminSettings, refreshIcons } from '../common/dataManager.js';

// @DOC: 이 파일은 서버로부터 관리자 설정 관련 데이터를 가져오고 관리하는 역할을 합니다.
// 데이터 캐싱을 통해 중복 API 호출을 방지하고 애플리케이션의 성능을 향상시킵니다.
// v2: 공통 데이터 관리 모듈(dataManager.js) 기반으로 리팩토링

/**
 * @DOC: 서버에서 모든 관리자 설정 데이터를 비동기적으로 가져옵니다.
 * 공통 데이터 관리 모듈을 통해 캐시된 데이터를 반환합니다.
 * @returns {Promise<Array<Object>>} 성공 시 관리자 설정 데이터 배열을, 실패 시 에러를 반환합니다.
 */
export function getAdminSettings() {
    console.log('=== mngr_sett.data.getAdminSettings() called ===');
    return fetchAdminSettings();
}

/**
 * @DOC: 서버에서 모든 아이콘 데이터를 비동기적으로 가져옵니다.
 * 공통 데이터 관리 모듈을 통해 캐시된 데이터를 반환합니다.
 * @returns {Promise<Array<Object>>} 성공 시 아이콘 데이터 배열을, 실패 시 에러를 반환합니다.
 */
export function getIcons() {
    console.log('=== mngr_sett.data.getIcons() called ===');
    return fetchIcons();
}

/**
 * @DOC: 관리자 설정 데이터를 invalidate하고 재로딩합니다.
 * 공통 데이터 관리 모듈의 캐시를 갱신합니다.
 * @returns {Promise<Array<Object>>} 새로 로딩된 관리자 설정 데이터
 */
export function refreshAdminSettingsData() {
    return refreshAdminSettings();
}

/**
 * @DOC: 아이콘 데이터를 invalidate하고 재로딩합니다.
 * 공통 데이터 관리 모듈의 캐시를 갱신합니다.
 * @returns {Promise<Array<Object>>} 새로 로딩된 아이콘 데이터
 */
export function refreshIconsData() {
    return refreshIcons();
}