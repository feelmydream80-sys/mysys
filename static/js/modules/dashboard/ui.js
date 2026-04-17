// static/js/modules/dashboard/ui.js

/**
 * @module ui
 * @description 대시보드 UI 렌더링 및 상호작용을 담당합니다.
 * - 날짜 선택기, 요약 카드, 텍스트 차트 등 UI 컴포넌트를 초기화하고 업데이트합니다.
 * 
 * @example
 * // 사용 예시: main.js 또는 dashboard.js
 * import { initializeUI, updateDashboardUI } from './modules/dashboard/ui.js';
 * import { getSummaryData } from './modules/dashboard/events.js';
 * 
 * // UI 초기화
 * initializeUI();
 * 
 * // 데이터 로드 후 UI 업데이트
 * async function refreshUI() {
 *   const summaryData = await getSummaryData();
 *   updateDashboardUI(summaryData);
 * }
 * 
 * refreshUI();
 */

import { fetchMinMaxDates } from '../common/api/dashboard.js';
import { showMessage, formatNumberWithKoreanUnits } from '../common/utils.js';
import { getKSTNow, formatDate } from '../common/dateUtils.js';

/**
 * @description 날짜 선택기(Datepicker)를 초기화하고 변경 이벤트를 설정합니다.
 * @param {Function} loadSummaryCallback - 날짜 변경 시 호출될 콜백 함수
 */
export function initializeDatePickers(loadSummaryCallback) {
    const startDatePicker = document.getElementById('startDate');
    const endDatePicker = document.getElementById('endDate');
    const allDataCheckbox = document.getElementById('allDataCheckbox');

    // KST 기준으로 일자 계산 (공통 모듈 사용)
    const today = getKSTNow();
    const currentYear = today.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    
    const defaultStartDate = formatDate(startOfYear);
    const defaultEndDate = formatDate(today);

    if (startDatePicker) startDatePicker.value = defaultStartDate;
    if (endDatePicker) endDatePicker.value = defaultEndDate;
    if (allDataCheckbox) allDataCheckbox.checked = false;

    // 이벤트 리스너에 익명 함수로 래핑하여 이벤트 객체가 전달되지 않도록 함
    if (startDatePicker) startDatePicker.addEventListener('change', () => loadSummaryCallback());
    if (endDatePicker) endDatePicker.addEventListener('change', () => loadSummaryCallback());
    if (allDataCheckbox) {
        allDataCheckbox.addEventListener('change', () => {
            if (startDatePicker) startDatePicker.disabled = allDataCheckbox.checked;
            if (endDatePicker) endDatePicker.disabled = allDataCheckbox.checked;
            loadSummaryCallback();
        });
    }
}

/**
 * @description 상단의 요약 카드(총 Job 수, 기간별 수집 현황 등)를 업데이트하는 함수
 * @param {Array} summaryData - 대시보드 요약 데이터
 */
export function updateSummaryCards(summaryData) {
    // DOM 요소 존재 확인
    const totalJobsElement = document.getElementById('totalJobsCount');
    const totalCollectionsElement = document.getElementById('totalCollectionsCount');

    if (!totalJobsElement || !totalCollectionsElement) {
        console.warn('Dashboard summary elements not found in DOM');
        return;
    }

    if (summaryData.length === 0) {
        totalJobsElement.textContent = '0';
        totalCollectionsElement.textContent = '0';
        ['day', 'week', 'month', 'half', 'year'].forEach(p => {
            const rateElement = document.getElementById(`${p}SuccessRate`);
            const countElement = document.getElementById(`${p}TotalCount`);
            if (rateElement) rateElement.textContent = '0.00';
            if (countElement) countElement.textContent = '0';
        });
        return;
    }

    const totalJobsCount = summaryData.length;
    const totalCollections = summaryData.reduce((sum, item) => {
        return sum + (item.overall_success_count || 0) + (item.overall_fail_count || 0) + (item.overall_no_data_count || 0);
    }, 0);

    totalJobsElement.textContent = totalJobsCount;
    totalCollectionsElement.textContent = formatNumberWithKoreanUnits(totalCollections);

    // --- New logic for daily summary calculation ---
    const totalDaySuccess = summaryData.reduce((sum, item) => sum + (item.day_success || 0), 0);
    const totalDayScheduled = summaryData.reduce((sum, item) => sum + (item.day_total_scheduled || 0), 0);
    const daySuccessRate = totalDayScheduled > 0 ? ((totalDaySuccess / totalDayScheduled) * 100).toFixed(2) : '0.00';

    const daySuccessRateElement = document.getElementById('daySuccessRate');
    const dayTotalCountElement = document.getElementById('dayTotalCount');
    if (daySuccessRateElement) daySuccessRateElement.textContent = daySuccessRate;
    if (dayTotalCountElement) dayTotalCountElement.textContent = formatNumberWithKoreanUnits(totalDayScheduled);

    // --- Logic for other periods (week, month, etc.) ---
    const calculatePeriodTotalsForCards = (periodPrefix) => {
        let totalSuccess = 0, totalFail = 0, totalNoData = 0;
        summaryData.forEach(item => {
            totalSuccess += (item[periodPrefix + '_success'] || 0);
            totalFail += (item[periodPrefix + '_fail_count'] || 0);
            totalNoData += (item[periodPrefix + '_no_data_count'] || 0);
        });
        // For historical data, total is the sum of outcomes
        const total = totalSuccess + totalFail + totalNoData;
        const successRate = total > 0 ? ((totalSuccess / total) * 100).toFixed(2) : '0.00';
        return { total, successRate };
    };

    // Calculate for other periods, excluding 'day'
    ['week', 'month', 'half', 'year'].forEach(p => {
        const stats = calculatePeriodTotalsForCards(p);
        const rateElement = document.getElementById(`${p}SuccessRate`);
        const countElement = document.getElementById(`${p}TotalCount`);
        if (rateElement) rateElement.textContent = stats.successRate;
        if (countElement) countElement.textContent = formatNumberWithKoreanUnits(stats.total);
    });
}

/**
 * @description 대시보드 요약 데이터를 기반으로 텍스트 차트를 렌더링합니다.
 * @param {Array<Object>} summaryData - 대시보드 요약 데이터 배열
 */
export function renderDashboardChartText(summaryData) {
    const chartContainer = document.getElementById('dashboardChartContainer');
    if (!chartContainer) {
        console.warn("Element with ID 'dashboardChartContainer' not found. Skipping text chart rendering.");
        return;
    }

    let chartText = '<h3 class="text-lg font-semibold mb-2">수집현황 분석 차트</h3>';
    if (summaryData.length === 0) {
        chartText += '<p class="text-gray-600">표시할 차트 데이터가 없습니다.</p>';
    } else {
        chartText += '<pre class="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-96">';
        chartText += 'Job ID별 수집 성공률:\n\n';
        summaryData.forEach(item => {
            const yearTotalForChart = (item.year_success || 0) + (item.year_fail_count || 0) + (item.year_no_data_count || 0) + (item.year_cd904_count || 0) + (item.year_ing_count || 0);
            const yearSuccessRate = yearTotalForChart > 0 ? ((item.year_success || 0) / yearTotalForChart * 100).toFixed(2) : '0.00';
            chartText += `[${item.job_id}] ${item.cd_nm}: ${yearSuccessRate}%\n`;
        });
        chartText += '</pre>';
    }
    chartContainer.innerHTML = chartText;
}

/**
 * @description 데이터의 최소/최대 날짜를 가져와 화면에 표시합니다. (대시보드 전용)
 */
export async function fetchAndDisplayMinMaxDatesDashboard() {
    const minDateDisplayElement = document.getElementById('minDateDisplay');
    const maxDateDisplayElement = document.getElementById('maxDateDisplay');
    const summaryMinDateElement = document.getElementById('summary-min-date');
    const summaryMaxDateElement = document.getElementById('summary-max-date');

    if (!minDateDisplayElement || !maxDateDisplayElement || !summaryMinDateElement || !summaryMaxDateElement) {
        console.warn("One or more date display elements are missing.");
        return;
    }

    try {
        // 대시보드는 'dashboardSummary' 타입의 날짜를 조회합니다.
        const dates = await fetchMinMaxDates('dashboardSummary');
        const minDate = dates.min_date || 'N/A';
        const maxDate = dates.max_date || 'N/A';

        minDateDisplayElement.textContent = minDate;
        maxDateDisplayElement.textContent = maxDate;
        summaryMinDateElement.textContent = minDate;
        summaryMaxDateElement.textContent = maxDate;
    } catch (error) {
        console.error("Failed to fetch min/max dates for dashboard:", error);
        const errorMsg = 'Error';
        minDateDisplayElement.textContent = errorMsg;
        maxDateDisplayElement.textContent = errorMsg;
        summaryMinDateElement.textContent = errorMsg;
        summaryMaxDateElement.textContent = errorMsg;
        showMessage('실 존재 데이터 기간 로드에 실패했습니다.', 'error');
    }
}

/**
 * @description 지정된 요소에 데이터의 최소/최대 날짜를 표시합니다.
 * @param {string} dataType - 조회할 데이터 타입 ('dashboardSummary' 또는 'eventLog')
 * @param {string} minDateId - 최소 날짜를 표시할 요소의 ID
 * @param {string} maxDateId - 최대 날짜를 표시할 요소의 ID
 */
export async function displayMinMaxDates(dataType, minDateId, maxDateId) {
    const minDateDisplayElement = document.getElementById(minDateId);
    const maxDateDisplayElement = document.getElementById(maxDateId);

    if (!minDateDisplayElement || !maxDateDisplayElement) {
        console.warn(`Element with ID '${minDateId}' or '${maxDateId}' not found.`);
        return;
    }

    try {
        const dates = await fetchMinMaxDates(dataType);
        minDateDisplayElement.textContent = dates.min_date || 'N/A';
        maxDateDisplayElement.textContent = dates.max_date || 'N/A';
    } catch (error) {
        console.error(`Failed to fetch min/max dates for ${dataType}:`, error);
        minDateDisplayElement.textContent = 'Error';
        maxDateDisplayElement.textContent = 'Error';
        showMessage(`최소/최대 날짜 로드 실패: ${error.message}`, 'error');
    }
}
