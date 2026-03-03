// static/js/modules/common/api/mngr_sett.js
import { showMessage } from '../utils.js';
import { updateApiStatus } from './client.js';

const BASE_URL = '';

/**
 * @AI_NOTE: 모든 관리자 설정 데이터를 가져옵니다.
 * @returns {Promise<Array<Object>>} 관리자 설정 데이터 배열
 */
export async function fetchAllMngrSett() {
    console.log('=== fetchAllMngrSett() called ===');
    const apiName = "mngrSettFetch";
    updateApiStatus(apiName, "apiCallAttempted", true);
    updateApiStatus(apiName, "apiCallSuccess", false);
    updateApiStatus(apiName, "apiResponseCount", 0);
    updateApiStatus(apiName, "error", null);

    try {
        const url = `${BASE_URL}/api/mngr_sett/settings/all`;
        console.log('=== fetchAllMngrSett() - fetching from:', url);
        const response = await fetch(url);
        console.log('=== fetchAllMngrSett() - response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const data = await response.json();
        console.log('=== fetchAllMngrSett() - data received:', data);
        showMessage('관리자 설정 데이터 로드 성공.', 'success');
        updateApiStatus(apiName, "apiCallSuccess", true);
        updateApiStatus(apiName, "apiResponseCount", data.length);
        return data;
    } catch (error) {
        console.error("관리자 설정 데이터 로드 실패:", error);
        showMessage('관리자 설정 데이터 로드 실패: ' + error.message, 'error');
        updateApiStatus(apiName, "error", error.message);
        throw error;
    }
}

/**
 * @AI_NOTE: 모든 아이콘 데이터를 가져옵니다.
 * @returns {Promise<Array<Object>>} 아이콘 데이터 배열
 */
export async function fetchAllIcons() {
    console.log('=== fetchAllIcons() called ===');
    const apiName = "iconsFetch";
    updateApiStatus(apiName, "apiCallAttempted", true);
    updateApiStatus(apiName, "apiCallSuccess", false);
    updateApiStatus(apiName, "apiResponseCount", 0);
    updateApiStatus(apiName, "error", null);

    try {
        const url = `${BASE_URL}/api/mngr_sett/icons/all`;
        console.log('=== fetchAllIcons() - fetching from:', url);
        const response = await fetch(url);
        console.log('=== fetchAllIcons() - response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const data = await response.json();
        console.log('=== fetchAllIcons() - data received:', data);
        showMessage('아이콘 데이터 로드 성공.', 'success');
        updateApiStatus(apiName, "apiCallSuccess", true);
        updateApiStatus(apiName, "apiResponseCount", data.length);
        return data;
    } catch (error) {
        console.error("아이콘 데이터 로드 실패:", error);
        showMessage('아이콘 데이터 로드 실패: ' + error.message, 'error');
        updateApiStatus(apiName, "error", error.message);
        throw error;
    }
}

/**
 * @AI_NOTE: 관리자 설정을 저장하거나 업데이트합니다.
 * @param {Array<Object>} settingsData - 저장할 설정 데이터 배열
 * @returns {Promise<Object>} API 응답 데이터
 */
export async function saveAllSettingsApi(settingsData) {
    const apiName = "adminSettingsUpdate";
    updateApiStatus(apiName, "apiCallInitiated", true);
    updateApiStatus(apiName, "apiCallSuccess", false);
    updateApiStatus(apiName, "error", null);
    try {
        const response = await fetch(`${BASE_URL}/api/mngr_sett/settings/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        showMessage('관리자 설정 저장 성공.', 'success');
        updateApiStatus(apiName, "apiCallSuccess", true);
        return result;
    } catch (error) {
        console.error("API: saveAllSettingsApi 실패:", error);
        showMessage(`관리자 설정 저장 실패: ${error.message}`, 'error');
        updateApiStatus(apiName, "error", error.message);
        throw error;
    }
}

/**
 * @AI_NOTE: 아이콘을 저장하거나 업데이트합니다.
 * @param {Object} iconData - 저장할 아이콘 데이터
 * @returns {Promise<Object>} API 응답 데이터
 */
export async function saveIconApi(iconData) {
    const apiName = "iconUpdate";
    updateApiStatus(apiName, "apiCallInitiated", true);
    updateApiStatus(apiName, "apiCallSuccess", false);
    updateApiStatus(apiName, "error", null);
    try {
        const response = await fetch(`${BASE_URL}/api/mngr_sett/icons/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(iconData),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        showMessage('아이콘 저장 성공.', 'success');
        updateApiStatus(apiName, "apiCallSuccess", true);
        return result;
    } catch (error) {
        console.error("API: saveIconApi 실패:", error);
        showMessage(`아이콘 저장 실패: ${error.message}`, 'error');
        updateApiStatus(apiName, "error", error.message);
        throw error;
    }
}

/**
 * @AI_NOTE: 아이콘을 삭제합니다.
 * @param {number} iconId - 삭제할 아이콘의 ID
 * @returns {Promise<Object>} API 응답 데이터
 */
export async function deleteIconApi(iconId) {
    const apiName = "iconDelete";
    updateApiStatus(apiName, "apiCallInitiated", true);
    updateApiStatus(apiName, "apiCallSuccess", false);
    updateApiStatus(apiName, "error", null);
    try {
        const response = await fetch(`${BASE_URL}/api/mngr_sett/icons/delete/${iconId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        showMessage('아이콘 삭제 성공.', 'success');
        updateApiStatus(apiName, "apiCallSuccess", true);
        return result;
    } catch (error) {
        console.error("API: deleteIconApi 실패:", error);
        showMessage(`아이콘 삭제 실패: ${error.message}`, 'error');
        updateApiStatus(apiName, "error", error.message);
        throw error;
    }
}

/**
 * @AI_NOTE: 아이콘의 표시 여부를 토글합니다.
 * @param {number} iconId - 아이콘의 ID
 * @param {string} displayYn - 'Y' 또는 'N'
 * @returns {Promise<Object>} API 응답 데이터
 */
export async function toggleIconDisplayApi(iconId, displayYn) {
    const apiName = "iconToggleDisplay";
    updateApiStatus(apiName, "apiCallInitiated", true);
    updateApiStatus(apiName, "apiCallSuccess", false);
    updateApiStatus(apiName, "error", null);
    try {
        const response = await fetch(`${BASE_URL}/api/mngr_sett/icons/toggle-display`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ icon_id: iconId, display_yn: displayYn }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        showMessage('아이콘 표시 여부 업데이트 성공.', 'success');
        updateApiStatus(apiName, "apiCallSuccess", true);
        return result;
    } catch (error) {
        console.error("API: toggleIconDisplayApi 실패:", error);
        showMessage(`아이콘 표시 여부 업데이트 실패: ${error.message}`, 'error');
        updateApiStatus(apiName, "error", error.message);
        throw error;
    }
}

/**
 * @AI_NOTE: 관리자 설정을 JSON 파일로 내보냅니다.
 * @returns {Promise<void>}
 */
export async function exportSettingsApi() {
    try {
        const response = await fetch(`${BASE_URL}/api/mngr_sett/settings/export`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'admin_settings.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showMessage('설정 내보내기 성공.', 'success');
    } catch (error) {
        console.error("API: exportSettingsApi 실패:", error);
        showMessage(`설정 내보내기 실패: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * @AI_NOTE: JSON 파일을 통해 관리자 설정을 가져옵니다.
 * @param {File} file - 가져올 JSON 파일 객체
 * @returns {Promise<Object>} API 응답 데이터
 */
export async function importSettingsApi(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${BASE_URL}/api/mngr_sett/settings/import`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        showMessage('설정 가져오기 성공.', 'success');
        return result;
    } catch (error) {
        console.error("API: importSettingsApi 실패:", error);
        showMessage(`설정 가져오기 실패: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * @AI_NOTE: 아이콘 목록을 CSV 파일로 내보냅니다.
 * @returns {Promise<void>}
 */
export async function exportIconsApi() {
    try {
        const response = await fetch(`${BASE_URL}/api/mngr_sett/icons/export`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'icons.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showMessage('아이콘 내보내기 성공.', 'success');
    } catch (error) {
        console.error("API: exportIconsApi 실패:", error);
        showMessage(`아이콘 내보내기 실패: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * @AI_NOTE: CSV 파일을 통해 아이콘 목록을 가져옵니다.
 * @param {File} file - 가져올 CSV 파일 객체
 * @returns {Promise<Object>} API 응답 데이터
 */
export async function importIconsApi(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${BASE_URL}/api/mngr_sett/icons/import`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const result = await response.json();
        showMessage('아이콘 가져오기 성공.', 'success');
        return result;
    } catch (error) {
        console.error("API: importIconsApi 실패:", error);
        showMessage(`아이콘 가져오기 실패: ${error.message}`, 'error');
        throw error;
    }
}
