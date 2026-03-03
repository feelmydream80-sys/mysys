import { getRandomColorForAdmin } from '../mngr_sett/adminUtils.js';
import { showConfirm } from '../common/utils.js';
import { showToast } from '../../utils/toast.js';
import { saveIconApi } from '../common/api/mngr_sett.js';
import { getIcons, refreshIconsData } from '../mngr_sett/data.js';

// @DOC: 이 파일은 관리자 설정 페이지의 UI 렌더링 및 조작과 관련된 함수들을 포함합니다.
// DOM 요소 캐싱, 테이블 렌더링, 폼 표시/숨김 등 UI 로직을 담당하여 코드의 가독성과 유지보수성을 높입니다.

// @DOC: 이 파일은 관리자 설정 페이지의 UI 렌더링 및 조작과 관련된 함수들을 포함합니다.
// DOM 요소 캐싱, 테이블 렌더링, 폼 표시/숨김 등 UI 로직을 담당하여 코드의 가독성과 유지보수성을 높입니다.

// Module-level storage for event handlers, to be injected by the main page script.
let eventHandlers = {};

/**
 * Initializes the UI module with necessary event handlers to break circular dependencies.
 * This function should be called once when the page loads.
 * @param {object} handlers - An object containing event handler functions (e.g., { confirmAndDeleteIcon, toggleIconDisplayStatus }).
 */
export function initUI(handlers) {
    eventHandlers = handlers;
}

/**
 * @DOC: 탭 버튼 클릭 시 해당 탭 콘텐츠를 표시하는 기능을 설정합니다.
 * @example
 * // 페이지 로드 시 호출되어 탭 기능을 활성화합니다.
 * setupTabs();
 */
export function setupTabs() {
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            tab.classList.add('active');
            const targetTab = document.getElementById(tab.dataset.tab);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // 통계 탭이 활성화될 때 데이터 로드
            if (tab.dataset.tab === 'statistics') {
                // statisticsTab.activate() 호출은 mngr_sett.js에서 처리됨
            }
        });
    });
}

/**
 * @DOC: 관리자 설정 데이터를 받아 HTML 테이블로 렌더링합니다.
 * `allAdminSettings` 배열을 순회하며 각 설정 항목을 테이블의 행으로 만듭니다.
 * @param {Array<Object>} allAdminSettings - 표시할 관리자 설정 데이터 배열. `data.js`의 `allAdminSettings`가 사용됩니다.
 * @param {Array<Object>} allIcons - 아이콘 선택 드롭다운을 채우기 위한 아이콘 데이터 배열. `data.js`의 `allIcons`가 사용됩니다.
 * @example
 * // adminSettings와 icons 데이터를 사용하여 설정 테이블을 렌더링합니다.
 * // renderSettingsTable(adminSettings, icons);
 */
export function renderSettingsTable(allMngrSett, allIcons) {
    console.log('=== renderSettingsTable() called ===');
    console.log('=== allMngrSett:', allMngrSett);
    console.log('=== allIcons:', allIcons);
    
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const settingsTableBody = container.querySelector('#settingsTableBody');
    if (!settingsTableBody) return;

    settingsTableBody.innerHTML = '';

    if (!allMngrSett || allMngrSett.length === 0) {
        settingsTableBody.innerHTML = '<tr><td colspan="20" class="text-center py-4">표시할 Job ID가 없습니다. (tb_con_hist에 이력이 있는 Job ID만 표시됩니다.)</td></tr>';
        renderChartSettingsTable([]); // 차트 설정 테이블도 함께 렌더링
        return;
    }

    // Job ID를 숫자 값 기준으로 정렬 (CD100, CD300, CD1000 순서)
    const sortedMngrSett = allMngrSett.slice().sort((a, b) => {
        const aNum = parseInt(a.cd.replace('CD', ''));
        const bNum = parseInt(b.cd.replace('CD', ''));
        return aNum - bNum;
    });

    renderChartSettingsTable(sortedMngrSett); // 차트 설정 테이블도 함께 렌더링

    sortedMngrSett.forEach(setting => {
        const row = settingsTableBody.insertRow();
        row.dataset.cd = String(setting.cd);

        const cfFailIconId = setting.cnn_failr_icon_id !== undefined && setting.cnn_failr_icon_id !== null ? parseInt(setting.cnn_failr_icon_id) : null;
        const cfWarningIconId = setting.cnn_warn_icon_id !== undefined && setting.cnn_warn_icon_id !== null ? parseInt(setting.cnn_warn_icon_id) : null;
        const cfSuccessIconId = setting.cnn_sucs_icon_id !== undefined && setting.cnn_sucs_icon_id !== null ? parseInt(setting.cnn_sucs_icon_id) : null;
        const srSuccessIconId = setting.sucs_rt_sucs_icon_id !== undefined && setting.sucs_rt_sucs_icon_id !== null ? parseInt(setting.sucs_rt_sucs_icon_id) : null;
        const srWarningIconId = setting.sucs_rt_warn_icon_id !== undefined && setting.sucs_rt_warn_icon_id !== null ? parseInt(setting.sucs_rt_warn_icon_id) : null;

        row.innerHTML = `
            <td class="job-id-cell">${setting.cd}</td>
            <td><input type="text" value="${setting.cd_nm || setting.cd}" data-field="cd_nm" placeholder="Job 이름" readonly disabled></td>
            <td><input type="text" value="${setting.cd_desc || ''}" data-field="cd_desc" placeholder="Job 설명" readonly disabled></td>
            <td><input type="text" value="${setting.item5 || ''}" data-field="item5" placeholder="비고" readonly disabled></td>
            <td><input type="number" value="${setting.cnn_failr_thrs_val || 0}" data-field="cnn_failr_thrs_val"></td>
            <td>
                <select data-field="cnn_failr_icon_id" class="icon-select">
                    <option value="">선택 안 함</option>
                    ${allIcons.filter(icon => icon.icon_dsp_yn === true).map(icon => {
                        const isSelected = icon.icon_id === cfFailIconId;
                        return `<option value="${String(icon.icon_id)}" ${isSelected ? 'selected' : ''}>${icon.icon_cd}</option>`;
                    }).join('')}
                </select>
            </td>
            <td><input type="color" value="${setting.cnn_failr_wrd_colr || '#FF0000'}" data-field="cnn_failr_wrd_colr"></td>
            <td><input type="number" value="${setting.cnn_warn_thrs_val || 0}" data-field="cnn_warn_thrs_val"></td>
            <td>
                <select data-field="cnn_warn_icon_id" class="icon-select">
                    <option value="">선택 안 함</option>
                    ${allIcons.filter(icon => icon.icon_dsp_yn === true).map(icon => `<option value="${String(icon.icon_id)}" ${icon.icon_id === cfWarningIconId ? 'selected' : ''}>${icon.icon_cd}</option>`).join('')}
                </select>
            </td>
            <td><input type="color" value="${setting.cnn_warn_wrd_colr || '#FFA500'}" data-field="cnn_warn_wrd_colr"></td>
            <td>
                <select data-field="cnn_sucs_icon_id" class="icon-select">
                    <option value="">선택 안 함</option>
                    ${allIcons.filter(icon => icon.icon_dsp_yn === true).map(icon => `<option value="${String(icon.icon_id)}" ${icon.icon_id === cfSuccessIconId ? 'selected' : ''}>${icon.icon_cd}</option>`).join('')}
                </select>
            </td>
            <td><input type="color" value="${setting.cnn_sucs_wrd_colr || '#008000'}" data-field="cnn_sucs_wrd_colr"></td>
            <td><input type="number" step="0.01" value="${setting.dly_sucs_rt_thrs_val || 0}" data-field="dly_sucs_rt_thrs_val"></td>
            <td><input type="number" step="0.01" value="${setting.dd7_sucs_rt_thrs_val || 0}" data-field="dd7_sucs_rt_thrs_val"></td>
            <td><input type="number" step="0.01" value="${setting.mthl_sucs_rt_thrs_val || 0}" data-field="mthl_sucs_rt_thrs_val"></td>
            <td><input type="number" step="0.01" value="${setting.mc6_sucs_rt_thrs_val || 0}" data-field="mc6_sucs_rt_thrs_val"></td>
            <td><input type="number" step="0.01" value="${setting.yy1_sucs_rt_thrs_val || 0}" data-field="yy1_sucs_rt_thrs_val"></td>
            <td>
                <select data-field="sucs_rt_sucs_icon_id" class="icon-select">
                    <option value="">선택 안 함</option>
                    ${allIcons.filter(icon => icon.icon_dsp_yn === true).map(icon => `<option value="${String(icon.icon_id)}" ${icon.icon_id === srSuccessIconId ? 'selected' : ''}>${icon.icon_cd}</option>`).join('')}
                </select>
            </td>
            <td><input type="color" value="${setting.sucs_rt_sucs_wrd_colr || '#008000'}" data-field="sucs_rt_sucs_wrd_colr"></td>
            <td>
                <select data-field="sucs_rt_warn_icon_id" class="icon-select">
                    <option value="">선택 안 함</option>
                    ${allIcons.filter(icon => icon.icon_dsp_yn === true).map(icon => `<option value="${String(icon.icon_id)}" ${icon.icon_id === srWarningIconId ? 'selected' : ''}>${icon.icon_cd}</option>`).join('')}
                </select>
            </td>
            <td><input type="color" value="${setting.sucs_rt_warn_wrd_colr || '#FFA500'}" data-field="sucs_rt_warn_wrd_colr"></td>
            <td><input type="checkbox" ${setting.chrt_dsp_yn === true ? 'checked' : ''} data-field="chrt_dsp_yn"></td>
        `;

        // Add event listener for color inputs
        const colorInputs = row.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                // setActiveColorInput is defined in mngr_sett.js, so we call it from the global scope or pass it down
                if (window.setActiveColorInput) {
                    window.setActiveColorInput(e.target);
                }
            });
        });
    });
}

/**
 * @DOC: 차트/시각화 설정 데이터를 받아 HTML 테이블로 렌더링합니다.
 * @param {Array<Object>} allAdminSettings - 표시할 관리자 설정 데이터 배열.
 */
export function renderChartSettingsTable(allMngrSett) {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const chartSettingsTableBody = container.querySelector('#chartSettingsTableBody');
    if (!chartSettingsTableBody) return;

    chartSettingsTableBody.innerHTML = '';

    if (allMngrSett.length === 0) {
        chartSettingsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">표시할 Job ID가 없습니다.</td></tr>';
        return;
    }

    allMngrSett.forEach(setting => {
        const row = chartSettingsTableBody.insertRow();
        row.dataset.cd = String(setting.cd);

        // chrt_colr가 없으면 랜덤 색상 할당
        const chartColor = setting.chrt_colr || getRandomColorForAdmin();

        row.innerHTML = `
            <td class="job-id-cell">${setting.cd}</td>
            <td><input type="text" value="${setting.cd_nm || setting.cd}" data-field="cd_nm" readonly disabled></td>
            <td><input type="color" value="${chartColor}" data-field="chrt_colr"></td>
            <td><input type="color" value="${setting.grass_chrt_min_colr || '#9be9a8'}" data-field="grass_chrt_min_colr"></td>
            <td><input type="color" value="${setting.grass_chrt_max_colr || '#216e39'}" data-field="grass_chrt_max_colr"></td>
        `;

        // Add event listener for color inputs
        const colorInputs = row.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                if (window.setActiveColorInput) {
                    window.setActiveColorInput(e.target);
                }
            });
        });
    });
}

/**
 * @DOC: 페이지 내의 모든 아이콘 선택 드롭다운(`<select>`)을 최신 아이콘 목록으로 채웁니다.
 * 아이콘이 추가되거나 수정될 때 호출되어 드롭다운을 동기화합니다.
 * @param {Array<Object>} allIcons - 드롭다운에 표시할 아이콘 데이터 배열.
 * @example
 * // 아이콘 목록이 변경된 후 모든 드롭다운을 업데이트합니다.
 * // populateIconSelects(allIcons);
 */
export function populateIconSelects(allIcons) {
    const iconSelects = document.querySelectorAll('.icon-select');
    iconSelects.forEach(select => {
        const currentSelectedValue = select.value;
        select.innerHTML = '<option value="">선택 안 함</option>';

        allIcons.filter(icon => icon.icon_dsp_yn === true).forEach(icon => {
            const option = document.createElement('option');
            option.value = String(icon.icon_id);
            option.innerHTML = `${icon.icon_cd}`;
            select.appendChild(option);
        });

        if (currentSelectedValue) {
            const parsedCurrentValue = parseInt(currentSelectedValue);

            const targetOption = Array.from(select.options).find(option => parseInt(option.value) === parsedCurrentValue);
            if (targetOption) {
                select.value = targetOption.value;
            } else {
                select.value = "";
            }
        }
    });
}

/**
 * @DOC: 아이콘 관리 탭의 테이블을 렌더링합니다.
 * `allIcons` 배열을 순회하며 각 아이콘 정보를 테이블 행으로 추가하고, 수정/삭제 버튼에 이벤트를 연결합니다.
 * @param {Array<Object>} allIcons - 테이블에 표시할 아이콘 데이터 배열.
 * @example
 * // 아이콘 목록을 받아 아이콘 관리 테이블을 화면에 그립니다.
 * // renderIconTable(allIcons);
 */
export function renderIconTable(allIcons) {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const iconTableBody = container.querySelector('#iconTableBody');
    if (!iconTableBody) return;

    iconTableBody.innerHTML = '';

    if (allIcons.length === 0) {
        iconTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">등록된 아이콘이 없습니다.</td></tr>';
        return;
    }

    allIcons.forEach(icon => {
        const row = iconTableBody.insertRow();
        row.dataset.iconId = icon.icon_id;
        row.innerHTML = `
            <td class="px-4 py-2 border-b">${icon.icon_id}</td>
            <td class="px-4 py-2 border-b icon-cd-cell">${icon.icon_cd}</td>
            <td class="px-4 py-2 border-b icon-nm-cell">${icon.icon_nm}</td>
            <td class="px-4 py-2 border-b icon-expl-cell">${icon.icon_expl || ''}</td>
            <td class="px-4 py-2 border-b">
                <input type="checkbox" class="toggle-display-yn" data-icon-id="${icon.icon_id}" ${icon.icon_dsp_yn === true ? 'checked' : ''}>
            </td>
            <td class="px-4 py-2 border-b action-buttons">
                <button class="edit-icon-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-24 rounded-md mr-2" data-icon-id="${icon.icon_id}" style="height:28px; font-size:0.85em; display:inline-flex; align-items:center; justify-content:center;">수정</button>
                <button class="delete-icon-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-24 rounded-md" data-icon-id="${icon.icon_id}" style="height:28px; font-size:0.85em; display:inline-flex; align-items:center; justify-content:center;">삭제</button>
                <button class="save-icon-btn bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-24 rounded-md mr-2" data-icon-id="${icon.icon_id}" style="height:28px; font-size:0.85em; display:inline-flex; align-items:center; justify-content:center; display:none;">저장</button>
                <button class="cancel-edit-btn bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-24 rounded-md" data-icon-id="${icon.icon_id}" style="height:28px; font-size:0.85em; display:inline-flex; align-items:center; justify-content:center; display:none;">취소</button>
            </td>
        `;
    });

    iconTableBody.querySelectorAll('.toggle-display-yn').forEach(checkbox => {
        checkbox.addEventListener('change', eventHandlers.toggleIconDisplayStatus);
    });
    iconTableBody.querySelectorAll('.edit-icon-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const iconId = parseInt(event.currentTarget.dataset.iconId);
            const row = event.currentTarget.closest('tr');
            enterEditMode(row, allIcons);
        });
    });
    iconTableBody.querySelectorAll('.delete-icon-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const iconId = parseInt(event.currentTarget.dataset.iconId);
            if (eventHandlers.confirmAndDeleteIcon) {
                eventHandlers.confirmAndDeleteIcon(iconId);
            }
        });
    });
    iconTableBody.querySelectorAll('.save-icon-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const iconId = parseInt(event.currentTarget.dataset.iconId);
            const row = event.currentTarget.closest('tr');
            saveEdit(row, allIcons);
        });
    });
    iconTableBody.querySelectorAll('.cancel-edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const iconId = parseInt(event.currentTarget.dataset.iconId);
            const row = event.currentTarget.closest('tr');
            exitEditMode(row, allIcons);
        });
    });
}

/**
 * @DOC: 아이콘 행을 편집 모드로 전환합니다.
 * @param {HTMLElement} row - 편집할 행 요소.
 * @param {Array<Object>} allIcons - 전체 아이콘 데이터 배열.
 */
function enterEditMode(row, allIcons) {
    const iconId = parseInt(row.dataset.iconId);
    const icon = allIcons.find(i => i.icon_id === iconId);

    // 아이콘 코드, 이름, 설명 셀을 입력 필드로 변경
    const iconCdCell = row.querySelector('.icon-cd-cell');
    const iconNmCell = row.querySelector('.icon-nm-cell');
    const iconExplCell = row.querySelector('.icon-expl-cell');

    iconCdCell.innerHTML = `<input type="text" value="${icon.icon_cd}" class="edit-input w-full text-center" style="border: 1px dashed #666; padding: 4px;">`;
    iconNmCell.innerHTML = `<input type="text" value="${icon.icon_nm}" class="edit-input w-full text-center" style="border: 1px dashed #666; padding: 4px;">`;
    iconExplCell.innerHTML = `<input type="text" value="${icon.icon_expl || ''}" class="edit-input w-full text-center" style="border: 1px dashed #666; padding: 4px;">`;

    // 버튼 변경: 수정/삭제 → 저장/취소
    row.querySelector('.edit-icon-btn').style.display = 'none';
    row.querySelector('.delete-icon-btn').style.display = 'none';
    row.querySelector('.save-icon-btn').style.display = 'inline-block';
    row.querySelector('.cancel-edit-btn').style.display = 'inline-block';
}

/**
 * @DOC: 편집 모드를 종료하고 원래 상태로 복원합니다.
 * @param {HTMLElement} row - 편집할 행 요소.
 * @param {Array<Object>} allIcons - 전체 아이콘 데이터 배열.
 */
function exitEditMode(row, allIcons) {
    const iconId = parseInt(row.dataset.iconId);
    const icon = allIcons.find(i => i.icon_id === iconId);

    // 입력 필드를 원래 텍스트로 변경
    const iconCdCell = row.querySelector('.icon-cd-cell');
    const iconNmCell = row.querySelector('.icon-nm-cell');
    const iconExplCell = row.querySelector('.icon-expl-cell');

    iconCdCell.textContent = icon.icon_cd;
    iconNmCell.textContent = icon.icon_nm;
    iconExplCell.textContent = icon.icon_expl || '';

    // 버튼 변경: 저장/취소 → 수정/삭제
    row.querySelector('.edit-icon-btn').style.display = 'inline-flex';
    row.querySelector('.delete-icon-btn').style.display = 'inline-flex';
    row.querySelector('.save-icon-btn').style.display = 'none';
    row.querySelector('.cancel-edit-btn').style.display = 'none';
}

/**
 * @DOC: 편집한 아이콘 데이터를 저장합니다.
 * @param {HTMLElement} row - 편집할 행 요소.
 * @param {Array<Object>} allIcons - 전체 아이콘 데이터 배열.
 */
function saveEdit(row, allIcons) {
    const iconId = parseInt(row.dataset.iconId);
    const icon = allIcons.find(i => i.icon_id === iconId);

    // 입력 필드에서 값 가져오기
    const iconCdInput = row.querySelector('.icon-cd-cell input');
    const iconNmInput = row.querySelector('.icon-nm-cell input');
    const iconExplInput = row.querySelector('.icon-expl-cell input');

    // 아이콘 데이터 업데이트 - 키를 대문자로 변환
    const updatedIcon = {
        ICON_ID: icon.icon_id,
        ICON_CD: iconCdInput.value,
        ICON_NM: iconNmInput.value,
        ICON_EXPL: iconExplInput.value,
        ICON_DSP_YN: icon.icon_dsp_yn
    };

    // API 호출로 서버에 저장
    saveIconApi(updatedIcon)
        .then(() => {
            showToast('아이콘 정보가 성공적으로 업데이트되었습니다.', 'success');
            // 서버에서 최신 아이콘 데이터 가져오기
            refreshIconsData()
                .then(updatedIcons => {
                    exitEditMode(row, updatedIcons);
                    // 테이블 재렌더링으로 변경된 데이터 반영
                    renderIconTable(updatedIcons);
                    // 아이콘 선택 드롭다운 업데이트
                    populateIconSelects(updatedIcons);
                })
                .catch(error => {
                    console.error('최신 아이콘 데이터 가져오기 실패:', error);
                    exitEditMode(row, allIcons);
                    renderIconTable(allIcons);
                    populateIconSelects(allIcons);
                });
        })
        .catch(error => {
            console.error('아이콘 저장 실패:', error);
            showToast('아이콘 정보 업데이트 실패: ' + error.message, 'error');
        });
}

/**
 * @DOC: 아이콘 추가 또는 수정을 위한 폼을 화면에 표시합니다.
 * `iconId`가 제공되면 해당 아이콘의 정보로 폼을 채워 '수정' 모드로, `iconId`가 없으면 빈 폼을 '추가' 모드로 엽니다.
 * @param {number|null} iconId - 수정할 아이콘의 ID. 새 아이콘 추가 시에는 null 또는 undefined입니다.
 * @param {Array<Object>} allIcons - 수정할 아이콘 정보를 찾기 위한 전체 아이콘 목록.
 * @example
 * // 새 아이콘을 추가하기 위해 폼을 엽니다.
 * // displayIconForm(null, allIcons);
 * // ID가 5인 아이콘을 수정하기 위해 폼을 엽니다.
 * // displayIconForm(5, allIcons);
 */
export function displayIconForm(iconId, allIcons) {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const iconFormContainer = container.querySelector('#iconFormContainer');
    const iconFormTitle = container.querySelector('#iconFormTitle');
    const iconIdField = container.querySelector('#iconId');
    const iconCodeField = container.querySelector('#iconCode');
    const iconNameField = container.querySelector('#iconName');
    const iconDescriptionField = container.querySelector('#iconDescription');
    const iconDisplayYnField = container.querySelector('#iconDisplayYn');
    const saveIconButton = container.querySelector('#saveIconBtn');
    const cancelEditIconButton = container.querySelector('#cancelIconEditBtn');

    if (iconId) {
        iconFormTitle.textContent = '아이콘 수정';
        const icon = allIcons.find(i => i.icon_id === iconId);
        if (icon) {
            iconIdField.value = icon.icon_id;
            iconCodeField.value = icon.icon_cd || '';
            iconNameField.value = icon.icon_nm || '';
            iconDescriptionField.value = icon.icon_expl || '';
            iconDisplayYnField.value = icon.icon_dsp_yn === true ? 'Y' : 'N';
        }
    } else {
        iconFormTitle.textContent = '새 아이콘 추가';
        iconIdField.value = '';
        iconCodeField.value = '';
        iconNameField.value = '';
        iconDescriptionField.value = '';
        iconDisplayYnField.value = 'Y';
    }
    iconFormContainer.classList.remove('hidden');
    saveIconButton.textContent = iconId ? '아이콘 업데이트' : '아이콘 추가';
    cancelEditIconButton.style.display = 'inline-block';
}

/**
 * @DOC: 아이콘 추가/수정 폼을 화면에서 숨기고 입력 필드를 초기화합니다.
 * @example
 * // 사용자가 '취소' 버튼을 클릭했을 때 폼을 닫습니다.
 * // hideIconForm();
 */
export function hideIconForm() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const iconFormContainer = container.querySelector('#iconFormContainer');
    const iconIdInput = container.querySelector('#iconId');
    const iconCodeInput = container.querySelector('#iconCode');
    const iconNameInput = container.querySelector('#iconName');
    const iconDescriptionInput = container.querySelector('#iconDescription');
    const iconDisplayYn = container.querySelector('#iconDisplayYn');
    const saveIconButton = container.querySelector('#saveIconBtn');
    const cancelEditIconButton = container.querySelector('#cancelIconEditBtn');

    if (iconFormContainer) iconFormContainer.classList.add('hidden');
    if (iconIdInput) iconIdInput.value = '';
    if (iconCodeInput) iconCodeInput.value = '';
    if (iconNameInput) iconNameInput.value = '';
    if (iconDescriptionInput) iconDescriptionInput.value = '';
    if (iconDisplayYn) iconDisplayYn.value = 'Y';
    if (saveIconButton) saveIconButton.textContent = '아이콘 추가';
    if (cancelEditIconButton) cancelEditIconButton.style.display = 'none';
}
