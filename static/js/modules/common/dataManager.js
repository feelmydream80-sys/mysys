// static/js/modules/common/dataManager.js
import { showMessage } from './utils.js';
import { fetchAllMngrSett, fetchAllIcons } from './api/mngr_sett.js';
import { fetchAllMstList } from './api/mst.js';

/**
 * @module dataManager
 * @description 애플리케이션 전역에서 공통으로 사용되는 데이터를 관리하는 모듈
 * - 데이터 캐싱을 통한 중복 API 호출 방지
 * - 각 페이지에서 필요한 데이터를 단일 소스에서 제공
 * - 데이터 로딩 상태 및 에러 관리
 */

// 데이터 캐시 객체
const dataCache = {
    adminSettings: null,
    icons: null,
    mstList: null
};

// 데이터 로딩 상태 추적
const loadingStatus = {
    adminSettings: false,
    icons: false,
    mstList: false
};

// 로딩 프로미스 (중복 호출 방지용)
let loadingPromises = {
    adminSettings: null,
    icons: null,
    mstList: null
};

/**
 * @description 관리자 설정 데이터를 가져옵니다 (캐시된 데이터 반환)
 * @returns {Promise<Array>} 관리자 설정 데이터 배열
 */
export async function getAdminSettings() {
    console.log('=== dataManager.getAdminSettings() called ===');
    // 이미 로딩 중인 경우 기존 프로미스 반환
    if (loadingPromises.adminSettings) {
        console.log('=== dataManager.getAdminSettings() - already loading ===');
        return loadingPromises.adminSettings;
    }
    
    // 캐시된 데이터가 있는 경우 반환
    if (dataCache.adminSettings) {
        console.log('=== dataManager.getAdminSettings() - returning cached data ===');
        console.log('=== Cached data:', dataCache.adminSettings);
        return JSON.parse(JSON.stringify(dataCache.adminSettings));
    }
    
    // 로딩 시작
    loadingStatus.adminSettings = true;
    
    // API 호출
    console.log('=== dataManager.getAdminSettings() - fetching from API ===');
    loadingPromises.adminSettings = fetchAllMngrSett()
        .then(data => {
            console.log('=== dataManager.getAdminSettings() - API response received ===');
            console.log('=== API data:', data);
            dataCache.adminSettings = JSON.parse(JSON.stringify(data));
            return JSON.parse(JSON.stringify(dataCache.adminSettings));
        })
        .catch(error => {
            console.error("Failed to load admin settings:", error);
            showMessage('관리자 설정 로드 실패: ' + error.message, 'error');
            throw error;
        })
        .finally(() => {
            loadingStatus.adminSettings = false;
            loadingPromises.adminSettings = null;
        });
    
    return loadingPromises.adminSettings;
}

/**
 * @description 아이콘 데이터를 가져옵니다 (캐시된 데이터 반환)
 * @returns {Promise<Array>} 아이콘 데이터 배열
 */
export async function getIcons() {
    console.log('=== dataManager.getIcons() called ===');
    // 이미 로딩 중인 경우 기존 프로미스 반환
    if (loadingPromises.icons) {
        console.log('=== dataManager.getIcons() - already loading ===');
        return loadingPromises.icons;
    }
    
    // 캐시된 데이터가 있는 경우 반환
    if (dataCache.icons) {
        console.log('=== dataManager.getIcons() - returning cached data ===');
        console.log('=== Cached data:', dataCache.icons);
        return JSON.parse(JSON.stringify(dataCache.icons));
    }
    
    // 로딩 시작
    loadingStatus.icons = true;
    
    // API 호출
    console.log('=== dataManager.getIcons() - fetching from API ===');
    loadingPromises.icons = fetchAllIcons()
        .then(data => {
            console.log('=== dataManager.getIcons() - API response received ===');
            console.log('=== API data:', data);
            dataCache.icons = JSON.parse(JSON.stringify(data));
            return JSON.parse(JSON.stringify(dataCache.icons));
        })
        .catch(error => {
            console.error("Failed to load icons:", error);
            showMessage('아이콘 목록 로드 실패: ' + error.message, 'error');
            throw error;
        })
        .finally(() => {
            loadingStatus.icons = false;
            loadingPromises.icons = null;
        });
    
    return loadingPromises.icons;
}

/**
 * @description MST 목록 데이터를 가져옵니다 (캐시된 데이터 반환)
 * @returns {Promise<Array>} MST 목록 데이터 배열
 */
export async function getMstList() {
    // 이미 로딩 중인 경우 기존 프로미스 반환
    if (loadingPromises.mstList) {
        return loadingPromises.mstList;
    }
    
    // 캐시된 데이터가 있는 경우 반환
    if (dataCache.mstList) {
        return JSON.parse(JSON.stringify(dataCache.mstList));
    }
    
    // 로딩 시작
    loadingStatus.mstList = true;
    
    // API 호출
    loadingPromises.mstList = fetchAllMstList()
        .then(data => {
            dataCache.mstList = JSON.parse(JSON.stringify(data));
            return JSON.parse(JSON.stringify(dataCache.mstList));
        })
        .catch(error => {
            console.error("Failed to load MST list:", error);
            showMessage('MST 목록 로드 실패: ' + error.message, 'error');
            throw error;
        })
        .finally(() => {
            loadingStatus.mstList = false;
            loadingPromises.mstList = null;
        });
    
    return loadingPromises.mstList;
}

/**
 * @description 필요한 모든 공통 데이터를 병렬로 로딩합니다
 * @param {Array} dataTypes - 로딩할 데이터 타입 배열 (adminSettings, icons, mstList)
 * @returns {Promise<Object>} 로딩된 데이터를 포함하는 객체
 */
export async function loadCommonData(dataTypes = ['adminSettings', 'icons', 'mstList']) {
    const promises = [];
    const result = {};
    
    if (dataTypes.includes('adminSettings')) {
        promises.push(getAdminSettings().then(data => { result.adminSettings = data; }));
    }
    
    if (dataTypes.includes('icons')) {
        promises.push(getIcons().then(data => { result.icons = data; }));
    }
    
    if (dataTypes.includes('mstList')) {
        promises.push(getMstList().then(data => { result.mstList = data; }));
    }
    
    await Promise.all(promises);
    return result;
}

/**
 * @description 관리자 설정 데이터를 invalidate하고 재로딩합니다
 * @returns {Promise<Array>} 새로 로딩된 관리자 설정 데이터
 */
export async function refreshAdminSettings() {
    dataCache.adminSettings = null;
    return getAdminSettings();
}

/**
 * @description 아이콘 데이터를 invalidate하고 재로딩합니다
 * @returns {Promise<Array>} 새로 로딩된 아이콘 데이터
 */
export async function refreshIcons() {
    dataCache.icons = null;
    return getIcons();
}

/**
 * @description MST 목록 데이터를 invalidate하고 재로딩합니다
 * @returns {Promise<Array>} 새로 로딩된 MST 목록 데이터
 */
export async function refreshMstList() {
    dataCache.mstList = null;
    return getMstList();
}

/**
 * @description 모든 데이터 캐시를 invalidate하고 재로딩합니다
 * @returns {Promise<Object>} 새로 로딩된 모든 데이터
 */
export async function refreshAllData() {
    dataCache.adminSettings = null;
    dataCache.icons = null;
    dataCache.mstList = null;
    
    return loadCommonData();
}

/**
 * @description 데이터 로딩 상태를 반환합니다
 * @returns {Object} 로딩 상태 객체
 */
export function getLoadingStatus() {
    return { ...loadingStatus };
}

/**
 * @description 데이터 캐시 상태를 반환합니다
 * @returns {Object} 캐시 상태 객체
 */
export function getCacheStatus() {
    return {
        adminSettings: !!dataCache.adminSettings,
        icons: !!dataCache.icons,
        mstList: !!dataCache.mstList
    };
}