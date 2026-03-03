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
import { init as initDataDefinition } from '../tabs/dataDefinition/dataDefinition.js';

// 외부 모듈들 가져오기
import { setDataFlowStatus } from '../modules/common/api/client.js';
import { setupTabs, renderSettingsTable, renderIconTable, populateIconSelects, initUI } from '../modules/mngr_sett/ui.js';
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
    importIcons
} from '../modules/mngr_sett/events.js';
import { downloadExcelTemplate } from '../utils/excelDownload.js';

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
        sucsIconId: null, sucsBgColr: '#EBF8FF', sucsTxtColr: '#3182CE',
        failIconId: null, failBgColr: '#FFF5F5', failTxtColr: '#C53030',
        prgsIconId: null, prgsBgColr: '#FFFFF0', prgsTxtColr: '#D69E2E',
        nodtIconId: null, nodtBgColr: '#F7FAFC', nodtTxtColr: '#718096',
        schdIconId: null, schdBgColr: '#FFFFFF', schdTxtColr: '#1A202C',
        grpPrgsIconId: null,
        grpSucsIconId: null
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
                    <div class="form-row">
                        <label for="prgsRtRedThrsval">진행률 문제점 임계값 (%)</label>
                        <input type="number" id="prgsRtRedThrsval" value="${setting.prgsRtRedThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="form-row">
                        <label for="prgsRtOrgThrsval">진행률 경고 임계값 (%)</label>
                        <input type="number" id="prgsRtOrgThrsval" value="${setting.prgsRtOrgThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="form-row">
                        <label for="succRtRedThrsval">성공률 문제점 임계값 (%)</label>
                        <input type="number" id="succRtRedThrsval" value="${setting.succRtRedThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div class="form-row">
                        <label for="succRtOrgThrsval">성공률 경고 임계값 (%)</label>
                        <input type="number" id="succRtOrgThrsval" value="${setting.succRtOrgThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>

                <!-- Group Icon Settings -->
                <div class="setting-group">
                    <div class="setting-group-title">그룹 아이콘 설정</div>
                    <div class="form-row">
                        <label for="grpPrgsIconId">그룹 진행률 아이콘</label>
                        <select id="grpPrgsIconId">${createIconOptions(setting.grpPrgsIconId)}</select>
                    </div>
                    <div class="form-row">
                        <label for="grpSucsIconId">그룹 성공률 아이콘</label>
                        <select id="grpSucsIconId">${createIconOptions(setting.grpSucsIconId)}</select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Status Settings -->
        <div class="settings-section">
            <h2 class="section-title">상태별 표시 설정</h2>
            <div class="status-settings-grid">
                ${createStatusCard('sucs', '성공', setting.sucsIconId, setting.sucsBgColr, setting.sucsTxtColr)}
                ${createStatusCard('fail', '실패', setting.failIconId, setting.failBgColr, setting.failTxtColr)}
                ${createStatusCard('prgs', '수집중', setting.prgsIconId, setting.prgsBgColr, setting.prgsTxtColr)}
                ${createStatusCard('nodt', '미수집', setting.nodtIconId, setting.nodtBgColr, setting.nodtTxtColr)}
                ${createStatusCard('schd', '예정', setting.schdIconId, setting.schdBgColr, setting.schdTxtColr)}
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

        /* 5-Column Grid for Status Settings */
        .status-settings-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 1.5rem;
        }

        /* Status Setting Card */
        .status-card {
            background-color: #f1f5f9;
            padding: 1.25rem;
            border-radius: 0.5rem;
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

            .status-settings-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 768px) {
            .basic-settings-grid {
                grid-template-columns: 1fr;
            }

            .status-settings-grid {
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
        showToast('진행률의 문제점 임계값은 경고 임계값보다 작아야 합니다.', 'error');
        return;
    }
    if (succRtRedThrsval >= succRtOrgThrsval) {
       showToast('성공률의 문제점 임계값은 경고 임계값보다 작아야 합니다.', 'error');
       return;
   }

    const getIconId = (id) => {
        const value = document.getElementById(id).value;
        return value ? parseInt(value) : null;
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
        sucs_icon_id: getIconId('sucsIconId'),
        sucs_bg_colr: document.getElementById('sucsBgColr').value,
        sucs_txt_colr: document.getElementById('sucsTxtColr').value,
        fail_icon_id: getIconId('failIconId'),
        fail_bg_colr: document.getElementById('failBgColr').value,
        fail_txt_colr: document.getElementById('failTxtColr').value,
        prgs_icon_id: getIconId('prgsIconId'),
        prgs_bg_colr: document.getElementById('prgsBgColr').value,
        prgs_txt_colr: document.getElementById('prgsTxtColr').value,
        nodt_icon_id: getIconId('nodtIconId'),
        nodt_bg_colr: document.getElementById('nodtBgColr').value,
        nodt_txt_colr: document.getElementById('nodtTxtColr').value,
        schd_icon_id: getIconId('schdIconId'),
        schd_bg_colr: document.getElementById('schdBgColr').value,
        schd_txt_colr: document.getElementById('schdTxtColr').value,
        grp_prgs_icon_id: getIconId('grpPrgsIconId'),
        grp_sucs_icon_id: getIconId('grpSucsIconId')
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

async function loadPageData() {
    console.log('=== loadPageData() called ===');
    const container = document.getElementById('mngr_sett_page');
    if (!container) {
        console.error('Container not found: mngr_sett_page');
        return;
    }
    const loadingOverlay = container.querySelector('#adminLoadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    try {
        // 개별적으로 API 호출하여 하나의 실패가 전체를 망가뜨리지 않도록 함
        let adminSettings = [];
        let icons = [];
        let userData = { users: [], menus: [] };

        try {
            console.log('=== loadPageData() - getting admin settings ===');
            adminSettings = await getAdminSettings();
            console.log('=== loadPageData() - admin settings received ===');
            console.log('=== Admin settings:', adminSettings);
        } catch (error) {
            console.error('관리자 설정 로드 실패:', error);
            showToast('관리자 설정 로드 실패: ' + error.message, 'warning');
        }

        try {
            console.log('=== loadPageData() - getting icons ===');
            icons = await getIcons();
            console.log('=== loadPageData() - icons received ===');
            console.log('=== Icons:', icons);
        } catch (error) {
            console.error('아이콘 데이터 로드 실패:', error);
            showToast('아이콘 데이터 로드 실패: ' + error.message, 'warning');
        }

        try {
            userData = await userManagementTab.fetchUsersAndMenus();
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
            showToast('사용자 데이터 로드 실패: ' + error.message, 'warning');
        }

        // 각 데이터 렌더링 (실패하더라도 다른 데이터는 렌더링)
        try {
            console.log('=== loadPageData() - rendering settings table ===');
            renderSettingsTable(adminSettings, icons);
        } catch (error) {
            console.error('설정 테이블 렌더링 실패:', error);
        }

        try {
            console.log('=== loadPageData() - rendering icon table ===');
            renderIconTable(icons);
        } catch (error) {
            console.error('아이콘 테이블 렌더링 실패:', error);
        }

        try {
            populateIconSelects(icons);
            window.allIconsData = icons;
        } catch (error) {
            console.error('아이콘 선택 옵션 설정 실패:', error);
        }

        try {
            userManagementTab.renderTable(userData.users, userData.menus);
        } catch (error) {
            console.error('사용자 관리 테이블 렌더링 실패:', error);
        }

        showToast('관리자 설정 페이지 로드 완료.', 'success');
    } catch (error) {
        showToast('페이지 초기화 중 치명적 오류 발생: ' + error.message, 'error');
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

// 전역으로 loadPageData 함수 노출
window.loadPageData = loadPageData;

let initializePageHasRun = false;

async function initializePage() {
    if (initializePageHasRun) {
        console.log('=== INITIALIZE PAGE ALREADY RUN ===');
        return;
    }
    initializePageHasRun = true;
    
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

    // F5 새로고침 시 init() 함수가 호출되지 않는 근본 원인 해결
    // router.js의 DOMContentLoaded 이벤트 타이밍 문제 해결
    initializePageHasRun = false; // 강제로 초기화 상태를 리셋
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
