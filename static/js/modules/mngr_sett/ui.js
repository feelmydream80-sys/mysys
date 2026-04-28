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

// 사용자접속정보 탭 재진입 시 데이터 리로드 (헤더 먼저 업데이트)
            if (tab.dataset.tab === 'userAccessInfo' && window.userAccessInfo) {
                window.userAccessInfo.updateMonthHeaders();
                window.userAccessInfo.updateThresholdInputs();
                window.userAccessInfo.refresh();
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
// 페이징 상태 관리 (window 객체를 통해 전역으로 노출)
window._mngrSettState = {
    settingsCurrentPage: 1,
    chartSettingsCurrentPage: 1,
    iconsCurrentPage: 1,
    settingsItemsPerPage: 10,
    chartSettingsItemsPerPage: 10,
    iconsItemsPerPage: 10,
    settingsSearchTerm: null,
    settingsTotalCount: 0,
    settingsTotalPages: 0
};

const itemsPerPageOptions = [5, 10, 20, 50, 100]; // 표시 수량 옵션

// 편의를 위한 로컬 참조
let settingsCurrentPage = window._mngrSettState.settingsCurrentPage;
let chartSettingsCurrentPage = window._mngrSettState.chartSettingsCurrentPage;
let iconsCurrentPage = window._mngrSettState.iconsCurrentPage;
let settingsItemsPerPage = window._mngrSettState.settingsItemsPerPage;
let chartSettingsItemsPerPage = window._mngrSettState.chartSettingsItemsPerPage;
let iconsItemsPerPage = window._mngrSettState.iconsItemsPerPage;
let settingsSearchTerm = window._mngrSettState.settingsSearchTerm;
let settingsTotalCount = window._mngrSettState.settingsTotalCount;
let settingsTotalPages = window._mngrSettState.settingsTotalPages;

/**
 * 검색 결과 정보를 업데이트하는 함수
 */
function updateSearchResultInfo() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    
    // 제목 옆 전체 건수 업데이트
    const settingsTotalCountSpan = container.querySelector('#settingsTotalCount');
    if (settingsTotalCountSpan) {
        settingsTotalCountSpan.textContent = `(전체 ${settingsTotalCount}건)`;
    }
    
    const searchResultInfo = container.querySelector('#searchResultInfo');
    const searchResultText = container.querySelector('#searchResultText');
    if (!searchResultInfo || !searchResultText) return;
    
    if (settingsSearchTerm) {
        searchResultText.textContent = `'${settingsSearchTerm}' 검색 결과: ${settingsTotalCount}건`;
        searchResultInfo.style.display = 'block';
    } else {
        searchResultInfo.style.display = 'none';
    }
}

/**
 * 서버 사이드 페이징 버튼을 렌더링하는 함수
 */
function renderServerSidePagination() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    
    const settingsTable = container.querySelector('#settingsTable');
    if (!settingsTable) return;
    
    // 기존 페이징 컨테이너 제거
    const existingPagination = document.getElementById('settingsPagination');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    // 페이징이 필요 없으면 종료
    if (settingsTotalPages <= 1) return;
    
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'settingsPagination';
    paginationContainer.style.cssText = 'margin-top: 15px; display: flex; gap: 5px; justify-content: center; align-items: center;';
    
    // 이전 페이지 버튼
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '이전';
    prevBtn.className = 'btn';
    prevBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
    prevBtn.disabled = settingsCurrentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (settingsCurrentPage > 1) {
            settingsCurrentPage--;
            window._mngrSettState.settingsCurrentPage = settingsCurrentPage;
            loadPageDataWithPagination();
        }
    });
    
    // 페이지 번호 버튼
    const pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.style.cssText = 'display: flex; gap: 5px;';
    
    // 페이지 번호 계산 (현재 페이지 중심으로 최대 5개 표시)
    let startPage = Math.max(1, settingsCurrentPage - 2);
    let endPage = Math.min(settingsTotalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `btn ${i === settingsCurrentPage ? 'btn-primary' : ''}`;
        pageBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        if (i === settingsCurrentPage) {
            pageBtn.style.backgroundColor = '#007bff';
            pageBtn.style.color = 'white';
            pageBtn.style.borderColor = '#007bff';
        }
        pageBtn.addEventListener('click', () => {
            settingsCurrentPage = i;
            window._mngrSettState.settingsCurrentPage = settingsCurrentPage;
            loadPageDataWithPagination();
        });
        pageNumbersContainer.appendChild(pageBtn);
    }
    
    // 다음 페이지 버튼
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '다음';
    nextBtn.className = 'btn';
    nextBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
    nextBtn.disabled = settingsCurrentPage === settingsTotalPages;
    nextBtn.addEventListener('click', () => {
        if (settingsCurrentPage < settingsTotalPages) {
            settingsCurrentPage++;
            window._mngrSettState.settingsCurrentPage = settingsCurrentPage;
            loadPageDataWithPagination();
        }
    });
    
    // 표시 수량 콤보박스
    const itemsPerPageSelect = document.createElement('select');
    itemsPerPageSelect.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 15px;';
    itemsPerPageOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = `${option} 건`;
        if (option === settingsItemsPerPage) {
            optionElement.selected = true;
        }
        itemsPerPageSelect.appendChild(optionElement);
    });
    itemsPerPageSelect.addEventListener('change', (e) => {
        settingsItemsPerPage = parseInt(e.target.value);
        settingsCurrentPage = 1;
        window._mngrSettState.settingsItemsPerPage = settingsItemsPerPage;
        window._mngrSettState.settingsCurrentPage = settingsCurrentPage;
        loadPageDataWithPagination();
    });
    
    paginationContainer.appendChild(itemsPerPageSelect);
    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(pageNumbersContainer);
    paginationContainer.appendChild(nextBtn);
    settingsTable.parentNode.appendChild(paginationContainer);
}

/**
 * 페이징 정보를 사용하여 데이터를 다시 로드하는 함수
 * 스크롤 위치를 유지합니다.
 */
function loadPageDataWithPagination() {
    // 현재 스크롤 위치 저장
    const scrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
    
    if (typeof window.loadPageData === 'function') {
        window.loadPageData({
            page: settingsCurrentPage,
            perPage: settingsItemsPerPage,
            searchTerm: settingsSearchTerm
        }).then(() => {
            // DOM 업데이트가 완료된 후 스크롤 위치 복원
            // requestAnimationFrame을 두 번 사용하여 렌더링 사이클 완료 후 실행
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                });
            });
        }).catch(() => {
            // 에러 발생 시에도 스크롤 복원
            window.scrollTo(0, scrollPosition);
        });
    }
}

// 아이콘 관리 데이터 수량 콤보박스 이벤트 리스너
function setupIconsItemsPerPageListener() {
    const select = document.getElementById('iconsItemsPerPage');
    if (select) {
        select.addEventListener('change', (e) => {
            iconsItemsPerPage = parseInt(e.target.value);
            iconsCurrentPage = 1;
            // renderIconTable는 refreshIconsData 호출시 호출되므로 loadPageData 호출
            if (typeof window.loadPageData === 'function') {
                window.loadPageData();
            }
        });
    }
}

// 데이터 수량 콤보박스 이벤트 리스너
function setupSettingsItemsPerPageListener() {
    const select = document.getElementById('settingsItemsPerPage');
    if (select) {
        select.addEventListener('change', (e) => {
            settingsItemsPerPage = parseInt(e.target.value);
            settingsCurrentPage = 1;
            // 페이지 리로드시 renderSettingsTable가 호출되므로 여기서는 별도로 호출하지 않음
            // 대신, loadPageData를 호출하여 데이터를 다시 로드
            if (typeof window.loadPageData === 'function') {
                window.loadPageData();
            }
        });
    }
}

// 차트 설정 데이터 수량 콤보박스 이벤트 리스너
function setupChartSettingsItemsPerPageListener() {
    const select = document.getElementById('chartSettingsItemsPerPage');
    if (select) {
        select.addEventListener('change', (e) => {
            chartSettingsItemsPerPage = parseInt(e.target.value);
            chartSettingsCurrentPage = 1;
            // renderChartSettingsTable는 renderSettingsTable 내에서 호출되므로 loadPageData 호출
            if (typeof window.loadPageData === 'function') {
                window.loadPageData();
            }
        });
    }
}

// 초기화 함수
export function initSettingsPagination() {
    setupSettingsItemsPerPageListener();
    setupChartSettingsItemsPerPageListener();
    setupIconsItemsPerPageListener();
}

/**
 * 서버 사이드 페이징을 지원하는 설정 테이블 렌더링 함수
 * @param {Array} allMngrSett - 설정 데이터 배열 (서버에서 페이징된 데이터)
 * @param {Array} allIcons - 아이콘 데이터 배열
 * @param {Object} paginationInfo - 페이징 정보 { total, page, per_page, total_pages }
 */
export function renderSettingsTable(allMngrSett, allIcons, paginationInfo = null) {
    console.log('=== renderSettingsTable() called ===');
    console.log('=== allMngrSett:', allMngrSett);
    console.log('=== allIcons:', allIcons);
    console.log('=== paginationInfo:', paginationInfo);
    
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const settingsTableBody = container.querySelector('#settingsTableBody');
    if (!settingsTableBody) return;

    settingsTableBody.innerHTML = '';

    // paginationInfo가 있으면 서버 사이드 페이징 모드
    const isServerPaging = paginationInfo !== null;
    
    // 서버 사이드 페이징인 경우 total 정보를 저장
    if (isServerPaging) {
        settingsTotalCount = paginationInfo.total || 0;
        settingsTotalPages = paginationInfo.total_pages || 0;
    }

    if (!allMngrSett || allMngrSett.length === 0) {
        const emptyMessage = isServerPaging && settingsSearchTerm 
            ? `'${settingsSearchTerm}'에 대한 검색 결과가 없습니다.`
            : '표시할 Job ID가 없습니다. (tb_con_hist에 이력이 있는 Job ID만 표시됩니다.)';
        settingsTableBody.innerHTML = `<tr><td colspan="20" class="text-center py-4">${emptyMessage}</td></tr>`;
        renderChartSettingsTable([]); // 차트 설정 테이블도 함께 렌더링
        updateSearchResultInfo();
        return;
    }

    // 서버 사이드 페이징이 아닌 경우에만 클라이언트 사이드 정렬/페이징
    let displayData = allMngrSett;
    let sortedMngrSett = allMngrSett;
    if (!isServerPaging) {
        // Job ID를 숫자 값 기준으로 정렬 (CD100, CD300, CD1000 순서)
        sortedMngrSett = allMngrSett.slice().sort((a, b) => {
            const aNum = parseInt(a.cd.replace('CD', ''));
            const bNum = parseInt(b.cd.replace('CD', ''));
            return aNum - bNum;
        });
        renderChartSettingsTable(sortedMngrSett); // 차트 설정 테이블도 함께 렌더링

        // 페이징된 데이터 렌더링
        const startIndex = (settingsCurrentPage - 1) * settingsItemsPerPage;
        const endIndex = startIndex + settingsItemsPerPage;
        displayData = sortedMngrSett.slice(startIndex, endIndex);
    } else {
        // 서버 사이드 페이징인 경우 차트 테이블도 함께 렌더링
        renderChartSettingsTable(allMngrSett);
    }

    // 서버 사이드 페이징인 경우 서버 사이드 페이징 버튼 렌더링
    if (isServerPaging) {
        updateSearchResultInfo();
        renderServerSidePagination();
    }

    // displayData를 사용하여 행 렌더링
    displayData.forEach(setting => {
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
                if (window.setActiveColorInput) {
                    window.setActiveColorInput(e.target);
                }
            });
        });
    });

    // 페이징 버튼 추가 (테이블 하단)
    const settingsTable = document.querySelector('#settingsTable');
    if (settingsTable && sortedMngrSett.length > settingsItemsPerPage) {
        // 기존 페이징 컨테이너가 있으면 제거
        const existingPagination = document.getElementById('settingsPagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'settingsPagination';
        paginationContainer.style.cssText = 'margin-top: 15px; display: flex; gap: 5px; justify-content: center;';
        
        const totalPages = Math.ceil(sortedMngrSett.length / settingsItemsPerPage);
        
        // 이전 페이지 버튼
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '이전';
        prevBtn.className = 'btn';
        prevBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        prevBtn.disabled = settingsCurrentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (settingsCurrentPage > 1) {
                settingsCurrentPage--;
                renderSettingsTable(allMngrSett, allIcons);
            }
        });
        
        // 페이지 번호 버튼
        const pageNumbersContainer = document.createElement('div');
        pageNumbersContainer.style.cssText = 'display: flex; gap: 5px;';
        
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `btn ${i === settingsCurrentPage ? 'btn-primary' : ''}`;
            pageBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
            if (i === settingsCurrentPage) {
                pageBtn.style.backgroundColor = '#007bff';
                pageBtn.style.color = 'white';
                pageBtn.style.borderColor = '#007bff';
            }
            pageBtn.addEventListener('click', () => {
                settingsCurrentPage = i;
                renderSettingsTable(allMngrSett, allIcons);
            });
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // 다음 페이지 버튼
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '다음';
        nextBtn.className = 'btn';
        nextBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        nextBtn.disabled = settingsCurrentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (settingsCurrentPage < totalPages) {
                settingsCurrentPage++;
                renderSettingsTable(allMngrSett, allIcons);
            }
        });
        
        // 표시 수량 콤보박스
        const itemsPerPageSelect = document.createElement('select');
        itemsPerPageSelect.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 15px;';
        itemsPerPageOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = `${option} 건`;
            if (option === settingsItemsPerPage) {
                optionElement.selected = true;
            }
            itemsPerPageSelect.appendChild(optionElement);
        });
        itemsPerPageSelect.addEventListener('change', (e) => {
            settingsItemsPerPage = parseInt(e.target.value);
            settingsCurrentPage = 1;
            renderSettingsTable(allMngrSett, allIcons);
        });
        
        paginationContainer.appendChild(itemsPerPageSelect);
        paginationContainer.appendChild(prevBtn);
        paginationContainer.appendChild(pageNumbersContainer);
        paginationContainer.appendChild(nextBtn);
        settingsTable.parentNode.appendChild(paginationContainer);
    }
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

    // 페이징된 데이터 렌더링
    const startIndex = (chartSettingsCurrentPage - 1) * chartSettingsItemsPerPage;
    const endIndex = startIndex + chartSettingsItemsPerPage;
    const pagedData = allMngrSett.slice(startIndex, endIndex);

    pagedData.forEach(setting => {
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

    // 페이징 버튼 추가 (테이블 하단)
    const chartSettingsTable = document.querySelector('#chartSettingsTable');
    if (chartSettingsTable && allMngrSett.length > chartSettingsItemsPerPage) {
        // 기존 페이징 컨테이너가 있으면 제거
        const existingPagination = document.getElementById('chartSettingsPagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'chartSettingsPagination';
        paginationContainer.style.cssText = 'margin-top: 15px; display: flex; gap: 5px; justify-content: center;';
        
        const totalPages = Math.ceil(allMngrSett.length / chartSettingsItemsPerPage);
        
        // 이전 페이지 버튼
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '이전';
        prevBtn.className = 'btn';
        prevBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        prevBtn.disabled = chartSettingsCurrentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (chartSettingsCurrentPage > 1) {
                chartSettingsCurrentPage--;
                renderChartSettingsTable(allMngrSett);
            }
        });
        
        // 페이지 번호 버튼
        const pageNumbersContainer = document.createElement('div');
        pageNumbersContainer.style.cssText = 'display: flex; gap: 5px;';
        
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `btn ${i === chartSettingsCurrentPage ? 'btn-primary' : ''}`;
            pageBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
            if (i === chartSettingsCurrentPage) {
                pageBtn.style.backgroundColor = '#007bff';
                pageBtn.style.color = 'white';
                pageBtn.style.borderColor = '#007bff';
            }
            pageBtn.addEventListener('click', () => {
                chartSettingsCurrentPage = i;
                renderChartSettingsTable(allMngrSett);
            });
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // 다음 페이지 버튼
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '다음';
        nextBtn.className = 'btn';
        nextBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        nextBtn.disabled = chartSettingsCurrentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (chartSettingsCurrentPage < totalPages) {
                chartSettingsCurrentPage++;
                renderChartSettingsTable(allMngrSett);
            }
        });
        
        // 표시 수량 콤보박스
        const itemsPerPageSelect = document.createElement('select');
        itemsPerPageSelect.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 15px;';
        itemsPerPageOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = `${option} 건`;
            if (option === chartSettingsItemsPerPage) {
                optionElement.selected = true;
            }
            itemsPerPageSelect.appendChild(optionElement);
        });
        itemsPerPageSelect.addEventListener('change', (e) => {
            chartSettingsItemsPerPage = parseInt(e.target.value);
            chartSettingsCurrentPage = 1;
            renderChartSettingsTable(allMngrSett);
        });
        
        paginationContainer.appendChild(itemsPerPageSelect);
        paginationContainer.appendChild(prevBtn);
        paginationContainer.appendChild(pageNumbersContainer);
        paginationContainer.appendChild(nextBtn);
        chartSettingsTable.parentNode.appendChild(paginationContainer);
    }
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

    // 페이징된 데이터 렌더링
    const startIndex = (iconsCurrentPage - 1) * iconsItemsPerPage;
    const endIndex = startIndex + iconsItemsPerPage;
    const pagedData = allIcons.slice(startIndex, endIndex);

    pagedData.forEach(icon => {
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

    // 페이징 버튼 추가 (테이블 하단)
    const iconsPaginationContainer = document.getElementById('iconsPagination');
    if (iconsPaginationContainer && allIcons.length > iconsItemsPerPage) {
        // 기존 페이징 내용이 있으면 제거
        iconsPaginationContainer.innerHTML = '';
        
        const totalPages = Math.ceil(allIcons.length / iconsItemsPerPage);
        
        // 이전 페이지 버튼
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '이전';
        prevBtn.className = 'btn';
        prevBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        prevBtn.disabled = iconsCurrentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (iconsCurrentPage > 1) {
                iconsCurrentPage--;
                renderIconTable(allIcons);
            }
        });
        
        // 페이지 번호 버튼
        const pageNumbersContainer = document.createElement('div');
        pageNumbersContainer.style.cssText = 'display: flex; gap: 5px;';
        
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `btn ${i === iconsCurrentPage ? 'btn-primary' : ''}`;
            pageBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
            if (i === iconsCurrentPage) {
                pageBtn.style.backgroundColor = '#007bff';
                pageBtn.style.color = 'white';
                pageBtn.style.borderColor = '#007bff';
            }
            pageBtn.addEventListener('click', () => {
                iconsCurrentPage = i;
                renderIconTable(allIcons);
            });
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // 다음 페이지 버튼
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '다음';
        nextBtn.className = 'btn';
        nextBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        nextBtn.disabled = iconsCurrentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (iconsCurrentPage < totalPages) {
                iconsCurrentPage++;
                renderIconTable(allIcons);
            }
        });
        
        // 표시 수량 콤보박스
        const itemsPerPageSelect = document.createElement('select');
        itemsPerPageSelect.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 15px;';
        itemsPerPageOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = `${option} 건`;
            if (option === iconsItemsPerPage) {
                optionElement.selected = true;
            }
            itemsPerPageSelect.appendChild(optionElement);
        });
        itemsPerPageSelect.addEventListener('change', (e) => {
            iconsItemsPerPage = parseInt(e.target.value);
            iconsCurrentPage = 1;
            renderIconTable(allIcons);
        });
        
        iconsPaginationContainer.appendChild(itemsPerPageSelect);
        iconsPaginationContainer.appendChild(prevBtn);
        iconsPaginationContainer.appendChild(pageNumbersContainer);
        iconsPaginationContainer.appendChild(nextBtn);
    } else if (iconsPaginationContainer) {
        // 데이터 수가 페이지당 표시 수보다 적을 때 페이징 컨테이너를 숨기거나 빈 상태로 유지
        iconsPaginationContainer.innerHTML = '';
    }
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
