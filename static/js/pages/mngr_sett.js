// @DOC_FILE: mngr_sett.js
// @DOC_DESC: 관리자 설정 페이지의 메인 JavaScript 파일. 각 탭의 UI와 이벤트 로직을 관리합니다.

// 디버그 모드 설정 (프로덕션에서는 false로 변경)
const DEBUG_MODE = true; // TODO: 프로덕션 배포 시 false로 변경

// 공통 유틸리티 함수들 가져오기
import { debugLog, showToast, setActiveColorInput, createStatusSettingRow } from '../utils.js';
import { isValidUserId } from '../validators.js';

// 서비스 모듈들 가져오기
import { stateManager } from '../services/stateManager.js';

// 탭 모듈들 가져오기
import { statisticsTab } from '../tabs/statistics.js';
import { userManagementTab } from '../tabs/userManagement.js';
import { dataAccessTab } from '../tabs/dataAccess.js';
import { popupManagementTab } from '../tabs/popupManagement.js';
import { init as initDataDefinition } from '../tabs/dataDefinition/dataDefinition.js';

// 외부 모듈들 가져오기
import { setDataFlowStatus } from '../modules/common/api/client.js';
import { setupTabs, renderSettingsTable, renderIconTable, populateIconSelects, initUI, initSettingsPagination } from '../modules/mngr_sett/ui.js';
import { getAdminSettings, getIcons } from '../modules/mngr_sett/data.js';
import {
    initializeIconManagementUI,
    confirmAndDeleteIcon,
    toggleIconDisplayStatus,
    saveBasicSettings,
    saveChartSettings,
    exportSettings,
    importSettings,
    exportIcons,
    importIcons,
    syncSettings
} from '../modules/mngr_sett/events.js';
import { downloadExcelTemplate } from '../utils/excelDownload.js';

// 설정 동기화 함수를 전역으로 노출
window.syncSettings = syncSettings;

// --- START: Schedule Settings Tab Logic ---

/**
 * Renders the schedule settings form.
 * @param {object} settings - The schedule settings data.
 */
function renderScheduleSettingsForm(settings) {
    const formContainer = document.getElementById('scheduleSettingsForm');
    if (!formContainer) {
        return;
    }

    const allIcons = window.allIconsData || [];

    const defaultSetting = {
        settId: null,
        grpMinCnt: 3,
        prgsRtRedThrsval: 30,
        prgsRtOrgThrsval: 60,
        succRtRedThrsval: 30,
        succRtOrgThrsval: 60,
        useYn: 'Y',
        grpBrdrStyl: 'solid',
        grpColrCrtr: 'prgr',
        memoIconId: null, memoBgColr: '#fef08b', memoTxtColr: '#a16207'
    };

    let receivedSettings = {};
    if (Array.isArray(settings) && settings.length > 0) {
        receivedSettings = settings[0] || {};
    } else if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
        receivedSettings = settings;
    }

    const setting = { ...defaultSetting, ...receivedSettings };
    const borderStyles = [
        { value: 'none', label: '없음', symbol: '○' },
        { value: 'solid', label: '실선', symbol: '─' },
        { value: 'dashed', label: '대시', symbol: '╍' },
        { value: 'dotted', label: '점선', symbol: '·' },
        { value: 'double', label: '이중선', symbol: '═' }
    ];

    const borderStyleOptions = borderStyles.map(style => `
        <label class="border-style-option">
            <input type="radio" name="grpBrdrStyl" value="${style.value}" ${setting.grpBrdrStyl === style.value ? 'checked' : ''}>
            <div class="border-symbol">${style.symbol}</div>
            <span>${style.label}</span>
        </label>
    `).join('');

    // 아이콘 옵션 생성 함수
    const createIconOptions = (selectedIconId) => {
        const options = ['<option value="">선택 안 함</option>'];
        allIcons.forEach(icon => {
            if (icon.icon_dsp_yn) {
                const isSelected = icon.icon_id === selectedIconId;
                options.push(`<option value="${icon.icon_id}" ${isSelected ? 'selected' : ''}>${icon.icon_cd}</option>`);
            }
        });
        return options.join('');
    };

    // 상태별 카드 생성 함수
    const createStatusCard = (statusKey, statusLabel, iconId, bgColor, textColor) => {
        const iconOptions = createIconOptions(iconId);
        return `
            <div class="status-card">
                <div class="status-card-title">${statusLabel}</div>
                <div class="form-row">
                    <label for="${statusKey}IconId">아이콘</label>
                    <select id="${statusKey}IconId">${iconOptions}</select>
                </div>
                <div class="form-row">
                    <label for="${statusKey}BgColr">배경색</label>
                    <div class="color-input-wrapper">
                        <div class="color-preview" style="background-color: ${bgColor}"></div>
                        <input type="color" id="${statusKey}BgColr" value="${bgColor}">
                    </div>
                </div>
                <div class="form-row">
                    <label for="${statusKey}TxtColr">텍스트색</label>
                    <div class="color-input-wrapper">
                        <div class="color-preview" style="background-color: ${textColor}"></div>
                        <input type="color" id="${statusKey}TxtColr" value="${textColor}">
                    </div>
                </div>
            </div>
        `;
    };

    formContainer.innerHTML = `
        <input type="hidden" id="scheduleSettId" value="${setting.settId ?? ''}">
        
        <!-- Basic Settings -->
        <div class="settings-section">
            <h2 class="section-title">기본 설정</h2>
            <div class="basic-settings-grid">
                <!-- Grouping Settings -->
                <div class="setting-group">
                    <div class="setting-group-title">그룹화 설정</div>
                    <div class="form-row">
                        <label for="grpMinCnt">그룹화 최소 개수</label>
                        <input type="number" id="grpMinCnt" value="${setting.grpMinCnt ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="form-row">
                        <label>그룹 외곽선 스타일</label>
                        <div class="border-style-selector">${borderStyleOptions}</div>
                    </div>
                    <div class="form-row mt-4">
                        <label class="checkbox-item">
                            <input type="checkbox" id="scheduleUseYn" ${setting.useYn === 'Y' ? 'checked' : ''} class="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            설정 사용 여부
                        </label>
                    </div>
                </div>

                <!-- Threshold Settings -->
                <div class="setting-group">
                    <div class="setting-group-title">그룹 색상 임계값 설정</div>
                    <div class="form-row">
                        <label>색상 기준</label>
                        <div class="radio-group">
                            <label class="radio-item">
                                <input type="radio" name="grpColrCrtr" value="prgr" ${setting.grpColrCrtr === 'prgr' ? 'checked' : ''}>
                                진행률
                            </label>
                            <label class="radio-item">
                                <input type="radio" name="grpColrCrtr" value="succ" ${setting.grpColrCrtr === 'succ' ? 'checked' : ''}>
                                성공률
                            </label>
                        </div>
                    </div>
                    <div class="threshold-row">
                        <div class="form-row" style="flex: 1;">
                            <label for="succRtRedThrsval">성공률 문제점 임계값 (%)</label>
                            <input type="number" id="succRtRedThrsval" value="${setting.succRtRedThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <small class="threshold-desc">임계값 미만 → CD902 배경색</small>
                        </div>
                        <div class="form-row" style="flex: 1;">
                            <label for="succRtOrgThrsval">성공률 정상 임계값 (%)</label>
                            <input type="number" id="succRtOrgThrsval" value="${setting.succRtOrgThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <small class="threshold-desc">임계값 이상 → CD901 배경색</small>
                        </div>
                    </div>
                    <div class="threshold-row">
                        <div class="form-row" style="flex: 1;">
                            <label for="prgsRtRedThrsval">진행률 문제점 임계값 (%)</label>
                            <input type="number" id="prgsRtRedThrsval" value="${setting.prgsRtRedThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <small class="threshold-desc">임계값 미만 → CD902 배경색</small>
                        </div>
                        <div class="form-row" style="flex: 1;">
                            <label for="prgsRtOrgThrsval">진행률 정상 임계값 (%)</label>
                            <input type="number" id="prgsRtOrgThrsval" value="${setting.prgsRtOrgThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                            <small class="threshold-desc">임계값 이상 → CD901 배경색</small>
                        </div>
                    </div>
                </div>

                <!-- Memo Color Settings -->
                <div class="setting-group" style="margin-top: 1.5rem;">
                    <div class="setting-group-title">메모 존재시 그룹 색상</div>
                    <div class="form-row">
                        <label for="memoBgColr">배경색</label>
                        <div class="color-input-wrapper">
                            <div class="color-preview" style="background-color: ${setting.memoBgColr || '#fef08b'}"></div>
                            <input type="color" id="memoBgColr" value="${setting.memoBgColr || '#fef08b'}">
                        </div>
                    </div>
                    <div class="form-row">
                        <label for="memoTxtColr">텍스트색</label>
                        <div class="color-input-wrapper">
                            <div class="color-preview" style="background-color: ${setting.memoTxtColr || '#a16207'}"></div>
                            <input type="color" id="memoTxtColr" value="${setting.memoTxtColr || '#a16207'}">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Status Settings -->
        <div class="settings-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 2px solid #e2e8f0;">
                <h2 class="section-title" style="margin: 0; border-bottom: none; padding-bottom: 0;">상태별 표시 설정</h2>
                <button id="syncStatusCodesBtn" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                    🔄 상태코드 동기화
                </button>
            </div>
            <div class="status-settings-grid" id="statusCodesContainer">
                <!-- 상태코드 카드는 동적으로 로드됩니다 -->
                <div style="text-align: center; padding: 2rem; color: #64748b;">
                    상태코드를 불러오는 중입니다...
                </div>
            </div>
        </div>
    `;

    // Add CSS styles for the new layout
    const styleId = 'schedule-settings-styles';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }

    styleElement.innerHTML = `
        /* Settings Grid */
        .settings-section {
            background-color: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 1.5rem;
        }

        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 1.5rem;
            padding-bottom: 0.75rem;
            border-bottom: 2px solid #e2e8f0;
        }

        /* 3-Column Grid for Basic Settings */
        .basic-settings-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
        }

        /* Setting Group */
        .setting-group {
            background-color: #f1f5f9;
            padding: 1.25rem;
            border-radius: 0.5rem;
        }

        .setting-group-title {
            font-size: 1rem;
            font-weight: 600;
            color: #475569;
            margin-bottom: 1rem;
        }

        /* Form Elements */
        .form-row {
            margin-bottom: 1rem;
        }

        .threshold-row {
            display: flex;
            gap: 1rem;
            margin-bottom: 0.75rem;
        }

        .threshold-desc {
            display: block;
            font-size: 0.75rem;
            color: #94a3b8;
            margin-top: 0.25rem;
        }

        label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #64748b;
            margin-bottom: 0.5rem;
        }

        input[type="number"],
        select {
            width: 100%;
            padding: 0.625rem 0.875rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.375rem;
            font-size: 1rem;
            font-family: inherit;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }
        
        .color-input-wrapper {
            width: 100%;
            padding: 0;
            border: 1px solid #cbd5e1;
            border-radius: 0.375rem;
            font-size: 1rem;
            font-family: inherit;
            transition: border-color 0.2s;
            box-sizing: border-box;
        }

        input[type="number"]:focus,
        select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Radio Buttons */
        .radio-group {
            display: flex;
            gap: 1rem;
            margin-top: 0.5rem;
        }

        .radio-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .radio-item input[type="radio"] {
            width: auto;
        }

        /* Checkbox */
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .checkbox-item input[type="checkbox"] {
            width: auto;
        }

        /* Color Input */
        .color-input-wrapper {
            display: flex;
            align-items: center;
            min-height: 2.5rem;
        }

        .color-preview {
            width: 2rem;
            height: 2rem;
            border: 1px solid #cbd5e1;
            border-radius: 0.375rem;
            cursor: pointer;
            flex-shrink: 0;
            margin-right: 0.5rem;
        }

        input[type="color"] {
            flex: 1;
            height: 2rem;
            padding: 0;
            border: 1px solid #cbd5e1;
            border-radius: 0.375rem;
            cursor: pointer;
            text-align: center;
            background-color: white;
        }

        /* Dynamic Flex Wrap Layout for Status Settings */
        .status-settings-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 1.5rem;
        }

        /* Status Setting Card */
        .status-card {
            background-color: #f1f5f9;
            padding: 1.25rem;
            border-radius: 0.5rem;
            flex: 0 0 auto;
            min-width: 180px;
            max-width: 220px;
        }

        .status-card-title {
            font-size: 1rem;
            font-weight: 600;
            color: #475569;
            margin-bottom: 1rem;
            text-align: center;
        }

        /* Border Style Selector */
        .border-style-selector {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .border-style-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            padding: 0.5rem;
            border: 2px solid transparent;
            border-radius: 0.375rem;
            transition: border-color 0.2s;
        }

        .border-style-option:hover {
            border-color: #e2e8f0;
        }

        .border-style-option input[type="radio"] {
            display: none;
        }

        .border-symbol {
            font-size: 1.5rem;
            color: #334155;
            padding: 0.5rem 1rem;
            border: 1px solid #cbd5e1;
            background-color: white;
            border-radius: 0.25rem;
            margin-bottom: 0.5rem;
        }

        .border-style-option input[type="radio"]:checked ~ .border-symbol {
            border-color: #3b82f6;
            color: #3b82f6;
        }

        .border-style-option span {
            font-size: 0.875rem;
            color: #64748b;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
            .basic-settings-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 768px) {
            .basic-settings-grid {
                grid-template-columns: 1fr;
            }

            .settings-section {
                padding: 1rem;
            }

            .section-title {
                font-size: 1.125rem;
            }
        }

        /* Helper Classes */
        .mt-2 {
            margin-top: 0.5rem;
        }

        .mt-4 {
            margin-top: 1rem;
        }

        .text-center {
            text-align: center;
        }
    `;

    // Color preview update
    document.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('input', function() {
            const preview = this.previousElementSibling;
            if (preview && preview.classList.contains('color-preview')) {
                preview.style.backgroundColor = this.value;
            }
        });
    });

    // Border style selector
    document.querySelectorAll('.border-style-option').forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
        });
    });

    // 상태코드 동기화 버튼 이벤트 리스너 등록
    const syncBtn = document.getElementById('syncStatusCodesBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', syncStatusCodes);
    }

    // 페이지 렌더링 후 상태코드 자동 로드
    setTimeout(loadStatusCodes, 100);
}

/**
 * 상태코드 마스터 테이블에서 모든 상태코드를 불러와서 UI에 렌더링 합니다
 */
async function loadStatusCodes() {
    console.log('🔵 === CD900: loadStatusCodes() 시작 ===');
    
    const container = document.getElementById('statusCodesContainer');
    if (!container) {
        console.error('🔴 statusCodesContainer를 찾을 수 없습니다');
        return;
    }

    try {
        console.log('🔵 API 호출 시작: /api/mngr_sett/status_codes');
        
        const response = await fetch('/api/mngr_sett/status_codes');
        console.log('🔵 응답 수신 완료', {
            status: response.status,
            ok: response.ok
        });

        if (!response.ok) {
            throw new Error(`상태코드 조회 실패 (${response.status})`);
        }

        const statusCodes = await response.json();
        console.log('🟢 상태코드 데이터 수신 성공', {
            총건수: Array.isArray(statusCodes) ? statusCodes.length : 0,
            데이터: statusCodes
        });

        // 아이콘 옵션 가져오기
        const allIcons = window.allIconsData || [];
        const createIconOptions = (selectedIconCd) => {
            const options = ['<option value="">선택 안 함</option>'];
            allIcons.forEach(icon => {
                const isSelected = icon.icon_cd === selectedIconCd;
                options.push(`<option value="${icon.icon_id}" data-icon-cd="${icon.icon_cd}" ${isSelected ? 'selected' : ''}>${icon.icon_cd}</option>`);
            });
            return options.join('');
        };

        // 상태코드 카드 렌더링 (코드 오름차순 정렬)
        container.innerHTML = statusCodes
            .sort((a, b) => a.cd.localeCompare(b.cd))
            .map(code => `
            <div class="status-card">
                <div class="status-card-title">${code.cd}(${code.nm})</div>
                <div class="form-row">
                    <label for="status_${code.cd}_icon">아이콘</label>
                    <select id="status_${code.cd}_icon">${createIconOptions(code.icon_cd)}</select>
                </div>
                <div class="form-row">
                    <label for="status_${code.cd}_bg">배경색</label>
                    <div class="color-input-wrapper">
                        <div class="color-preview" style="background-color: ${code.bg_colr || '#f1f5f9'}"></div>
                        <input type="color" id="status_${code.cd}_bg" value="${code.bg_colr || '#f1f5f9'}">
                    </div>
                </div>
                <div class="form-row">
                    <label for="status_${code.cd}_txt">텍스트색</label>
                    <div class="color-input-wrapper">
                        <div class="color-preview" style="background-color: ${code.txt_colr || '#475569'}"></div>
                        <input type="color" id="status_${code.cd}_txt" value="${code.txt_colr || '#475569'}">
                    </div>
                </div>
            </div>
        `).join('') + `
            <div style="width: 100%; text-align: right; margin-top: 1rem;">
                <button id="saveStatusCodesBtn" class="btn btn-primary">
                    💾 상태코드 설정 저장
                </button>
            </div>
        `;

        console.log('🟢 상태코드 카드 렌더링 완료');

        // 색상 프리뷰 이벤트 리스너 재등록
        attachColorInputListeners();
        
        showToast('상태코드 목록이 정상적으로 로드되었습니다.', 'success');

        // 저장 버튼 이벤트 리스너 등록
        const saveBtn = document.getElementById('saveStatusCodesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveStatusCodes);
        }

    } catch (error) {
        console.error('🔴 상태코드 로드 오류:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #dc3545;">
                ❌ 상태코드를 불러오는데 실패했습니다<br>
                오류: ${error.message}
            </div>
        `;
        showToast(`상태코드 로드 실패: ${error.message}`, 'error');
    }

    console.log('🔵 === CD900: loadStatusCodes() 종료 ===');
}

/**
 * tb_con_mst(CD900 그룹)과 tb_sts_cd_mst를 수동 동기화합니다
 */
async function syncStatusCodes() {
    console.log('🔵 === CD900: syncStatusCodes() 수동 동기화 시작 ===');

    const syncBtn = document.getElementById('syncStatusCodesBtn');
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '🔄 동기화 중...';
    }

    try {
        const response = await fetch('/api/mngr_sett/status_codes/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || '상태코드 동기화에 실패했습니다.');
        }

        console.log('🟢 동기화 결과:', result);

        // 동기화 후 최신 데이터 다시 로드
        await loadStatusCodes();

        showToast(`상태코드 동기화 완료: ${result.inserted_count}개 새로운 코드 추가`, 'success');

    } catch (error) {
        console.error('🔴 상태코드 동기화 오류:', error);
        showToast(`동기화 실패: ${error.message}`, 'error');
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '🔄 상태코드 동기화';
        }
    }

    console.log('🔵 === CD900: syncStatusCodes() 종료 ===');
}

/**
 * 상태코드 설정을 저장합니다
 * UI 설정값(icon_id, bg_colr, txt_colr)만 tb_sts_cd_mst에 저장
 * nm(상태코드명)은 tb_con_mst에서 관리하므로 저장하지 않음
 */
async function saveStatusCodes() {
    console.log('🔵 === CD900: saveStatusCodes() 시작 ===');

    try {
        const response = await fetch('/api/mngr_sett/status_codes');
        const statusCodes = await response.json();

        // UI 설정값만 저장 (cd, icon_id, bg_colr, txt_colr)
        // nm은 tb_con_mst에서 관리하므로 포함하지 않음
        const saveData = statusCodes.map(code => {
            return {
                cd: code.cd,
                icon_id: parseInt(document.getElementById(`status_${code.cd}_icon`).value) || null,
                bg_colr: document.getElementById(`status_${code.cd}_bg`).value,
                txt_colr: document.getElementById(`status_${code.cd}_txt`).value
            };
        });

        console.log('🟢 저장할 데이터 (UI 설정값만):', saveData);

        const saveResponse = await fetch('/api/mngr_sett/status_codes/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        });

        const result = await saveResponse.json();

        if (!saveResponse.ok) {
            throw new Error(result.message || '상태코드 설정 저장에 실패했습니다.');
        }

        showToast('상태코드 설정이 성공적으로 저장되었습니다.', 'success');
        console.log('🟢 저장 완료');

    } catch (error) {
        console.error('🔴 상태코드 저장 오류:', error);
        showToast(`저장 실패: ${error.message}`, 'error');
    }

    console.log('🔵 === CD900: saveStatusCodes() 종료 ===');
}


// --- START: Color Palette Logic ---

// Make setActiveColorInput globally available for the module
window.setActiveColorInput = setActiveColorInput;

// --- END: Color Palette Logic ---


/**
 * Fetches schedule settings from the server and renders the form.
 */
async function loadScheduleSettings() {
    debugLog('=== JS: loadScheduleSettings() 시작 ===');
    debugLog('JS: API 요청 준비');

    try {
        const timestamp = new Date().getTime();
        const url = `/api/mngr_sett/schedule_settings?_=${timestamp}`;
        debugLog('JS: Fetch 요청 시작', { url, timestamp });

        const response = await fetch(url);

        debugLog('JS: Fetch 응답 수신', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        let settings = [];

        if (!response.ok) {
            // 500 에러 등 서버 오류 시 본문 읽어서 사용자에게 보여주기
            let errorMsg = `스케줄 표시 설정 조회 실패 (Status: ${response.status})`;
            try {
                const errorText = await response.text();
                if (errorText) {
                    console.error('JS: 서버 오류 응답 본문:', errorText);
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMsg = errorJson.message || errorMsg;
                    } catch {
                        errorMsg = errorText.substring(0, 200); // JSON 아니면 텍스트 일부만
                    }
                }
            } catch (e) {
                console.error('JS: 오류 본문 읽기 실패', e);
            }
            throw new Error(errorMsg);
        }

        // 정상 응답 (200) 처리
        const text = await response.text();
        debugLog('JS: 응답 텍스트 수신', {
            length: text.length,
            isEmpty: !text.trim(),
            preview: text.substring(0, 200)
        });

        if (!text.trim()) {
            console.warn('JS: 응답이 비어있음 → 기본값(빈 배열)으로 처리');
        } else {
            try {
                const parsed = JSON.parse(text);
                debugLog('JS: JSON 파싱 성공', {
                    type: typeof parsed,
                    isArray: Array.isArray(parsed),
                    length: Array.isArray(parsed) ? parsed.length : 'N/A',
                    keys: typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed) : 'N/A'
                });

                // 서버가 배열이든 단일 객체든 모두 수용
                if (Array.isArray(parsed)) {
                    settings = parsed.length > 0 ? parsed : [];
                } else if (parsed && typeof parsed === 'object') {
                    settings = [parsed]; // 단일 객체를 배열로 감싸서 일관성 유지
                } else {
                    console.warn('JS: 예상치 못한 데이터 형식 → 빈 배열 처리');
                    settings = [];
                }
            } catch (parseError) {
                console.error('JS: JSON 파싱 실패', parseError);
                console.error('JS: 원본 응답:', text);
                throw new Error('서버 응답 형식이 잘못되었습니다. (JSON 파싱 실패)');
            }
        }

        debugLog('JS: 최종 settings 데이터', settings);
        renderScheduleSettingsForm(settings);

        // 색상 입력 필드 이벤트 리스너 재등록 (렌더링 후)
        attachColorInputListeners();

    } catch (error) {
        console.error('=== JS: loadScheduleSettings() 오류 발생 ===');
        console.error('JS: 오류 상세:', error);

        showToast(error.message || '스케줄 표시 설정을 불러오지 못했습니다.', 'error');

        // 어떤 오류가 나도 폼은 기본값으로 그려지게 fallback
        renderScheduleSettingsForm([]);
        attachColorInputListeners(); // fallback 후에도 색상 프리뷰 동작 보장
    }

    debugLog('=== JS: loadScheduleSettings() 종료 ===');
}

/**
 * 색상 입력 필드에 대한 이벤트 리스너를 동적으로 붙이는 헬퍼 함수
 * (렌더링 후마다 호출 필요)
 */
function attachColorInputListeners() {
    const formContainer = document.getElementById('scheduleSettingsForm');
    if (!formContainer) return;

    const colorInputs = formContainer.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        // 초기 프리뷰 색상 설정
        const preview = input.previousElementSibling;
        if (preview && preview.classList.contains('color-preview')) {
            preview.style.backgroundColor = input.value;
        }

        // 실시간 프리뷰 업데이트
        input.addEventListener('input', (e) => {
            const prev = e.target.previousElementSibling;
            if (prev && prev.classList.contains('color-preview')) {
                prev.style.backgroundColor = e.target.value;
            }
        });

        // 팔레트 활성화용
        input.addEventListener('click', (e) => setActiveColorInput(e.target));
        input.addEventListener('focus', (e) => setActiveColorInput(e.target));
    });
}

/**
 * Collects data from the schedule settings form and saves it to the server.
 */
async function saveScheduleSettings() {
    const settId = document.getElementById('scheduleSettId').value;
    const grpMinCntValue = document.getElementById('grpMinCnt').value;
    const prgsRtRedThrsvalValue = document.getElementById('prgsRtRedThrsval').value;
    const prgsRtOrgThrsvalValue = document.getElementById('prgsRtOrgThrsval').value;
    const succRtRedThrsvalValue = document.getElementById('succRtRedThrsval').value;
    const succRtOrgThrsvalValue = document.getElementById('succRtOrgThrsval').value;

    const grpMinCnt = grpMinCntValue === '' ? null : parseInt(grpMinCntValue);
    const prgsRtRedThrsval = prgsRtRedThrsvalValue === '' ? null : parseInt(prgsRtRedThrsvalValue);
    const prgsRtOrgThrsval = prgsRtOrgThrsvalValue === '' ? null : parseInt(prgsRtOrgThrsvalValue);
    const succRtRedThrsval = succRtRedThrsvalValue === '' ? null : parseInt(succRtRedThrsvalValue);
    const succRtOrgThrsval = succRtOrgThrsvalValue === '' ? null : parseInt(succRtOrgThrsvalValue);
    const useYn = document.getElementById('scheduleUseYn').checked ? 'Y' : 'N';

    if (grpMinCnt === null || prgsRtRedThrsval === null || prgsRtOrgThrsval === null || succRtRedThrsval === null || succRtOrgThrsval === null) {
        showToast('기본 설정의 모든 숫자 필드를 입력해주세요.', 'error');
        return;
    }
    
    if (prgsRtRedThrsval >= prgsRtOrgThrsval) {
        showToast('진행률의 문제점 임계값은 정상 임계값보다 작아야 합니다.', 'error');
        return;
    }
    if (succRtRedThrsval >= succRtOrgThrsval) {
       showToast('성공률의 문제점 임계값은 정상 임계값보다 작아야 합니다.', 'error');
       return;
    }

    const getColorValue = (id, defaultValue = '') => {
        const element = document.getElementById(id);
        return element ? element.value : defaultValue;
    };

    const settingsData = {
        sett_id: settId ? parseInt(settId) : null,
        grp_min_cnt: grpMinCnt,
        prgs_rt_red_thrsval: prgsRtRedThrsval,
        prgs_rt_org_thrsval: prgsRtOrgThrsval,
        succ_rt_red_thrsval: succRtRedThrsval,
        succ_rt_org_thrsval: succRtOrgThrsval,
        use_yn: useYn,
        grp_brdr_styl: document.querySelector('input[name="grpBrdrStyl"]:checked') ? document.querySelector('input[name="grpBrdrStyl"]:checked').value : 'solid',
        grp_colr_crtr: document.querySelector('input[name="grpColrCrtr"]:checked') ? document.querySelector('input[name="grpColrCrtr"]:checked').value : 'prgr',
        memo_bg_colr: getColorValue('memoBgColr', '#fef08b'),
        memo_txt_colr: getColorValue('memoTxtColr', '#a16207')
    };

    try {
        const response = await fetch('/api/mngr_sett/schedule_settings/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || '스케줄 표시 설정 저장에 실패했습니다.');
        }
        showToast('스케줄 표시 설정이 성공적으로 저장되었습니다.', 'success');
        
        // Update the hidden sett_id field with the returned new ID after creation
        if (result.sett_id) {
            document.getElementById('scheduleSettId').value = result.sett_id;
        }

    } catch (error) {
        showToast(`저장 실패: ${error.message}`, 'error');
    }
}

// --- END: Schedule Settings Tab Logic ---


function addNewSettingRow() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const settingsTableBody = container.querySelector('#settingsTableBody');
    const chartSettingsTableBody = container.querySelector('#chartSettingsTableBody');
    const newCd = prompt("새로 추가할 Job ID를 입력하세요:");
    if (!newCd) { showToast('Job ID가 입력되지 않았습니다.', 'warning'); return; }
    if (container.querySelector(`#settingsTableBody tr[data-cd="${newCd}"]`)) { showToast('이미 존재하는 Job ID입니다.', 'error'); return; }
    const newRow = settingsTableBody.insertRow();
    newRow.dataset.cd = newCd;
    newRow.innerHTML = `<td class="job-id-cell">${newCd}</td><td><input type="text" value="${newCd}" data-field="cd_nm" placeholder="Job 이름"></td><td><input type="text" value="" data-field="cd_desc" placeholder="Job 설명"></td><td><input type="text" value="" data-field="item5" placeholder="비고"></td><td><input type="number" value="0" data-field="cnn_failr_thrs_val"></td><td><select data-field="cnn_failr_icon_id" class="icon-select"><option value="">선택 안 함</option></select></td><td><input type="color" value="#FF0000" data-field="cnn_failr_wrd_colr"></td><td><input type="number" value="0" data-field="cnn_warn_thrs_val"></td><td><select data-field="cnn_warn_icon_id" class="icon-select"><option value="">선택 안 함</option></select></td><td><input type="color" value="#FFA500" data-field="cnn_warn_wrd_colr"></td><td><select data-field="cnn_sucs_icon_id" class="icon-select"><option value="">선택 안 함</option></select></td><td><input type="color" value="#008000" data-field="cnn_sucs_wrd_colr"></td><td><input type="number" step="0.01" value="0" data-field="dly_sucs_rt_thrs_val"></td><td><input type="number" step="0.01" value="0" data-field="dd7_sucs_rt_thrs_val"></td><td><input type="number" step="0.01" value="0" data-field="mthl_sucs_rt_thrs_val"></td><td><input type="number" step="0.01" value="0" data-field="mc6_sucs_rt_thrs_val"></td><td><input type="number" step="0.01" value="0" data-field="yy1_sucs_rt_thrs_val"></td><td><select data-field="sucs_rt_sucs_icon_id" class="icon-select"><option value="">선택 안 함</option></select></td><td><input type="color" value="#008000" data-field="sucs_rt_sucs_wrd_colr"></td><td><select data-field="sucs_rt_warn_icon_id" class="icon-select"><option value="">선택 안 함</option></select></td><td><input type="color" value="#FFA500" data-field="sucs_rt_warn_wrd_colr"></td><td><input type="checkbox" checked data-field="chrt_dsp_yn"></td>`;
    const newChartRow = chartSettingsTableBody.insertRow();
    newChartRow.dataset.cd = newCd;
    newChartRow.innerHTML = `<td class="job-id-cell">${newCd}</td><td><input type="text" value="${newCd}" data-field="cd_nm" readonly disabled></td><td><input type="color" value="#007bff" data-field="chrt_colr"></td><td><input type="color" value="#9be9a8" data-field="grass_chrt_min_colr"></td><td><input type="color" value="#216e39" data-field="grass_chrt_max_colr"></td>`;
    populateIconSelects(window.allIconsData || []);

    // 새로 추가된 행의 색상 입력 필드에도 이벤트 리스너 추가
    const newRowInputs = newRow.querySelectorAll('input[type="color"]');
    newRowInputs.forEach(input => {
        input.addEventListener('focus', (e) => setActiveColorInput(e.target));
    });
    const newChartRowInputs = newChartRow.querySelectorAll('input[type="color"]');
    newChartRowInputs.forEach(input => {
        input.addEventListener('focus', (e) => setActiveColorInput(e.target));
    });
}

async function refreshUserManagementTable() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const searchInput = container.querySelector('#userSearchInput');
    const searchTerm = searchInput ? searchInput.value : '';
    const { users, menus } = await userManagementTab.fetchUsersAndMenus(searchTerm);
    userManagementTab.renderTable(users, menus);
}

/**
 * 서버 사이드 페이징과 검색을 지원하는 데이터 로드 함수
 * @param {Object} options - 페이징 및 검색 옵션
 * @param {number} options.page - 페이지 번호
 * @param {number} options.perPage - 페이지당 항목 수
 * @param {string} options.searchTerm - 검색어
 */
async function loadPageData(options = {}) {
    const state = window._mngrSettState || {};
    const { page = 1, perPage = state.settingsItemsPerPage || 10, searchTerm = null } = options;
    
    if (loadPageDataDebounceTimer) {
        return;
    }
    
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    
    loadPageDataDebounceTimer = true;

    try {
        const [adminResult, iconsResult, userResult] = await Promise.allSettled([
            getAdminSettings({ page, perPage, searchTerm, bypassCache: true }),
            getIcons(),
            userManagementTab.fetchUsersAndMenus()
        ]);

        if (adminResult.status === 'fulfilled') {
            const adminSettingsResult = adminResult.value;
            const adminSettingsData = adminSettingsResult.data || adminSettingsResult;
            const paginationInfo = {
                total: adminSettingsResult.total || 0,
                page: adminSettingsResult.page || 1,
                per_page: adminSettingsResult.per_page || 10,
                total_pages: adminSettingsResult.total_pages || 0
            };
            renderSettingsTable(adminSettingsData, iconsResult.status === 'fulfilled' ? iconsResult.value : [], paginationInfo);
        } else {
            showToast('관리자 설정 로드 실패: ' + adminResult.reason.message, 'warning');
            const settingsLoadingRow = document.getElementById('settings-loading-row');
            if (settingsLoadingRow) {
                settingsLoadingRow.innerHTML = '<td colspan="20" class="text-center py-4 text-red-500">관리자 설정 로드 실패</td>';
            }
        }

        const icons = iconsResult.status === 'fulfilled' ? iconsResult.value : [];

        if (iconsResult.status === 'fulfilled') {
            renderIconTable(icons);
            populateIconSelects(icons);
            window.allIconsData = icons;
        } else {
            showToast('아이콘 데이터 로드 실패: ' + iconsResult.reason.message, 'warning');
            const iconLoadingRow = document.getElementById('icon-loading-row');
            if (iconLoadingRow) {
                iconLoadingRow.innerHTML = '<td colspan="6" class="text-center py-4 text-red-500">아이콘 데이터 로드 실패</td>';
            }
        }

        if (userResult.status === 'fulfilled') {
            userManagementTab.renderTable(userResult.value.users, userResult.value.menus);
        } else {
            showToast('사용자 데이터 로드 실패: ' + userResult.reason.message, 'warning');
            const userLoadingRow = document.getElementById('user-loading-row');
            if (userLoadingRow) {
                userLoadingRow.innerHTML = '<td colspan="5" class="text-center py-4 text-red-500">사용자 데이터 로드 실패</td>';
            }
        }

        if (adminResult.status === 'fulfilled') {
            showToast('관리자 설정 페이지 로드 완료.', 'success');
        }
    } catch (error) {
        showToast('페이지 초기화 중 치명적 오류 발생: ' + error.message, 'error');
    } finally {
        setTimeout(() => {
            loadPageDataDebounceTimer = null;
        }, 100);
    }
}


// 전역으로 loadPageData 함수 노출
window.loadPageData = loadPageData;

// 중복 호출 방지를 위한 디바운스 타이머
let loadPageDataDebounceTimer = null;

async function initializePage() {
    console.log('=== INITIALIZE PAGE CALLED ==='); // 디버그 로그 추가
    const container = document.getElementById('mngr_sett_page');
    if (!container) {
        console.error('Container not found: mngr_sett_page');
        return;
    }

    setupTabs();

    // The color palette is now attached by the main UI module.
    // 의존성 주입: ui.js가 필요로 하는 event.js의 함수들을 전달
    initUI({
        confirmAndDeleteIcon,
        toggleIconDisplayStatus
    });
    initializeIconManagementUI();
    // 페이징 기능 초기화
    initSettingsPagination();
    
    // 탭 모듈 초기화
    statisticsTab.initElements();
    statisticsTab.initEventListeners();
    // 통계 탭 활성화 (초기 데이터 로드)
    const statisticsTabButton = container.querySelector('button[data-tab="statistics"]');
    if (statisticsTabButton) {
        statisticsTabButton.addEventListener('click', () => statisticsTab.activate());
    }
    
    userManagementTab.initElements();
    userManagementTab.initEventListeners();
    
    dataAccessTab.initElements();
    dataAccessTab.initEventListeners();

    popupManagementTab.initElements();
    popupManagementTab.initEventListeners();

    // 사용자접속정보 탭 초기화
    const userAccessInfoContainer = document.getElementById('userAccessInfo');
    if (userAccessInfoContainer) {
        console.log('Initializing userAccessInfo tab...');
        // 동적 import로 지연 로드
        import('../tabs/userAccessInfo/index.js').then(({ default: userAccessInfo }) => {
            userAccessInfo.init().catch(err => console.error('userAccessInfo init error:', err));
        }).catch(err => console.error('userAccessInfo module load error:', err));
    }

    // 데이터정의 탭 초기화 (조건부)
    const dataDefinitionContainer = document.getElementById('dataDefinition');
    if (dataDefinitionContainer) {
        console.log('🔍 mngr_sett.js: dataDefinitionContainer found, but NOT calling init yet');
        // 탭 전환 시점에 초기화하도록 defer
    } else {
        console.warn('⚠️ mngr_sett.js: dataDefinitionContainer not found');
    }

    // 행 추가 버튼은 더 이상 사용하지 않음 (UI에서 제거)

    const settingsTab = container.querySelector('button[data-tab="basicSettings"]'); // Changed from "settings" to "basicSettings" to match HTML
    if (settingsTab) {
        // The loadPageData function is called at the end, so no need for a click listener here
    }

    const scheduleSettingsTab = container.querySelector('button[data-tab="scheduleSettings"]');
    if (scheduleSettingsTab) {
        scheduleSettingsTab.addEventListener('click', loadScheduleSettings);
    }

    // 데이터정의 탭 전환 시 초기화 (중복 호출 방지)
    const dataDefinitionTab = container.querySelector('button[data-tab="dataDefinition"]');
    if (dataDefinitionTab) {
        let hasBeenInitialized = false;
        dataDefinitionTab.addEventListener('click', () => {
            console.log('🔍 Tab clicked: dataDefinition, hasBeenInitialized:', hasBeenInitialized);
            if (!hasBeenInitialized) {
                console.log('🔍 Calling initDataDefinition');
                initDataDefinition();
                hasBeenInitialized = true;
            } else {
                console.log('🔍 Already initialized, skipping init');
            }
        });
    } else {
        console.warn('⚠️ mngr_sett.js: dataDefinitionTab not found');
    }

    // The save button for schedule settings is inside the tab content, so it doesn't need a listener here.
    // It's added dynamically in `loadScheduleSettings`.
    // We need to add the event listener for the save button in init, as the button is always present in the DOM.
    const saveScheduleBtn = container.querySelector('#saveScheduleSettingsBtn');
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', saveScheduleSettings);
    }

    // Add event listeners for buttons that previously used onclick
    const saveBasicSettingsBtn = container.querySelector('#saveBasicSettingsBtn');
    if (saveBasicSettingsBtn) saveBasicSettingsBtn.addEventListener('click', saveBasicSettings);

    const exportSettingsBtn = container.querySelector('#exportSettingsBtn');
    if (exportSettingsBtn) exportSettingsBtn.addEventListener('click', exportSettings);

    const importSettingsBtn = container.querySelector('#importSettingsBtn');
    if (importSettingsBtn) importSettingsBtn.addEventListener('click', importSettings);

    const saveChartSettingsBtn = container.querySelector('#saveChartSettingsBtn');
    if (saveChartSettingsBtn) saveChartSettingsBtn.addEventListener('click', saveChartSettings);

    const exportIconsBtn = container.querySelector('#exportIconsBtn');
    if (exportIconsBtn) exportIconsBtn.addEventListener('click', exportIcons);

    const importIconsBtn = container.querySelector('#importIconsBtn');
    if (importIconsBtn) importIconsBtn.addEventListener('click', importIcons);

    // 엑셀 템플릿 관리 이벤트 리스너 추가
    const excelTemplateTab = container.querySelector('button[data-tab="excelTemplateManagement"]');
    if (excelTemplateTab) {
        excelTemplateTab.addEventListener('click', loadExcelTemplateInfo);
    }

    // 검색 기능 이벤트 리스너 추가 (자동 검색 - debounce 적용)
    const searchInput = container.querySelector('#settingsSearchInput');
    let searchDebounceTimer = null;
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            
            // 이전 타이머 취소
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
            
            // 300ms 후 검색 실행
            searchDebounceTimer = setTimeout(() => {
                // window._mngrSettState를 통해 상태 업데이트
                if (!window._mngrSettState) window._mngrSettState = {};
                window._mngrSettState.settingsSearchTerm = searchTerm || null;
                window._mngrSettState.settingsCurrentPage = 1;
                loadPageData({ page: 1, searchTerm: searchTerm || null });
            }, 300);
        });
    }

    const uploadExcelTemplateBtn = container.querySelector('#uploadExcelTemplateBtn');
    if (uploadExcelTemplateBtn) {
        uploadExcelTemplateBtn.addEventListener('click', uploadExcelTemplate);
    }

    const downloadExcelTemplateBtn = container.querySelector('#downloadExcelTemplateBtn');
    if (downloadExcelTemplateBtn) {
        downloadExcelTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }

    const deleteExcelTemplateBtn = container.querySelector('#deleteExcelTemplateBtn');
    if (deleteExcelTemplateBtn) {
        deleteExcelTemplateBtn.addEventListener('click', deleteExcelTemplate);
    }

    // 초기에 첫 번째 탭(기본 설정)을 활성화하고 데이터를 로드합니다.
    const firstTab = container.querySelector('.tab-button[data-tab="basicSettings"]');
    if (firstTab) {
        // The 'active' class is already on the first tab by default in HTML.
        // No need to simulate a click, just load the data.
        firstTab.classList.add('active');
        const basicSettingsTab = container.querySelector('#basicSettings');
        if (basicSettingsTab) {
            basicSettingsTab.classList.add('active');
        }
    }

    // 데이터 로드 - F5 새로고침 시에도 보장
    console.log('=== LOAD PAGE DATA START ==='); // 디버그 로그 추가
    await loadPageData();
    console.log('=== LOAD PAGE DATA COMPLETE ==='); // 디버그 로그 추가
}

export async function init() {
    console.log('=== INIT FUNCTION CALLED ==='); // 디버그 로그 추가
    const container = document.getElementById('mngr_sett_page');
    if (!container) {
        console.error('Container not found: mngr_sett_page');
        return;
    }
    
    await initializePage();
}


// --- START: Excel Template Management Functions ---

/**
 * 엑셀 템플릿 정보를 로드하고 UI를 업데이트합니다.
 */
async function loadExcelTemplateInfo() {
    try {
        const response = await fetch('/api/excel_template/info');
        if (!response.ok) throw new Error('템플릿 정보를 가져오는데 실패했습니다.');

        const data = await response.json();
        updateExcelTemplateUI(data);
    } catch (error) {
        showToast(error.message, 'error');
        updateExcelTemplateUI({ exists: false, message: '정보를 불러올 수 없습니다.' });
    }
}

/**
 * 엑셀 템플릿 UI를 업데이트합니다.
 * @param {object} data - 템플릿 정보
 */
function updateExcelTemplateUI(data) {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;

    const infoDiv = container.querySelector('#excelTemplateInfo');
    const downloadBtn = container.querySelector('#downloadExcelTemplateBtn');
    const deleteBtn = container.querySelector('#deleteExcelTemplateBtn');

    if (data.exists) {
        infoDiv.innerHTML = `
            <p><strong>파일명:</strong> ${data.filename}</p>
            <p><strong>파일 크기:</strong> ${(data.size / 1024).toFixed(1)} KB</p>
            <p><strong>수정일:</strong> ${data.modified}</p>
        `;
        if (downloadBtn) downloadBtn.style.display = 'inline-block';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
    } else {
        infoDiv.innerHTML = `<p>${data.message || '업로드된 엑셀 템플릿이 없습니다.'}</p>`;
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
    }
}

/**
 * 엑셀 템플릿 파일을 업로드합니다.
 */
async function uploadExcelTemplate() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;

    const fileInput = container.querySelector('#excelTemplateFile');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showToast('파일을 선택해주세요.', 'warning');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/excel_template/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || '업로드에 실패했습니다.');

        showToast(result.message, 'success');
        loadExcelTemplateInfo(); // UI 업데이트
        fileInput.value = ''; // 파일 입력 초기화

    } catch (error) {
        showToast(error.message, 'error');
    }
}



/**
 * 엑셀 템플릿 파일을 삭제합니다.
 */
async function deleteExcelTemplate() {
    if (!confirm('엑셀 템플릿을 정말로 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch('/api/excel_template/delete', {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || '삭제에 실패했습니다.');

        showToast(result.message, 'success');
        loadExcelTemplateInfo(); // UI 업데이트

    } catch (error) {
        showToast(error.message, 'error');
    }
}

// --- END: Excel Template Management Functions ---

// --- END: Existing Page Logic ---

// router.js에 의해 호출되는 init 함수에서 데이터 로드 수행
// F5 새로고침 시에도 데이터가 로드되도록 보장
