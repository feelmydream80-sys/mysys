// static/js/modules/dashboard/events.js

/**
 * @module events
 * @description 대시보드 이벤트 처리 및 메인 로직을 담당합니다.
 * - 페이지 초기화, 데이터 로딩, UI 렌더링 등 전체 흐름을 제어합니다.
 * - 페이징 모듈과 연동하여 테이블 데이터를 관리합니다.
 * 
 * @example
 * // 사용 예시: main.js 또는 dashboard.js
 * import { initializeDashboard } from './modules/dashboard/events.js';
 * 
 * // 대시보드 페이지 전체 초기화
 * document.addEventListener('DOMContentLoaded', initializeDashboard);
 */

import { fetchDashboardSummary } from '../common/api/dashboard.js';
import { showMessage } from '../common/utils.js';
import { initPagination, updatePaginationData } from '../ui_components/pagination.js';
import { initCollapsibleFeatures } from '../ui_components/collapsible.js';
import { renderDashboardSummaryTable } from './dashboardTable.js';
import { initializeDashboardData, getAllAdminSettings, getDataFlowStatus, setDashboardSummaryData, getDashboardSummaryData } from './data.js';
import { initializeDatePickers, updateSummaryCards, renderDashboardChartText, fetchAndDisplayMinMaxDatesDashboard } from './ui.js';
import { initEventLog } from './eventLog.js';
import { downloadExcelTemplate } from '../../utils/excelDownload.js';

// 페이징 초기화 여부 플래그
let isPaginationInitialized = false;

// 전역 함수로 등록하여 dashboard.js에서 호출 가능
window.resetDashboardPagination = function() {
    isPaginationInitialized = false;
};

/**
 * @description 대시보드 요약 데이터를 로드하고 UI를 업데이트합니다.
 * 이 함수는 전역 스코프에 할당되어 날짜 변경 시 호출됩니다.
 */
async function loadDashboardSummary(initialLoad = false) {
    const dataFlowStatus = getDataFlowStatus();
    dataFlowStatus.overallStatus = "loading";

    // 이벤트 객체가 전달된 경우 처리
    const isEvent = arguments.length > 0 && typeof arguments[0] === 'object' && arguments[0].target;
    if (isEvent) {
        initialLoad = false;
    }

    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const allData = initialLoad || document.getElementById('allDataCheckbox')?.checked || false;

    try {
        const summaryData = await fetchDashboardSummary(startDate, endDate, allData);
        // Job ID 숫자 값 기준 오름차순 정렬 적용
        summaryData.sort((a, b) => {
            const numA = parseInt(a.job_id.replace('CD', ''), 10);
            const numB = parseInt(b.job_id.replace('CD', ''), 10);
            return numA - numB;
        });
        setDashboardSummaryData(summaryData); // 전체 데이터 저장
        dataFlowStatus.dashboardSummaryFetch.apiResponseCount = summaryData.length;

        if (!summaryData || summaryData.length === 0) {
            console.warn("No dashboard summary data to render.");
            showMessage('대시보드 요약 데이터가 없습니다.', 'info');
            updateSummaryCards([]);
            renderDashboardChartText([]);
            if (isPaginationInitialized) {
                updatePaginationData('detailTablePagination', []);
            } else {
                initPaginationWithData([]);
            }
            return;
        }

        // Backend now provides settings merged, so no need for client-side merging.
        updateSummaryCards(summaryData);
        // renderDashboardChartText(summaryData);

        if (isPaginationInitialized) {
            updatePaginationData('detailTablePagination', summaryData);
        } else {
            initPaginationWithData(summaryData);
        }

        dataFlowStatus.dashboardSummaryFetch.dataProcessedCount = summaryData.length;
        dataFlowStatus.dashboardSummaryFetch.apiCallSuccess = true;
        dataFlowStatus.dashboardSummaryFetch.chartRendered = true;
        showMessage('대시보드 요약 업데이트 완료.', 'success');

    } catch (error) {
        dataFlowStatus.overallStatus = "error";
        dataFlowStatus.dashboardSummaryFetch.error = error.message;
        console.error("대시보드 요약 업데이트 중 오류 발생:", error);
        showMessage('대시보드 요약 업데이트 중 오류 발생: ' + error.message, 'error');
    }
}

/**
 * @description 페이징 모듈을 데이터와 함께 초기화합니다.
 * @param {Array} summaryData - 대시보드 요약 데이터
 */
function initPaginationWithData(summaryData) {
    // `allJobSettings` and `iconMap` are no longer needed here as they are part of `summaryData`
    initPagination({
        fullData: summaryData,
        pageSize: 5,
        renderTableCallback: (paginatedData) => {
            // The rendering function will now extract settings from each data item
            renderDashboardSummaryTable(paginatedData);
        },
        paginationId: 'detailTablePagination',
        pageSizeId: 'detailTablePageSize',
        searchId: 'detailTableSearch',
    });
    isPaginationInitialized = true;
}

/**
 * @description 대시보드 페이지의 모든 기능을 초기화하는 메인 함수입니다.
 */
export async function initializeDashboard() {

    // 접기/펴기 기능 초기화 (모듈화된 함수 호출)
    initCollapsibleFeatures();

    const dataFlowStatus = getDataFlowStatus();
    dataFlowStatus.overallStatus = "loading";
    
    try {
        // 필수 데이터 병렬 로드 및 '실 존재 데이터 기간' 표시
        await initializeDashboardData();
        fetchAndDisplayMinMaxDatesDashboard();

        // 전역 함수로 loadDashboardSummary 등록
        window.loadDashboardSummary = loadDashboardSummary;

        initializeDatePickers(window.loadDashboardSummary);
        window.loadDashboardSummary(true); // 초기 데이터 로드
        
        const allAdminSettings = getAllAdminSettings();
        initEventLog(allAdminSettings); // 이벤트 로그 모듈 초기화

        // 검색 이벤트 리스너 추가
        const searchInput = document.getElementById('detailTableSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (event) => {
                const searchTerm = event.target.value.toLowerCase();
                const allData = getDashboardSummaryData();
                
                const filteredData = allData.filter(item => {
                    const jobId = item.job_id ? item.job_id.toLowerCase() : '';
                    const cdNm = item.cd_nm ? item.cd_nm.toLowerCase() : '';
                    const frequency = item.frequency ? item.frequency.toLowerCase() : '';
                    
                    return jobId.includes(searchTerm) || 
                           cdNm.includes(searchTerm) || 
                           frequency.includes(searchTerm);
                });
                
                updatePaginationData('detailTablePagination', filteredData);
            });
        }

        // 엑셀 템플릿 다운로드 버튼 이벤트 리스너
        const downloadExcelTemplateBtn = document.getElementById('downloadExcelTemplateBtn');
        if (downloadExcelTemplateBtn) {
            downloadExcelTemplateBtn.addEventListener('click', downloadExcelTemplate);
        }



        dataFlowStatus.overallStatus = "success";
        showMessage('대시보드 페이지 로드 완료.', 'success');

    } catch (error) {
        dataFlowStatus.overallStatus = "error";
        console.error("대시보드 페이지 초기화 실패:", error);
        showMessage('대시보드 페이지 초기화 중 오류 발생: ' + error.message, 'error');
    }
}
