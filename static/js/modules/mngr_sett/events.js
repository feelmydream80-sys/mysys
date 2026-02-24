// import { showMessage, showConfirm } from '../common/utils.js'; // toast.js를 직접 사용
import { showToast } from '../../utils/toast.js';
import { showConfirm } from '../common/utils.js';
import { saveAllSettingsApi, saveIconApi, deleteIconApi, toggleIconDisplayApi, exportSettingsApi, importSettingsApi, exportIconsApi, importIconsApi } from '../common/api/mngr_sett.js';
import { getAdminSettings, getIcons, refreshIconsData } from './data.js';
import { renderSettingsTable, renderIconTable, populateIconSelects, hideIconForm, displayIconForm } from './ui.js';

// @DOC: 이 파일은 관리자 설정 페이지의 모든 사용자 이벤트 처리와 관련된 함수들을 포함합니다.
// '저장', '삭제', '가져오기', '내보내기' 등과 같은 버튼 클릭 이벤트를 처리하고,
// 관련 API를 호출하여 서버와 통신하는 로직을 담당합니다.

/**
 * @DOC: '모든 설정 저장' 버튼 클릭 시 호출됩니다.
 * 테이블의 모든 설정 값을 수집하여 서버에 저장하고, 성공 시 테이블을 다시 렌더링합니다.
 * @example
 * // HTML의 '저장' 버튼에 연결됩니다.
 * // <button onclick="window.saveBasicSettings()">기본 설정 저장</button>
 */
export async function saveBasicSettings() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const adminLoadingOverlay = container.querySelector('#adminLoadingOverlay');
    const settingsTableBody = container.querySelector('#settingsTableBody');

    if (adminLoadingOverlay) adminLoadingOverlay.classList.remove('hidden');

    const settingsMap = new Map();
    if (settingsTableBody) {
        settingsTableBody.querySelectorAll('tr').forEach(row => {
        const cd = row.dataset.cd;
        if (!cd) {
            console.warn("Row without data-cd found, skipping.", row);
            return;
        }
        const setting = { cd: cd };
        row.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            if (input.type === 'checkbox') {
                setting[field] = input.checked ? 'Y' : 'N';
            } else if (input.type === 'number') {
                setting[field] = parseFloat(input.value) || 0;
            } else if (input.tagName === 'SELECT' && field.includes('icon')) {
                setting[field] = input.value ? parseInt(input.value) : null;
            } else {
                setting[field] = input.value;
            }
        });
        settingsMap.set(cd, setting);
        });
    }

    const settingsToSave = Array.from(settingsMap.values());
    const payload = { mngr_settings: settingsToSave };

    try {
        if (settingsToSave.some(s => !s.cd)) {
            throw new Error("Job ID(cd)가 비어있는 항목이 있어 저장할 수 없습니다.");
        }
        await saveAllSettingsApi(payload);
        showToast('기본 설정이 성공적으로 저장되었습니다.', 'success');
        // location.reload(); // 저장 후 자동 새로고침이 필요하다면 주석 해제
    } catch (error) {
        console.error('Error saving basic settings:', error);
        showToast('기본 설정 저장 실패: ' + error.message, 'error');
    } finally {
        if (adminLoadingOverlay) adminLoadingOverlay.classList.add('hidden');
    }
}

/**
 * @DOC: '차트 설정 저장' 버튼 클릭 시 호출됩니다.
 * 차트/시각화 설정 테이블의 모든 값을 수집하여 서버에 저장합니다.
 * @example
 * // <button onclick="window.saveChartSettings()">차트 설정 저장</button>
 */
export async function saveChartSettings() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const adminLoadingOverlay = container.querySelector('#adminLoadingOverlay');
    const chartSettingsTableBody = container.querySelector('#chartSettingsTableBody');

    if (adminLoadingOverlay) adminLoadingOverlay.classList.remove('hidden');

    const settingsMap = new Map();
    if (chartSettingsTableBody) {
        chartSettingsTableBody.querySelectorAll('tr').forEach(row => {
        const cd = row.dataset.cd;
        if (!cd) return;
        const setting = { cd: cd };
        row.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            if (field !== 'cd_nm') { // cd_nm은 읽기 전용이므로 제외
                setting[field] = input.value;
            }
        });
        settingsMap.set(cd, setting);
        });
    }

    const settingsToSave = Array.from(settingsMap.values());
    const payload = { mngr_settings: settingsToSave };

    try {
        if (settingsToSave.some(s => !s.cd)) {
            throw new Error("Job ID(cd)가 비어있는 항목이 있어 저장할 수 없습니다.");
        }
        await saveAllSettingsApi(payload);
        showToast('차트 설정이 성공적으로 저장되었습니다.', 'success');
    } catch (error) {
        console.error('Error saving chart settings:', error);
        showToast('차트 설정 저장 실패: ' + error.message, 'error');
    } finally {
        if (adminLoadingOverlay) adminLoadingOverlay.classList.add('hidden');
    }
}

/**
 * @DOC: '설정 내보내기' 버튼 클릭 시 호출됩니다.
 * 서버에 설정 내보내기를 요청하여 현재 모든 관리자 설정을 JSON 파일로 다운로드합니다.
 * @example
 * // <button onclick="window.exportSettings()">설정 내보내기 (JSON)</button>
 */
export async function exportSettings() {
    try {
        await exportSettingsApi();
        showToast('설정을 성공적으로 내보냈습니다.', 'success');
    } catch (error) {
        console.error('Error exporting settings:', error);
        showToast('설정 내보내기 실패: ' + error.message, 'error');
    }
};

/**
 * @DOC: '설정 가져오기' 버튼 클릭 시 호출됩니다.
 * 사용자가 선택한 JSON 파일을 서버로 전송하여 설정을 가져오고, 성공 시 화면을 업데이트합니다.
 * @example
 * // <input type="file" id="importFile" onchange="window.importSettings()">
 */
export async function importSettings() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const adminLoadingOverlay = container.querySelector('#adminLoadingOverlay');
    const importFileInput = container.querySelector('#importFile');

    const file = importFileInput ? importFileInput.files[0] : null;
    if (!file) {
        showToast('가져올 JSON 파일을 선택해주세요.', 'warning');
        return;
    }

    if (adminLoadingOverlay) {
        adminLoadingOverlay.classList.remove('hidden');
    }

    try {
        await importSettingsApi(file);
        showToast('설정이 성공적으로 가져오기되었습니다.', 'success');
        const [allMngrSett, allIcons] = await Promise.all([getAdminSettings(), getIcons()]);
        renderSettingsTable(allMngrSett, allIcons);
        populateIconSelects(allIcons);
        if (typeof window.renderJobCheckboxes === 'function') {
            window.renderJobCheckboxes();
        }
    } catch (error) {
        console.error('Error importing settings:', error);
        showToast('설정 가져오기 실패: ' + error.message, 'error');
    } finally {
        if (adminLoadingOverlay) {
            adminLoadingOverlay.classList.add('hidden');
        }
    }
};

/**
 * @DOC: 아이콘 관리 UI(추가, 저장, 취소 버튼)에 대한 이벤트 리스너를 초기화합니다.
 * 페이지 로드 시 한 번만 호출되어 아이콘 관리 폼의 버튼들을 활성화합니다.
 * @example
 * // 페이지 초기화 과정에서 호출됩니다.
 * // initializeIconManagementUI();
 */
export function initializeIconManagementUI() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    container.querySelector('#addIconBtn')?.addEventListener('click', () => displayIconForm());
    container.querySelector('#saveIconBtn')?.addEventListener('click', saveIcon);
    container.querySelector('#cancelIconEditBtn')?.addEventListener('click', hideIconForm);
}

/**
 * @DOC: '아이콘 추가/업데이트' 버튼 클릭 시 호출됩니다.
 * 폼에서 아이콘 데이터를 수집하여 서버에 저장(추가 또는 수정)하고, 성공 시 아이콘 목록을 새로고침합니다.
 * @example
 * // '아이콘 추가' 또는 '아이콘 업데이트' 버튼에 연결됩니다.
 * // document.getElementById('saveIconBtn').addEventListener('click', saveIcon);
 */
export async function saveIcon() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const adminLoadingOverlay = container.querySelector('#adminLoadingOverlay');

    const iconData = {
        ICON_ID: container.querySelector('#iconId').value ? parseInt(container.querySelector('#iconId').value) : null,
        ICON_CD: container.querySelector('#iconCode').value,
        ICON_NM: container.querySelector('#iconName').value,
        ICON_EXPL: container.querySelector('#iconDescription').value,
        ICON_DSP_YN: container.querySelector('#iconDisplayYn').value === 'Y' ? true : false
    };

    if (!iconData.ICON_CD || !iconData.ICON_NM) {
        showToast('아이콘 코드와 이름은 필수 항목입니다.', 'warning');
        return;
    }

    if (adminLoadingOverlay) {
        adminLoadingOverlay.classList.remove('hidden');
    }
    try {
        await saveIconApi(iconData);
        showToast('아이콘이 성공적으로 저장되었습니다.', 'success');
        hideIconForm();
        const allIcons = await refreshIconsData();
        renderIconTable(allIcons);
        populateIconSelects(allIcons);
    } catch (error) {
        console.error("Failed to save icon:", error);
        showToast('아이콘 저장 실패: ' + error.message, 'error');
    } finally {
        if (adminLoadingOverlay) {
            adminLoadingOverlay.classList.add('hidden');
        }
    }
}

/**
 * @DOC: 아이콘 목록의 '삭제' 버튼 클릭 시 호출됩니다.
 * 사용자에게 삭제 확인을 요청한 후, 서버에 아이콘 삭제를 요청하고 목록을 새로고침합니다.
 * @param {number} iconId - 삭제할 아이콘의 ID.
 * @example
 * // 각 아이콘 행의 삭제 버튼에 이벤트 리스너로 연결됩니다.
 * // button.addEventListener('click', () => confirmAndDeleteIcon(icon.icon_id));
 */
export async function confirmAndDeleteIcon(iconId) {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const adminLoadingOverlay = container.querySelector('#adminLoadingOverlay');

    showConfirm('정말로 이 아이콘을 삭제하시겠습니까?', async () => {
        if (adminLoadingOverlay) {
            adminLoadingOverlay.classList.remove('hidden');
        }
        try {
            await deleteIconApi(iconId);
            showToast('아이콘이 성공적으로 삭제되었습니다.', 'success');
            const allIcons = await refreshIconsData();
            renderIconTable(allIcons);
            populateIconSelects(allIcons);
        } catch (error) {
            console.error('Error deleting icon:', error);
            showToast('아이콘 삭제 실패: ' + error.message, 'error');
        } finally {
            if (adminLoadingOverlay) {
                adminLoadingOverlay.classList.add('hidden');
            }
        }
    });
}

/**
 * @DOC: 아이콘 목록의 '표시 여부' 체크박스 변경 시 호출됩니다.
 * 아이콘의 표시 상태(Y/N)를 서버에 업데이트하고, 성공 시 아이콘 선택 드롭다운을 새로고침합니다.
 * @param {Event} event - 체크박스 변경 이벤트 객체.
 * @example
 * // 각 아이콘 행의 표시 여부 체크박스에 이벤트 리스너로 연결됩니다.
 * // checkbox.addEventListener('change', toggleIconDisplayStatus);
 */
export async function toggleIconDisplayStatus(event) {
    const iconId = parseInt(event.target.dataset.iconId);
    const displayYn = event.target.checked ? true : false;
    try {
        await toggleIconDisplayApi(iconId, displayYn);
        showToast('아이콘 표시 여부가 업데이트되었습니다.', 'success');
        const allIcons = await refreshIconsData();
        populateIconSelects(allIcons);
    } catch (error) {
        console.error('Error toggling icon display:', error);
        showToast('아이콘 표시 여부 업데이트 실패: ' + error.message, 'error');
        event.target.checked = !displayYn;
    }
}

/**
 * @DOC: '아이콘 내보내기' 버튼 클릭 시 호출됩니다.
 * 서버에 아이콘 내보내기를 요청하여 모든 아이콘 데이터를 CSV 파일로 다운로드합니다.
 * @example
 * // <button onclick="window.exportIcons()">아이콘 내보내기 (CSV)</button>
 */
export async function exportIcons() {
    try {
        await exportIconsApi();
        showToast('아이콘을 성공적으로 내보냈습니다.', 'success');
    } catch (error) {
        console.error('Error exporting icons:', error);
        showToast('아이콘 내보내기 실패: ' + error.message, 'error');
    }
};

/**
 * @DOC: '아이콘 가져오기' 버튼 클릭 시 호출됩니다.
 * 사용자가 선택한 CSV 파일을 서버로 전송하여 아이콘을 가져오고, 성공 시 화면을 업데이트합니다.
 * @example
 * // <input type="file" id="importIconsFile" onchange="window.importIcons()">
 */
export async function importIcons() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const adminLoadingOverlay = container.querySelector('#adminLoadingOverlay');
    const importIconsFile = container.querySelector('#importIconsFile');

    const file = importIconsFile ? importIconsFile.files[0] : null;
    if (!file) {
        showToast('가져올 CSV 파일을 선택해주세요.', 'warning');
        return;
    }

    if (adminLoadingOverlay) {
        adminLoadingOverlay.classList.remove('hidden');
    }

    try {
        await importIconsApi(file);
        showToast('아이콘이 성공적으로 가져오기되었습니다.', 'success');
        const allIcons = await refreshIconsData();
        renderIconTable(allIcons);
        populateIconSelects(allIcons);
    } catch (error) {
        console.error('Error importing icons:', error);
        showToast('아이콘 가져오기 실패: ' + error.message, 'error');
    } finally {
        if (adminLoadingOverlay) {
            adminLoadingOverlay.classList.add('hidden');
        }
    }
};

/**
 * @DOC: 관리자 설정과 아이콘 목록을 동시에 로드하기 위한 내부 헬퍼 함수입니다.
 * `Promise.all`을 사용하지 않고 순차적으로 호출하여 각 데이터 로드를 보장합니다.
 * @returns {Promise<Object>} `{ allAdminSettings, allIcons }` 형태의 객체를 반환합니다.
 */
async function loadAllMngrSettAndIcons() {
    const allMngrSett = await getAdminSettings();
    const allIcons = await getIcons();
    return { allMngrSett, allIcons };
}
