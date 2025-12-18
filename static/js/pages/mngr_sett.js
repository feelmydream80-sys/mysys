// @DOC_FILE: mngr_sett.js
// @DOC_DESC: 관리자 설정 페이지의 메인 JavaScript 파일. 각 탭의 UI와 이벤트 로직을 관리합니다.

// 디버그 모드 설정 (프로덕션에서는 false로 변경)
const DEBUG_MODE = false; // TODO: 프로덕션 배포 시 false로 변경

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log('[MngrSett]', ...args);
    }
}

// import { showMessage } from '../modules/common/utils.js'; // toast.js를 직접 사용
import { showToast } from '../utils/toast.js';
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

// --- START: Statistics Tab Logic ---

// DOM Elements for Statistics Tab
const statsElements = {
    tab: null,
    dailyViewRadio: null,
    weeklyMonthlyViewRadio: null,
    comparisonViewRadio: null, // Added for comparison view
    yearSelect: null,
    menuSelect: null,
    dateRangeContainer: null,
    startDateInput: null,
    endDateInput: null,
    filterBtn: null,
    excelDownloadBtn: null,
    dailyViewContainer: null,
    weeklyMonthlyViewContainer: null,
    comparisonViewContainer: null, // Added for comparison view
    summaryContainer: null,
    dailyTableBody: null,
    weeklyTable: null,
    comparisonTable: null, // Added for comparison view
    comparisonYearLegend: null, // Added for year legend
    chartCanvas: null,
    chartInstance: null
};

/**
 * Sets the default date for statistics to today.
 */
function setDefaultStatsDate() {
    const today = new Date().toISOString().split('T')[0];
    statsElements.startDateInput.value = today;
    debugLog('통계 날짜 기본값 설정 (오늘):', today);
}

/**
 * Initializes the statistics tab functionality.
 */
async function initStatisticsTab() {
    // 1. Assign DOM elements
    Object.keys(statsElements).forEach(key => {
        const id = {
            tab: 'button[data-tab="statistics"]',
            dailyViewRadio: 'dailyViewRadio',
            weeklyMonthlyViewRadio: 'weeklyMonthlyViewRadio',
            comparisonViewRadio: 'comparisonViewRadio',
            yearSelect: 'statsYearSelect',
            menuSelect: 'statsMenuSelect',
            dateRangeContainer: 'statsDateRangeContainer',
            startDateInput: 'statsStartDate',
            endDateInput: 'statsEndDate',
            filterBtn: 'statsFilterBtn',
            excelDownloadBtn: 'statsExcelDownloadBtn',
            dailyViewContainer: 'dailyViewContainer',
            weeklyMonthlyViewContainer: 'weeklyMonthlyViewContainer',
            comparisonViewContainer: 'comparisonViewContainer',
            summaryContainer: 'statsSummary',
            dailyTableBody: 'menuStatsTableBody',
            weeklyTable: 'weeklyMonthlyStatsTable',
            comparisonTable: 'comparisonStatsTable',
            comparisonYearLegend: 'comparisonYearLegend',
            chartCanvas: 'accessStatsChart'
        }[key];
    const container = document.getElementById('mngr_sett_page');
    if (!container) {
        console.error('통계 초기화 실패: mngr_sett_page 컨테이너를 찾을 수 없음');
        return;
    }
    statsElements[key] = container.querySelector(`#${id}`) || container.querySelector(id);
    debugLog(`통계 요소 초기화 - ${key}: ${id} →`, statsElements[key] ? '성공' : '실패');
    });

    if (!statsElements.tab) {
        console.warn('통계 탭을 찾을 수 없음 - 통계 기능 비활성화');
        return; // Statistics tab not present
    }

    debugLog('통계 탭 초기화 시작');

    // 2. Add event listeners
    if (statsElements.tab) {
        debugLog('통계 탭 이벤트 리스너 등록');
        statsElements.tab.addEventListener('click', () => {
            debugLog('통계 탭 클릭됨 - loadStatisticsConfig 호출');
            loadStatisticsConfig();
        });
    } else {
        console.error('통계 탭 요소를 찾을 수 없어 이벤트 리스너 등록 실패');
    }
    if (statsElements.excelDownloadBtn) statsElements.excelDownloadBtn.addEventListener('click', downloadExcel);
    
    const autoLoadStats = () => {
        toggleStatsView();
        loadStatisticsData();
    };

    if (statsElements.dailyViewRadio) statsElements.dailyViewRadio.addEventListener('change', autoLoadStats);
    if (statsElements.weeklyMonthlyViewRadio) statsElements.weeklyMonthlyViewRadio.addEventListener('change', autoLoadStats);
    if (statsElements.comparisonViewRadio) statsElements.comparisonViewRadio.addEventListener('change', autoLoadStats);
    if (statsElements.yearSelect) statsElements.yearSelect.addEventListener('change', loadStatisticsData);
    if (statsElements.menuSelect) statsElements.menuSelect.addEventListener('change', loadStatisticsData);
    if (statsElements.startDateInput) statsElements.startDateInput.addEventListener('change', loadStatisticsData);


    // 3. Set initial UI state - 최근 데이터가 있는 날짜로 기본값 설정
    await setDefaultStatsDate();
    toggleStatsView();
}

/**
 * Fetches configuration data (years, menus) and populates the dropdowns.
 */
async function loadStatisticsConfig() {
    // Prevent re-loading config if already populated
    if (statsElements.yearSelect.options.length > 0) {
        loadStatisticsData(); // If config is loaded, just fetch data
        return;
    }

    try {
        const response = await fetch('/api/statistics/config');
        if (!response.ok) throw new Error('Failed to load statistics config');
        const config = await response.json() || {};

        // API 응답은 정상(200 OK)이지만, 내용이 비어있거나 예상과 다른 형식일 경우를 대비
        debugLog('통계 설정 데이터 검증:', { years: config.years?.length, menus: config.menus?.length });
        if (!config.years || !config.menus) {
            console.error('통계 설정 데이터 누락:', { years: !!config.years, menus: !!config.menus });
            // 빈 데이터로 테이블을 그려서 UI가 깨지는 것을 방지
            renderDailyStats({ menu_access_stats: [], total_access_stats: {} }, []);
            throw new Error('통계 설정 데이터가 비어있거나 형식이 올바르지 않습니다.');
        }

        // Populate year dropdown
        statsElements.yearSelect.innerHTML = '';
        config.years.forEach(year => {
            const option = new Option(`${year}년`, year);
            statsElements.yearSelect.add(option);
        });

        // Populate menu dropdown
        statsElements.menuSelect.innerHTML = '';
        statsElements.menuSelect.add(new Option('전체 메뉴', 'all'));
        config.menus.forEach(menu => {
            const option = new Option(menu.menu_nm, menu.menu_id);
            statsElements.menuSelect.add(option);
        });

        // Render the initial state of the daily stats table with all menus
        renderDailyStats({ menu_access_stats: [], total_access_stats: {} }, config.menus);

        // Load data after populating filters
        loadStatisticsData();

    } catch (error) {
        showToast(error.message, 'error');
        // 오류 발생 시, 빈 데이터로 통계 UI를 초기화하여 깨진 상태로 두지 않도록 함
        renderDailyStats({ menu_access_stats: [], total_access_stats: {} }, []);
    }
}

/**
 * Toggles the view between daily, weekly/monthly, and comparison.
 */
function toggleStatsView() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const viewType = container.querySelector('input[name="statsViewType"]:checked')?.value;

    const showIf = (element, condition) => {
        if (element) element.style.display = condition ? (element.tagName === 'DIV' ? 'block' : 'flex') : 'none';
    };

    showIf(statsElements.dailyViewContainer, viewType === 'daily');
    showIf(statsElements.weeklyMonthlyViewContainer, viewType === 'weekly_monthly');
    showIf(statsElements.comparisonViewContainer, viewType === 'comparison');
    
    showIf(statsElements.dateRangeContainer, viewType === 'daily');
    showIf(statsElements.yearSelect, viewType === 'weekly_monthly' || viewType === 'comparison');
    
    if (statsElements.menuSelect) statsElements.menuSelect.style.display = 'none'; // Always hide for now
    if (statsElements.excelDownloadBtn) statsElements.excelDownloadBtn.style.display = 'inline-block'; // Always show
}

/**
 * Fetches and renders the main statistics data based on current filter settings.
 */
async function loadStatisticsData() {
    debugLog('통계 데이터 로드 시작');

    const container = document.getElementById('mngr_sett_page');
    if (!container) {
        console.error('통계 데이터 로드 실패: 컨테이너를 찾을 수 없음');
        return;
    }

    const viewType = container.querySelector('input[name="statsViewType"]:checked')?.value;
    debugLog('통계 뷰 타입:', viewType);

    if (!viewType) {
        console.error('통계 뷰 타입을 찾을 수 없음');
        return;
    }

    const params = new URLSearchParams({ view_type: viewType });
    debugLog('API 파라미터:', params.toString());

    if (viewType === 'daily') {
        const selectedDate = statsElements.startDateInput?.value;
        debugLog('선택된 날짜:', selectedDate);

        if (!selectedDate) {
            console.error('선택된 날짜가 없음 - 기본값 사용');
            // 기본값으로 오늘 날짜 사용
            const today = new Date().toISOString().split('T')[0];
            params.append('start_date', today);
            params.append('end_date', today);
        } else {
            params.append('start_date', selectedDate);
            params.append('end_date', selectedDate);
        }
    } else { // weekly_monthly or comparison
        const selectedYear = statsElements.yearSelect?.value;
        debugLog('선택된 연도:', selectedYear);

        if (!selectedYear) {
            console.error('선택된 연도가 없음');
            // 기본값으로 현재 연도 사용
            const currentYear = new Date().getFullYear();
            params.append('year', currentYear.toString());
        } else {
            params.append('year', selectedYear);
        }
        params.append('menu_nm', 'all');
    }

    debugLog('최종 API 파라미터:', params.toString());

    try {
        debugLog('통계 API 호출 시작:', `/api/statistics?${params.toString()}`);
        const response = await fetch(`/api/statistics?${params.toString()}`);
        debugLog('통계 API 응답 상태:', response.status);

        if (!response.ok) {
            console.error('통계 API 실패:', response.status, response.statusText);
            throw new Error('Failed to fetch statistics data');
        }

        const data = await response.json();
        debugLog('통계 API 데이터 수신:', data);

        if (viewType === 'daily') {
            const configResponse = await fetch('/api/statistics/config');
            const config = await configResponse.json();
            renderDailyStats(data, config.menus);
        } else if (viewType === 'weekly_monthly') {
            renderWeeklyMonthlyStats(data);
            if (data.yearly_chart_data) {
                renderLineChart(data.yearly_chart_data, data.weekly_stats);
            }
        } else if (viewType === 'comparison') {
            renderComparisonStats(data);
            renderComparisonLineChart(data);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Renders the statistics for the daily view.
 * @param {object} data - The statistics data from the API.
 * @param {array} allMenus - The complete list of menus from the config.
 */
function renderDailyStats(data, allMenus = []) {
    debugLog('일별 통계 렌더링 시작');
    debugLog('데이터:', data);
    debugLog('메뉴 목록:', allMenus);

    const { menu_access_stats, total_access_stats } = data;
    debugLog('메뉴 접근 통계:', menu_access_stats);
    debugLog('전체 통계:', total_access_stats);

    // Render summary
    statsElements.summaryContainer.innerHTML = `
        <div class="bg-blue-100 p-4 rounded-lg text-center">
            <p class="text-lg font-semibold text-blue-800">총 접속 횟수</p>
            <p class="text-3xl font-bold">${total_access_stats.total_access_count || 0}</p>
        </div>
        <div class="bg-green-100 p-4 rounded-lg text-center">
            <p class="text-lg font-semibold text-green-800">순 방문자 수</p>
            <p class="text-3xl font-bold">${total_access_stats.unique_user_count || 0}</p>
        </div>
    `;

    // Create a map of stats by menu_id for easy lookup
    const statsMap = new Map();
    if (menu_access_stats) {
        menu_access_stats.forEach(stat => statsMap.set(stat.menu_id, stat));
    }

    // Render table
    statsElements.dailyTableBody.innerHTML = '';
    const menusToRender = allMenus.length > 0 ? allMenus : []; // Always use allMenus for the structure
    
    if (menusToRender.length > 0) {
        menusToRender.forEach(menu => {
            const stat = statsMap.get(menu.menu_id) || { total_access_count: 0, unique_user_count: 0 };
            const row = `<tr>
                <td>${menu.menu_nm}</td>
                <td>${stat.total_access_count}</td>
                <td>${stat.unique_user_count}</td>
            </tr>`;
            statsElements.dailyTableBody.innerHTML += row;
        });
        // Render bar chart for daily stats, passing all menu info for correct labels
        renderBarChart(menu_access_stats || [], allMenus);
    } else {
        statsElements.dailyTableBody.innerHTML = '<tr><td colspan="3">표시할 메뉴가 없습니다.</td></tr>';
        if (statsElements.chartInstance) {
            statsElements.chartInstance.destroy();
        }
    }
}

/**
 * Renders the statistics for the weekly/monthly view.
 * @param {object} data - The statistics data from the API.
 */
function renderWeeklyMonthlyStats(data) {
    const { weekly_stats, yearly_total } = data;
    const table = statsElements.weeklyTable;
    if (!table) return;

    // Clear previous content
    table.innerHTML = '';

    // Create header
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['월', '주차', '메뉴', '총 접속 횟수', '메뉴별 순 방문자 수', '사이트 순 방문자 수'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    // Create body
    const tbody = table.createTBody();
    if (weekly_stats && weekly_stats.length > 0) {
        const monthlyData = {};
        weekly_stats.forEach(week => {
            if (!monthlyData[week.month]) {
                monthlyData[week.month] = [];
            }
            monthlyData[week.month].push(week);
        });

        Object.keys(monthlyData).sort((a, b) => a - b).forEach(month => {
            const weeksInMonth = monthlyData[month];
            const totalRowsInMonth = weeksInMonth.reduce((sum, week) => sum + week.menus.length, 0);
            
            weeksInMonth.forEach((weekData, weekIndex) => {
                weekData.menus.forEach((menu, menuIndex) => {
                    const row = tbody.insertRow();
                    
                    if (weekIndex === 0 && menuIndex === 0) {
                        const monthCell = row.insertCell();
                        monthCell.textContent = `${month}월`;
                        monthCell.rowSpan = totalRowsInMonth;
                        monthCell.style.verticalAlign = 'middle';
                    }

                    if (menuIndex === 0) {
                        const weekCell = row.insertCell();
                        weekCell.textContent = `${weekData.week}주`;
                        weekCell.rowSpan = weekData.menus.length;
                        weekCell.style.verticalAlign = 'middle';
                    }

                    row.insertCell().textContent = menu.menu_nm;
                    row.insertCell().textContent = (menu.total_access_count || 0).toLocaleString();
                    row.insertCell().textContent = (menu.unique_user_count || 0).toLocaleString();

                    if (menuIndex === 0) {
                        const siteUniqueCell = row.insertCell();
                        siteUniqueCell.textContent = (weekData.site_unique_user_count || 0).toLocaleString();
                        siteUniqueCell.rowSpan = weekData.menus.length;
                        siteUniqueCell.style.verticalAlign = 'middle';
                    }
                });
            });
        });
    } else {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = headers.length;
        cell.textContent = '데이터가 없습니다.';
        cell.style.textAlign = 'center';
    }

    // Create footer for yearly total - more robustly
    let tfoot = table.querySelector('tfoot');
    if (!tfoot) {
        tfoot = table.createTFoot();
    }
    tfoot.innerHTML = ''; // Clear any existing footer content

    if (yearly_total) {
        const footerRow = tfoot.insertRow();
        const totalCell = footerRow.insertCell();
        totalCell.colSpan = 3;
        totalCell.textContent = '연간 총계';
        totalCell.style.fontWeight = 'bold';
        totalCell.style.textAlign = 'center';

        footerRow.insertCell().textContent = (yearly_total.total_access_count || 0).toLocaleString();
        footerRow.insertCell().textContent = (yearly_total.total_menu_unique_user_count || 0).toLocaleString();
        footerRow.insertCell().textContent = (yearly_total.total_site_unique_user_count || 0).toLocaleString();
    }
}


function renderBarChart(menuAccessStats, allMenus) {
    debugLog('막대 차트 렌더링 시작');
    debugLog('메뉴 접근 통계:', menuAccessStats);
    debugLog('전체 메뉴:', allMenus);

    if (statsElements.chartInstance) {
        debugLog('기존 차트 인스턴스 파괴');
        statsElements.chartInstance.destroy();
    }

    // Create a map for quick lookup
    const statsMap = new Map(menuAccessStats.map(item => [item.menu_id, item]));
    debugLog('통계 맵 생성 완료');

    // Ensure all menus are represented
    const chartData = allMenus.map(menu => {
        const stats = statsMap.get(menu.menu_id);
        return {
            menu_nm: menu.menu_nm,
            total_access_count: stats ? stats.total_access_count : 0,
            unique_user_count: stats ? stats.unique_user_count : 0
        };
    });

    const labels = chartData.map(d => d.menu_nm);
    const totalAccessData = chartData.map(d => d.total_access_count);
    const uniqueUserData = chartData.map(d => d.unique_user_count);

    statsElements.chartInstance = new Chart(statsElements.chartCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '총 접속 횟수',
                    data: totalAccessData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: '순 방문자 수',
                    data: uniqueUserData,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/**
 * Renders the line chart for weekly totals, showing all weeks of the year.
 * @param {Array<object>} yearlyChartData - The raw weekly statistics data for the entire year.
 * @param {Array<object>} weeklyStatsData - The processed weekly data for the table (used for site unique users).
 */
function renderLineChart(yearlyChartData, weeklyStatsData) {
    if (statsElements.chartInstance) {
        statsElements.chartInstance.destroy();
    }

    const year = statsElements.yearSelect.value;
    if (!year) return;

    // 1. Create a complete list of labels and a zero-filled data structure for the entire year
    const allWeeksData = [];
    const labels = [];
    for (let month = 1; month <= 12; month++) {
        // Assume 5 weeks per month for a consistent chart axis, covering all possible weeks.
        for (let week = 1; week <= 5; week++) {
            const label = `${month}월 ${week}주`;
            labels.push(label);
            allWeeksData.push({
                label: label,
                month: month,
                week: week,
                total_access_count: 0,
                menu_unique_user_count: 0,
                site_unique_user_count: 0
            });
        }
    }

    // 2. Aggregate API data by week
    const apiAggregates = {};
    if (yearlyChartData && yearlyChartData.length > 0) {
        yearlyChartData.forEach(row => {
            const key = `${row.month}-${row.week_of_month}`;
            if (!apiAggregates[key]) {
                apiAggregates[key] = { total_access_count: 0, menu_unique_user_count: 0 };
            }
            apiAggregates[key].total_access_count += Number(row.total_access_count || 0);
            apiAggregates[key].menu_unique_user_count += Number(row.unique_user_count || 0);
        });
    }
    if (weeklyStatsData && weeklyStatsData.length > 0) {
        weeklyStatsData.forEach(weekData => {
            const key = `${weekData.month}-${weekData.week}`;
            if (!apiAggregates[key]) {
                apiAggregates[key] = { total_access_count: 0, menu_unique_user_count: 0 };
            }
            apiAggregates[key].site_unique_user_count = weekData.site_unique_user_count;
        });
    }

    // 3. Map API data to the full year structure
    allWeeksData.forEach(weekData => {
        const key = `${weekData.month}-${weekData.week}`;
        if (apiAggregates[key]) {
            weekData.total_access_count = apiAggregates[key].total_access_count;
            weekData.menu_unique_user_count = apiAggregates[key].menu_unique_user_count;
            weekData.site_unique_user_count = apiAggregates[key].site_unique_user_count || 0;
        }
    });

    const totalAccessData = allWeeksData.map(d => d.total_access_count);
    const menuUniqueUserData = allWeeksData.map(d => d.menu_unique_user_count);
    const siteUniqueUserData = allWeeksData.map(d => d.site_unique_user_count);

    statsElements.chartInstance = new Chart(statsElements.chartCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '총 접속 횟수',
                    data: totalAccessData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.1
                },
                {
                    label: '사이트 순 방문자 수',
                    data: siteUniqueUserData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/**
 * Handles the Excel file download for the currently active statistics view.
 */
async function downloadExcel() {
    if (typeof XLSX === 'undefined') {
        showToast('엑셀 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.', 'warning');
        return;
    }
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;

    const viewType = container.querySelector('input[name="statsViewType"]:checked').value;
    const year = statsElements.yearSelect.value;
    const selectedDate = statsElements.startDateInput.value;

    try {
        let wb = XLSX.utils.book_new();
        let ws, ws_data, fileName;

        const params = new URLSearchParams({ view_type: viewType });
        if (viewType === 'daily') {
            params.append('start_date', selectedDate);
            params.append('end_date', selectedDate);
        } else { // weekly_monthly or comparison
            params.append('year', year);
        }

        const response = await fetch(`/api/statistics?${params.toString()}`);
        if (!response.ok) throw new Error('통계 데이터 다운로드에 실패했습니다.');
        const data = await response.json();

        if (viewType === 'daily') {
            fileName = `일별_접속통계_${selectedDate}.xlsx`;
            ws_data = [['메뉴', '총 접속 횟수', '순 방문자 수']];
            const configResponse = await fetch('/api/statistics/config');
            const config = await configResponse.json();
            const statsMap = new Map(data.menu_access_stats.map(s => [s.menu_id, s]));
            config.menus.forEach(menu => {
                const stat = statsMap.get(menu.menu_id) || { total_access_count: 0, unique_user_count: 0 };
                ws_data.push([menu.menu_nm, stat.total_access_count, stat.unique_user_count]);
            });
            ws = XLSX.utils.aoa_to_sheet(ws_data);
            XLSX.utils.book_append_sheet(wb, ws, "일별 통계");

        } else if (viewType === 'weekly_monthly') {
            fileName = `주별-월별_접속통계_${year}.xlsx`;
            ws_data = [['월', '주차', '메뉴', '총 접속 횟수', '메뉴별 순 방문자 수', '사이트 순 방문자 수']];
            data.weekly_stats.forEach(week => {
                week.menus.forEach((menu, index) => {
                    ws_data.push([
                        index === 0 ? `${week.month}월` : '',
                        index === 0 ? `${week.week}주` : '',
                        menu.menu_nm,
                        menu.total_access_count,
                        menu.unique_user_count,
                        index === 0 ? week.site_unique_user_count : ''
                    ]);
                });
            });
            ws = XLSX.utils.aoa_to_sheet(ws_data);
            XLSX.utils.book_append_sheet(wb, ws, "주별-월별 통계");

        } else if (viewType === 'comparison') {
            fileName = `연도별_비교_통계_${year}.xlsx`;
            ws_data = [['월', '주차', '메뉴', '연도', '총 접속 횟수', '메뉴별 순 방문자 수', '사이트 순 방문자 수']];
            
            const combinedData = {};
            const processData = (stats, year_label) => {
                if (!stats) return;
                stats.forEach(week => {
                    const weekKey = `${week.month}-${week.week}`;
                    if (!combinedData[weekKey]) combinedData[weekKey] = { month: week.month, week: week.week, menus: {} };
                    week.menus.forEach(menu => {
                        const menuKey = menu.menu_nm;
                        if (!combinedData[weekKey].menus[menuKey]) combinedData[weekKey].menus[menuKey] = {};
                        combinedData[weekKey].menus[menuKey][year_label] = {
                            ...menu,
                            site_unique: week.site_unique_user_count
                        };
                    });
                });
            };
            processData(data.this_year_stats, year);
            processData(data.last_year_stats, year - 1);

            const sortedWeeks = Object.values(combinedData).sort((a, b) => a.month - b.month || a.week - b.week);
            sortedWeeks.forEach(week => {
                Object.keys(week.menus).sort().forEach(menuName => {
                    const thisYearMenu = week.menus[menuName][year];
                    const lastYearMenu = week.menus[menuName][year - 1];

                    if (thisYearMenu) {
                        ws_data.push([`${week.month}월`, `${week.week}주`, menuName, year, thisYearMenu.total_access_count, thisYearMenu.unique_user_count, thisYearMenu.site_unique]);
                    }
                    if (lastYearMenu) {
                        ws_data.push([`${week.month}월`, `${week.week}주`, menuName, year - 1, lastYearMenu.total_access_count, lastYearMenu.unique_user_count, lastYearMenu.site_unique]);
                    }
                });
            });
            ws = XLSX.utils.aoa_to_sheet(ws_data);
            XLSX.utils.book_append_sheet(wb, ws, "연도별 비교 통계");
        }

        if (ws) {
            XLSX.writeFile(wb, fileName);
            showToast('Excel 파일 다운로드가 시작되었습니다.', 'success');
        } else {
            showToast('다운로드할 데이터가 없습니다.', 'info');
        }

    } catch (error) {
        showToast(`엑셀 다운로드 오류: ${error.message}`, 'error');
    }
}

/**
 * Renders the statistics table for the comparison view.
 * @param {object} data - The statistics data from the API, containing this_year_stats and last_year_stats.
 */
function renderComparisonStats(data) {
    const { this_year_stats, last_year_stats, yearly_total } = data;
    const table = statsElements.comparisonTable;
    if (!table) return;

    // Set year legend
    const currentYear = statsElements.yearSelect.value;
    if (statsElements.comparisonYearLegend) {
        statsElements.comparisonYearLegend.textContent = `( ${currentYear}년 / ${currentYear - 1}년 )`;
    }

    table.innerHTML = ''; // Clear previous content

    // --- Header ---
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    const headers = ['월', '주차', '메뉴', '총 접속 횟수', '메뉴별 순 방문자 수', '사이트 순 방문자 수'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.innerHTML = text.replace(/\s/g, '<br>'); // Add line breaks for readability
        headerRow.appendChild(th);
    });

    // --- Body ---
    const tbody = table.createTBody();
    if (!this_year_stats || this_year_stats.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = headers.length;
        cell.textContent = '데이터가 없습니다.';
        cell.style.textAlign = 'center';
        return;
    }

    // Helper function to calculate growth and format output
    const getGrowthHtml = (current, previous) => {
        const diff = current - previous;
        const arrow = diff > 0 ? '▲' : (diff < 0 ? '▼' : '');
        const color = diff > 0 ? 'text-red-500' : (diff < 0 ? 'text-blue-500' : 'text-gray-500');

        if (previous === 0) {
            if (current > 0) {
                return `<span class="${color}">${arrow} ${diff.toLocaleString()}</span>`;
            }
            return `<span class="text-gray-500">-</span>`;
        }
        
        const growth = ((current - previous) / previous) * 100;
        
        return `<span class="${color}">${arrow} ${diff.toLocaleString()} (${growth.toFixed(1)}%)</span>`;
    };

    // Combine and group data
    const combinedData = {};
    const processData = (stats, year) => {
        if (!stats) return;
        stats.forEach(week => {
            const weekKey = `${week.month}-${week.week}`;
            if (!combinedData[weekKey]) {
                combinedData[weekKey] = { month: week.month, week: week.week, menus: {}, site_unique: {} };
            }
            combinedData[weekKey].site_unique[year] = week.site_unique_user_count;
            week.menus.forEach(menu => {
                if (!combinedData[weekKey].menus[menu.menu_nm]) {
                    combinedData[weekKey].menus[menu.menu_nm] = {};
                }
                combinedData[weekKey].menus[menu.menu_nm][year] = menu;
            });
        });
    };
    processData(this_year_stats, 'this_year');
    processData(last_year_stats, 'last_year');

    const sortedWeeks = Object.values(combinedData).sort((a, b) => a.month - b.month || a.week - b.week);

    // Render rows
    const monthlyRowSpans = {};
    sortedWeeks.forEach(week => {
        const menuCount = Object.keys(week.menus).length;
        if (!monthlyRowSpans[week.month]) monthlyRowSpans[week.month] = 0;
        monthlyRowSpans[week.month] += menuCount;
    });

    let currentMonth = -1;
    sortedWeeks.forEach(weekData => {
        const menuNames = Object.keys(weekData.menus).sort();
        const numMenus = menuNames.length;

        menuNames.forEach((menuName, menuIndex) => {
            const row = tbody.insertRow();
            const thisYearData = weekData.menus[menuName]['this_year'] || { total_access_count: 0, unique_user_count: 0 };
            const lastYearData = weekData.menus[menuName]['last_year'] || { total_access_count: 0, unique_user_count: 0 };

            // Month cell (with rowspan)
            if (weekData.month !== currentMonth) {
                currentMonth = weekData.month;
                const monthCell = row.insertCell();
                monthCell.textContent = `${currentMonth}월`;
                monthCell.rowSpan = monthlyRowSpans[currentMonth];
                monthCell.style.verticalAlign = 'middle';
            }

            // Week cell (with rowspan)
            if (menuIndex === 0) {
                const weekCell = row.insertCell();
                weekCell.textContent = `${weekData.week}주`;
                weekCell.rowSpan = numMenus;
                weekCell.style.verticalAlign = 'middle';
            }

            // Menu name
            row.insertCell().textContent = menuName;

            // Data cells
            const fields = ['total_access_count', 'unique_user_count'];
            fields.forEach(field => {
                const current = thisYearData[field] || 0;
                const previous = lastYearData[field] || 0;
                const cell = row.insertCell();
                cell.innerHTML = `
                    <div class="flex flex-col items-center">
                        <span>${current.toLocaleString()} / ${previous.toLocaleString()}</span>
                        ${getGrowthHtml(current, previous)}
                    </div>
                `;
            });
            
            // Site unique visitors (with rowspan)
            if (menuIndex === 0) {
                const siteCell = row.insertCell();
                const current = weekData.site_unique['this_year'] || 0;
                const previous = weekData.site_unique['last_year'] || 0;
                siteCell.innerHTML = `
                    <div class="flex flex-col items-center">
                        <span>${current.toLocaleString()} / ${previous.toLocaleString()}</span>
                        ${getGrowthHtml(current, previous)}
                    </div>
                `;
                siteCell.rowSpan = numMenus;
                siteCell.style.verticalAlign = 'middle';
            }
        });
    });

    // --- Footer ---
    const tfoot = table.createTFoot();
    tfoot.innerHTML = ''; // Clear
    if (yearly_total) {
        const thisYear = yearly_total.this_year || {};
        const lastYear = yearly_total.last_year || {};
        const footerRow = tfoot.insertRow();
        footerRow.innerHTML = `<td colspan="3" class="text-center font-bold">연간 총계</td>`;

        const fields = ['total_access_count', 'total_menu_unique_user_count', 'total_site_unique_user_count'];
        fields.forEach(field => {
            const current = thisYear[field] || 0;
            const previous = lastYear[field] || 0;
            const cell = footerRow.insertCell();
            cell.innerHTML = `
                <div class="flex flex-col items-center font-bold">
                    <span>${current.toLocaleString()} / ${previous.toLocaleString()}</span>
                    ${getGrowthHtml(current, previous)}
                </div>
            `;
        });
    }
}

function renderComparisonLineChart(data) {
    if (statsElements.chartInstance) {
        statsElements.chartInstance.destroy();
    }

    const { yearly_chart_data_this_year, yearly_chart_data_last_year } = data;
    const year = statsElements.yearSelect.value;
    if (!year) return;

    const labels = [];
    for (let month = 1; month <= 12; month++) {
        for (let week = 1; week <= 5; week++) {
            labels.push(`${month}월 ${week}주`);
        }
    }

    const processChartData = (chartData) => {
        const weeklyTotals = new Array(labels.length).fill(0);
        if (!chartData) return weeklyTotals;

        chartData.forEach(row => {
            const monthIndex = row.month - 1;
            const weekIndex = row.week_of_month - 1;
            const labelIndex = monthIndex * 5 + weekIndex;
            if (labelIndex >= 0 && labelIndex < weeklyTotals.length) {
                weeklyTotals[labelIndex] += Number(row.total_access_count || 0);
            }
        });
        return weeklyTotals;
    };

    const thisYearData = processChartData(yearly_chart_data_this_year);
    const lastYearData = processChartData(yearly_chart_data_last_year);

    statsElements.chartInstance = new Chart(statsElements.chartCanvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `${year}년 총 접속 횟수`,
                    data: thisYearData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.1
                },
                {
                    label: `${year - 1}년 총 접속 횟수`,
                    data: lastYearData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// --- END: Statistics Tab Logic ---


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

    formContainer.innerHTML = `
        <input type="hidden" id="scheduleSettId" value="${setting.settId ?? ''}">
        
        <!-- General Settings -->
        <div class="p-6 rounded-lg border border-gray-200 bg-gray-50">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">기본 설정</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="form-group">
                    <label for="grpMinCnt" class="block text-sm font-medium text-gray-700 mb-1">그룹화 최소 개수</label>
                    <input type="number" id="grpMinCnt" value="${setting.grpMinCnt ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-1">그룹 외곽선 스타일</label>
                    <div class="border-style-selector">${borderStyleOptions}</div>
                </div>
                <div class="form-group flex items-center">
                     <div class="flex items-center h-10">
                        <input type="checkbox" id="scheduleUseYn" ${setting.useYn === 'Y' ? 'checked' : ''} class="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                        <label for="scheduleUseYn" class="ml-2 block text-sm font-medium text-gray-900">설정 사용 여부</label>
                    </div>
                </div>
                <div class="form-group md:col-span-2">
                   <h4 class="text-md font-semibold text-gray-700 mb-2 border-t pt-4">그룹 색상 임계값 설정</h4>
                    <div class="flex items-center space-x-4">
                        <label class="block text-sm font-medium text-gray-700">색상 기준:</label>
                        <label><input type="radio" name="grpColrCrtr" value="prgr" ${setting.grpColrCrtr === 'prgr' ? 'checked' : ''}> 진행률</label>
                        <label><input type="radio" name="grpColrCrtr" value="succ" ${setting.grpColrCrtr === 'succ' ? 'checked' : ''}> 성공률</label>
                    </div>
                </div>
               <div class="form-group">
                   <label for="prgsRtRedThrsval" class="block text-sm font-medium text-gray-700 mb-1">진행률 문제점 임계값 (%)</label>
                   <input type="number" id="prgsRtRedThrsval" value="${setting.prgsRtRedThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
               </div>
               <div class="form-group">
                   <label for="prgsRtOrgThrsval" class="block text-sm font-medium text-gray-700 mb-1">진행률 경고 임계값 (%)</label>
                   <input type="number" id="prgsRtOrgThrsval" value="${setting.prgsRtOrgThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
               </div>
               <div class="form-group">
                   <label for="succRtRedThrsval" class="block text-sm font-medium text-gray-700 mb-1">성공률 문제점 임계값 (%)</label>
                   <input type="number" id="succRtRedThrsval" value="${setting.succRtRedThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
               </div>
               <div class="form-group">
                   <label for="succRtOrgThrsval" class="block text-sm font-medium text-gray-700 mb-1">성공률 경고 임계값 (%)</label>
                   <input type="number" id="succRtOrgThrsval" value="${setting.succRtOrgThrsval ?? ''}" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
               </div>
                <div class="form-group md:col-span-2">
                   <h4 class="text-md font-semibold text-gray-700 mt-2 border-t pt-4">그룹 아이콘 설정</h4>
                </div>
                ${createStatusSettingRow('grp_prgs', '그룹 진행률', setting.grpPrgsIconId, null, null, allIcons, true)}
                ${createStatusSettingRow('grp_sucs', '그룹 성공률', setting.grpSucsIconId, null, null, allIcons, true)}
            </div>
        </div>

        <!-- Display Settings -->
        <div class="mt-8 p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">상태별 표시 설정</h3>
            <div class="space-y-6">
                ${createStatusSettingRow('sucs', '성공', setting.sucsIconId, setting.sucsBgColr, setting.sucsTxtColr, allIcons)}
                ${createStatusSettingRow('fail', '실패', setting.failIconId, setting.failBgColr, setting.failTxtColr, allIcons)}
                ${createStatusSettingRow('prgs', '수집중', setting.prgsIconId, setting.prgsBgColr, setting.prgsTxtColr, allIcons)}
                ${createStatusSettingRow('nodt', '미수집', setting.nodtIconId, setting.nodtBgColr, setting.nodtTxtColr, allIcons)}
                ${createStatusSettingRow('schd', '예정', setting.schdIconId, setting.schdBgColr, setting.schdTxtColr, allIcons)}
            </div>
            
        </div>

    `;
    
    // The shared color palette is now used, so we don't create a separate one here.
}


// --- START: Color Palette Logic ---

let activeColorInput = null;

function setActiveColorInput(inputElement) {
    // Remove highlight from previous active input's container
    if (activeColorInput && activeColorInput.parentElement.parentElement) {
         activeColorInput.parentElement.parentElement.classList.remove('ring-2', 'ring-blue-500', 'rounded-md');
    }
    
    activeColorInput = inputElement;

    // Add highlight to new active input's container
    if (activeColorInput && activeColorInput.parentElement.parentElement) {
        activeColorInput.parentElement.parentElement.classList.add('ring-2', 'ring-blue-500', 'rounded-md');
    }
}

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
        sucs_icon_id: getIconId('sucs_icon_id'),
        sucs_bg_colr: document.getElementById('sucs_bg_colr').value,
        sucs_txt_colr: document.getElementById('sucs_txt_colr').value,
        fail_icon_id: getIconId('fail_icon_id'),
        fail_bg_colr: document.getElementById('fail_bg_colr').value,
        fail_txt_colr: document.getElementById('fail_txt_colr').value,
        prgs_icon_id: getIconId('prgs_icon_id'),
        prgs_bg_colr: document.getElementById('prgs_bg_colr').value,
        prgs_txt_colr: document.getElementById('prgs_txt_colr').value,
        nodt_icon_id: getIconId('nodt_icon_id'),
        nodt_bg_colr: document.getElementById('nodt_bg_colr').value,
        nodt_txt_colr: document.getElementById('nodt_txt_colr').value,
        schd_icon_id: getIconId('schd_icon_id'),
        schd_bg_colr: document.getElementById('schd_bg_colr').value,
        schd_txt_colr: document.getElementById('schd_txt_colr').value,
        grp_prgs_icon_id: getIconId('grp_prgs_icon_id'),
        grp_sucs_icon_id: getIconId('grp_sucs_icon_id')
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


/**
 * Creates a reusable HTML string for a status setting row with an icon dropdown.
 * @param {string} prefix - The prefix for element IDs (e.g., 'sucs', 'fail').
 * @param {string} label - The display label for the status.
 * @param {number|null} selectedIconId - The currently selected icon ID.
 * @param {string} bgColorValue - The current value for the background color.
 * @param {string} textColorValue - The current value for the text color.
 * @param {Array<Object>} allIcons - The list of all available icons.
 * @returns {string} - The HTML string for the row.
 */
function createStatusSettingRow(prefix, label, selectedIconId, bgColorValue, textColorValue, allIcons, isIconOnly = false) {
    const iconOptions = allIcons
        .filter(icon => icon.icon_dsp_yn === true)
        .map(icon => `<option value="${icon.icon_id}" ${icon.icon_id === selectedIconId ? 'selected' : ''}>${icon.icon_cd}</option>`)
        .join('');

    if (isIconOnly) {
        return `
            <div class="form-group">
                <label for="${prefix}_icon_id" class="block text-sm font-medium text-gray-700">${label}</label>
                <select id="${prefix}_icon_id" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option value="">선택 안 함</option>
                    ${iconOptions}
                </select>
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-md border bg-gray-50">
            <div class="font-medium text-gray-800">${label}</div>
            <div class="form-group">
                <label for="${prefix}_icon_id" class="block text-xs font-medium text-gray-600 mb-1">아이콘</label>
                <select id="${prefix}_icon_id" class="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                    <option value="">선택 안 함</option>
                    ${iconOptions}
                </select>
            </div>
            <div class="form-group">
                <label for="${prefix}_bg_colr" class="block text-xs font-medium text-gray-600 mb-1">배경색</label>
                <div class="color-input-wrapper">
                     <span class="color-preview"></span>
                    <input type="color" id="${prefix}_bg_colr" value="${bgColorValue || '#FFFFFF'}" class="w-full h-10 p-1 border border-gray-300 rounded-md shadow-sm">
                </div>
            </div>
            <div class="form-group">
                <label for="${prefix}_txt_colr" class="block text-xs font-medium text-gray-600 mb-1">글자색</label>
                 <div class="color-input-wrapper">
                    <span class="color-preview"></span>
                    <input type="color" id="${prefix}_txt_colr" value="${textColorValue || '#000000'}" class="w-full h-10 p-1 border border-gray-300 rounded-md shadow-sm">
                </div>
            </div>
        </div>
    `;
}


// --- START: Existing Page Logic ---

async function fetchUsersAndMenus(searchTerm = '') {
    try {
        let url = `/api/mngr_sett/users?_=${new Date().getTime()}`;
        if (searchTerm) {
            url += `&search_term=${encodeURIComponent(searchTerm)}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('사용자 정보를 가져오는데 실패했습니다.');
        return await response.json();
    } catch (error) {
        showToast(error.message, 'error');
        return { users: [], menus: [] };
    }
}

function renderUserManagementTable(users, menus) {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const tableBody = container.querySelector('#userTableBody');
    if (!tableBody) return;

    // 'admin' 권한을 'mngr_sett'으로 변경하고, 메뉴 목록에 포함시켜 일관성 있게 처리
    const allMenus = menus.map(m => m.menu_id === 'admin' ? { ...m, menu_id: 'mngr_sett', menu_nm: '관리자 설정' } : m);
    
    // 메뉴를 menu_ord 기준으로 정렬
    allMenus.sort((a, b) => a.menu_ord - b.menu_ord);

    // 헤더 생성
    let menuHeaderHtml = allMenus.map(menu => `<th>${menu.menu_nm}</th>`).join('');
    const headerRow = `<tr><th>사용자 ID</th><th>작업</th><th>상태</th><th>가입일</th>${menuHeaderHtml}</tr>`;
    tableBody.parentElement.querySelector('thead').innerHTML = headerRow;

    // 테이블 바디 생성
    tableBody.innerHTML = '';
    users.sort((a, b) => {
        // 1. is_admin 값으로 내림차순 정렬 (true가 먼저 오도록)
        if (a.is_admin !== b.is_admin) {
            return a.is_admin ? -1 : 1;
        }
        // 2. acc_cre_dt 값으로 내림차순 정렬 (최신 날짜가 먼저 오도록)
        const dateA = a.acc_cre_dt ? new Date(a.acc_cre_dt) : new Date(0);
        const dateB = b.acc_cre_dt ? new Date(b.acc_cre_dt) : new Date(0);
        return dateB - dateA;
    });
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const createdAt = user.acc_cre_dt ? new Date(user.acc_cre_dt).toLocaleDateString('ko-KR') : 'N/A';

        // 권한 체크박스 HTML 생성
        let permissionsHtml = allMenus.map(menu => {
            const isChecked = user.permissions.includes(menu.menu_id) ? 'checked' : '';
            return `<td><input type="checkbox" class="permission-checkbox" data-user-id="${user.user_id}" data-menu-id="${menu.menu_id}" ${isChecked}></td>`;
        }).join('');

        // 작업 버튼 HTML 생성
        let actionHtml = '';
        if (user.acc_sts === 'PENDING' || user.acc_sts === 'PENDING_RESET') {
            actionHtml = `<button class="approve-btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs" data-user-id="${user.user_id}">승인</button> <button class="reject-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs" data-user-id="${user.user_id}">거절</button>`;
        } else {
            // 개별 저장 버튼 제거
            actionHtml = `<button class="reset-password-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded text-xs" data-user-id="${user.user_id}">비밀번호 초기화</button> <button class="delete-user-btn bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded text-xs" data-user-id="${user.user_id}">삭제</button>`;
        }

        row.innerHTML = `<td>${user.user_id}</td><td>${actionHtml}</td><td>${user.acc_sts}</td><td>${createdAt}</td>${permissionsHtml}`;
        tableBody.appendChild(row);
    });

    addEventListenersToButtons();
}

function addEventListenersToButtons() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    container.querySelectorAll('.approve-btn').forEach(b => b.addEventListener('click', e => approveUser(e.target.dataset.userId)));
    container.querySelectorAll('.reject-btn').forEach(b => b.addEventListener('click', e => { if (confirm(`'${e.target.dataset.userId}' 사용자의 가입 신청을 거절하시겠습니까?`)) rejectUser(e.target.dataset.userId); }));
    // container.querySelectorAll('.save-permissions-btn').forEach(b => b.addEventListener('click', e => saveUserPermissions(e.target.dataset.userId))); // 개별 저장 버튼 리스너 제거
    container.querySelectorAll('.reset-password-btn').forEach(b => b.addEventListener('click', e => { if (confirm(`'${e.target.dataset.userId}' 사용자의 비밀번호를 ID와 동일하게 초기화하시겠습니까?`)) resetPassword(e.target.dataset.userId); }));
    container.querySelectorAll('.delete-user-btn').forEach(b => b.addEventListener('click', e => { if (confirm(`'${e.target.dataset.userId}' 사용자를 정말로 삭제하시겠습니까?`)) deleteUser(e.target.dataset.userId); }));
    
    // 실시간 검색 이벤트 리스너 (디바운스 적용)
    const searchInput = container.querySelector('#userSearchInput');
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                refreshUserManagementTable();
            }, 300); // 300ms 후에 검색 실행
        });
    }
}

async function approveUser(userId) {
    try {
        const response = await fetch('/api/mngr_sett/users/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast(result.message, 'success');
        refreshUserManagementTable();
    } catch (error) { showToast(`승인 실패: ${error.message}`, 'error'); }
}

async function rejectUser(userId) {
    try {
        const response = await fetch('/api/mngr_sett/users/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast(result.message, 'success');
        refreshUserManagementTable();
    } catch (error) { showToast(`거절 실패: ${error.message}`, 'error'); }
}

async function deleteUser(userId) {
    try {
        const response = await fetch('/api/mngr_sett/users/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast(result.message, 'success');
        refreshUserManagementTable();
    } catch (error) { showToast(`삭제 실패: ${error.message}`, 'error'); }
}

async function resetPassword(userId) {
    try {
        const response = await fetch('/api/mngr_sett/users/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast(result.message, 'success');
        refreshUserManagementTable();
    } catch (error) { showToast(`비밀번호 초기화 실패: ${error.message}`, 'error'); }
}

async function saveUserPermissions(userId) {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const permissionCheckboxes = container.querySelectorAll(`.permission-checkbox[data-user-id="${userId}"]`);
    let selectedMenuIds = Array.from(permissionCheckboxes).filter(cb => cb.checked).map(cb => cb.dataset.menuId);
    
    try {
        const response = await fetch('/api/mngr_sett/users/permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, menu_ids: selectedMenuIds }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast(result.message, 'success');
        refreshUserManagementTable();
    } catch (error) { showToast(`권한 저장 실패: ${error.message}`, 'error'); }
}

async function saveAllUserPermissions() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;
    const userRows = container.querySelectorAll('#userTableBody tr');
    const permissionsData = [];

    userRows.forEach(row => {
        const userId = row.querySelector('.permission-checkbox')?.dataset.userId;
        if (userId) {
            const permissionCheckboxes = row.querySelectorAll(`.permission-checkbox[data-user-id="${userId}"]`);
            const selectedMenuIds = Array.from(permissionCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.menuId);
            permissionsData.push({ user_id: userId, menu_ids: selectedMenuIds });
        }
    });

    if (permissionsData.length === 0) {
        showToast('저장할 데이터가 없습니다.', 'info');
        return;
    }

    try {
        const response = await fetch('/api/mngr_sett/users/permissions/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions: permissionsData })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showToast(result.message, 'success');
        refreshUserManagementTable();
    } catch (error) {
        showToast(`전체 권한 저장 실패: ${error.message}`, 'error');
    }
}

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
    const { users, menus } = await fetchUsersAndMenus(searchTerm);
    renderUserManagementTable(users, menus);
}

async function loadPageData() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) {
        return;
    }
    const loadingOverlay = container.querySelector('#adminLoadingOverlay');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    try {
        const [adminSettings, icons, userData] = await Promise.all([
            getAdminSettings(),
            getIcons(),
            fetchUsersAndMenus()
        ]);

        renderSettingsTable(adminSettings, icons);
        renderIconTable(icons);
        populateIconSelects(icons);
        window.allIconsData = icons;
        renderUserManagementTable(userData.users, userData.menus);

        showToast('관리자 설정 페이지 로드 완료.', 'success');
    } catch (error) {
        showToast('페이지 초기화 중 오류 발생: ' + error.message, 'error');
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

// --- START: Data Access Permission Tab Logic ---

// DOM Elements for Data Access Permission Tab
const dataAccessElements = {
    userSearchInput: null,
    userSearchBtn: null,
    userTableBody: null,
    modal: null,
    modalUserId: null,
    closeModalBtn: null,
    unassignedJobsList: null,
    assignedJobsList: null,
    addJobBtn: null,
    addAllJobsBtn: null,
    removeJobBtn: null,
    removeAllJobsBtn: null,
    saveChangesBtn: null,
    currentUserId: null, // Store the user ID for whom the modal is open
    unassignedJobSearchInput: null
};

/**
 * Initializes the data access permission tab functionality.
 */
function initDataAccessPermissionTab() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) return;

    // 1. Assign DOM elements
    dataAccessElements.userSearchInput = container.querySelector('#dataUserSearchInput');
    dataAccessElements.userSearchBtn = container.querySelector('#dataUserSearchBtn');
    dataAccessElements.userTableBody = container.querySelector('#dataPermissionUserTableBody');
    // Modal elements are outside the main #mngr_sett_page container, so we query the document
    dataAccessElements.modal = document.querySelector('#dataPermissionModal');
    dataAccessElements.modalUserId = document.querySelector('#dataPermissionModalTitle');
    dataAccessElements.closeModalBtn = document.querySelector('#closePermissionModal');
    dataAccessElements.unassignedJobsList = document.querySelector('#unassignedJobs');
    dataAccessElements.assignedJobsList = document.querySelector('#assignedJobs');
    dataAccessElements.addJobBtn = document.querySelector('#addJobPermission');
    dataAccessElements.addAllJobsBtn = document.querySelector('#addAllJobPermissions');
    dataAccessElements.removeJobBtn = document.querySelector('#removeJobPermission');
    dataAccessElements.removeAllJobsBtn = document.querySelector('#removeAllJobPermissions');
    dataAccessElements.saveChangesBtn = document.querySelector('#savePermissionChangesBtn');
    dataAccessElements.unassignedJobSearchInput = document.querySelector('#unassignedJobSearchInput');

    // 2. Add event listeners
    const tabButton = container.querySelector('button[data-tab="dataAccessPermission"]');
    if (tabButton) {
        tabButton.addEventListener('click', () => loadDataAccessUsers());
    }

    if (dataAccessElements.userSearchBtn) {
        dataAccessElements.userSearchBtn.addEventListener('click', () => {
            loadDataAccessUsers(dataAccessElements.userSearchInput.value);
        });
    }

    if (dataAccessElements.userSearchInput) {
        dataAccessElements.userSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadDataAccessUsers(dataAccessElements.userSearchInput.value);
            }
        });
    }

    if (dataAccessElements.closeModalBtn) {
        dataAccessElements.closeModalBtn.addEventListener('click', () => dataAccessElements.modal.style.display = 'none');
    }
    
    window.addEventListener('click', (event) => {
        if (event.target == dataAccessElements.modal) {
            dataAccessElements.modal.style.display = 'none';
        }
    });

    if (dataAccessElements.saveChangesBtn) {
        dataAccessElements.saveChangesBtn.addEventListener('click', saveDataAccessPermissions);
    }
    
    // Event listeners for permission controls
    if (dataAccessElements.addJobBtn) dataAccessElements.addJobBtn.addEventListener('click', () => moveSelectedItems(dataAccessElements.unassignedJobsList, dataAccessElements.assignedJobsList));
    if (dataAccessElements.addAllJobsBtn) dataAccessElements.addAllJobsBtn.addEventListener('click', () => moveAllItems(dataAccessElements.unassignedJobsList, dataAccessElements.assignedJobsList));
    if (dataAccessElements.removeJobBtn) dataAccessElements.removeJobBtn.addEventListener('click', () => moveSelectedItems(dataAccessElements.assignedJobsList, dataAccessElements.unassignedJobsList));
    if (dataAccessElements.removeAllJobsBtn) dataAccessElements.removeAllJobsBtn.addEventListener('click', () => moveAllItems(dataAccessElements.assignedJobsList, dataAccessElements.unassignedJobsList));

    // Event delegation for list item selection (with multi-select support)
    let lastSelectedItem = null;
    [dataAccessElements.unassignedJobsList, dataAccessElements.assignedJobsList].forEach(list => {
        if(list) {
            list.addEventListener('click', (e) => {
                if (e.target.tagName !== 'LI') return;

                const items = Array.from(list.children);
                const currentItem = e.target;

                if (e.shiftKey && lastSelectedItem) {
                    const start = items.indexOf(lastSelectedItem);
                    const end = items.indexOf(currentItem);
                    
                    items.forEach(item => item.classList.remove('selected')); // Clear previous selections in the list
                    
                    const range = (start < end) ? items.slice(start, end + 1) : items.slice(end, start + 1);
                    range.forEach(item => item.classList.add('selected'));

                } else if (e.ctrlKey || e.metaKey) {
                    currentItem.classList.toggle('selected');
                    lastSelectedItem = currentItem;
                } else {
                    items.forEach(item => item.classList.remove('selected'));
                    currentItem.classList.add('selected');
                    lastSelectedItem = currentItem;
                }
            });
        }
    });

    if (dataAccessElements.unassignedJobSearchInput) {
        dataAccessElements.unassignedJobSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const items = dataAccessElements.unassignedJobsList.querySelectorAll('li');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}


/**
 * Fetches users with their data access permissions.
 * @param {string} searchTerm - The term to search for users.
 */
async function loadDataAccessUsers(searchTerm = '') {
    try {
        let url = `/api/mngr_sett/data_permission/users?_=${new Date().getTime()}`;
        if (searchTerm) {
            url += `&search_term=${encodeURIComponent(searchTerm)}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('데이터 접근 권한 사용자 정보를 가져오는데 실패했습니다.');
        const users = await response.json();
        renderDataAccessUserTable(users);
    } catch (error) {
        showToast(error.message, 'error');
        if (dataAccessElements.userTableBody) dataAccessElements.userTableBody.innerHTML = `<tr><td colspan="4" class="text-center">${error.message}</td></tr>`;
    }
}

/**
 * Renders the user table for data access permissions.
 * @param {Array<Object>} users - The list of users.
 */
function renderDataAccessUserTable(users) {
    const tableBody = dataAccessElements.userTableBody;
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">사용자가 없습니다.</td></tr>';
        return;
    }
    
    // PENDING 상태 사용자를 제외하고 가입일 최신순으로 정렬
    users
        .filter(user => user.acc_sts !== 'PENDING')
        .sort((a, b) => new Date(b.acc_cre_dt) - new Date(a.acc_cre_dt))
        .forEach(user => {
            const row = tableBody.insertRow();
            const allowedJobs = user.job_ids && user.job_ids.length > 0 ? user.job_ids.join(', ') : '없음';
            row.innerHTML = `
                <td>${user.user_id}</td>
                <td>${user.acc_sts}</td>
                <td class="allowed-jobs">${allowedJobs}</td>
                <td><button class="manage-permission-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded text-xs" data-user-id="${user.user_id}">권한 관리</button></td>
            `;
        });
    
    // Add event listeners to the new buttons
    tableBody.querySelectorAll('.manage-permission-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openPermissionModal(e.target.dataset.userId));
    });
}


/**
 * Opens the permission management modal for a given user.
 * @param {string} userId - The ID of the user to manage permissions for.
 */
async function openPermissionModal(userId) {
    dataAccessElements.currentUserId = userId;
    
    if (!dataAccessElements.modalUserId) {
        return;
    }
    dataAccessElements.modalUserId.textContent = userId;

    try {
        const response = await fetch(`/api/mngr_sett/data_permission/jobs?user_id=${userId}&_=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Job ID 및 사용자 권한 정보를 가져오는데 실패했습니다.');
        
        const data = await response.json();

        populatePermissionLists(data.all_jobs, data.allowed_job_ids);
        
        if (!dataAccessElements.modal) {
            return;
        }
        dataAccessElements.modal.style.display = 'block';

    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Populates the assigned and unassigned job lists in the modal.
 * @param {Array<Object>} allJobs - All available Job objects ({cd, cd_nm}).
 * @param {Array<string>} allowedJobIds - Job IDs currently allowed for the user.
 */
function populatePermissionLists(allJobs, allowedJobIds = []) {
    const unassignedList = dataAccessElements.unassignedJobsList;
    const assignedList = dataAccessElements.assignedJobsList;
    unassignedList.innerHTML = '';
    assignedList.innerHTML = '';

    const allowedSet = new Set(allowedJobIds);
    const allJobsMap = new Map(allJobs.map(job => [job.cd, job]));

    allJobs.forEach(job => {
        // 100단위 코드는 목록에 표시하지 않음
        if (job.cd.endsWith('00')) return;

        const li = document.createElement('li');
        li.textContent = `${job.cd}: ${job.cd_nm}`;
        li.dataset.id = job.cd;
        if (allowedSet.has(job.cd)) {
            assignedList.appendChild(li);
        } else {
            unassignedList.appendChild(li);
        }
    });

    // 100단위 코드 자동 선택/해제 로직 제거
    // const findRelatedItems = ...
    // const handleMasterItemClick = ...
    // unassignedList.addEventListener('click', handleMasterItemClick);
    // assignedList.addEventListener('click', handleMasterItemClick);
}

/**
 * Moves selected items from a source list to a destination list.
 * @param {HTMLElement} fromList - The source list element.
 * @param {HTMLElement} toList - The destination list element.
 */
function moveSelectedItems(fromList, toList) {
    const selectedItems = Array.from(fromList.querySelectorAll('li.selected'));
    selectedItems.forEach(item => {
        item.classList.remove('selected');
        toList.appendChild(item);
    });
}

/**
 * Moves all items from a source list to a destination list.
 * @param {HTMLElement} fromList - The source list element.
 * @param {HTMLElement} toList - The destination list element.
 */
function moveAllItems(fromList, toList) {
    const allItems = Array.from(fromList.querySelectorAll('li'));
    allItems.forEach(item => {
        item.classList.remove('selected');
        toList.appendChild(item);
    });
}

/**
 * Saves the updated data access permissions for the current user.
 */
async function saveDataAccessPermissions() {
    const userId = dataAccessElements.currentUserId;
    if (!userId) return;

    const allowedJobIds = Array.from(dataAccessElements.assignedJobsList.querySelectorAll('li')).map(li => li.dataset.id);

    try {
        const response = await fetch('/api/mngr_sett/data_permission/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, job_ids: allowedJobIds })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || '권한 저장에 실패했습니다.');
        
        showToast('데이터 접근 권한이 성공적으로 저장되었습니다.', 'success');
        dataAccessElements.modal.style.display = 'none';
        
        // Refresh the user table to show the updated permissions
        loadDataAccessUsers(dataAccessElements.userSearchInput.value);

    } catch (error) {
        console.error(error);
        showToast(`저장 실패: ${error.message}`, 'error');
    }
}

// --- END: Data Access Permission Tab Logic ---

export async function init() {
    const container = document.getElementById('mngr_sett_page');
    if (!container) {
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
    initDataAccessPermissionTab(); // Initialize the new tab logic

    const addRowBtn = container.querySelector('#addRowBtn');
    if (addRowBtn) addRowBtn.addEventListener('click', addNewSettingRow);
    
    const saveAllPermissionsBtn = container.querySelector('#saveAllPermissionsBtn');
    if (saveAllPermissionsBtn) saveAllPermissionsBtn.addEventListener('click', saveAllUserPermissions);

    const userManagementTab = container.querySelector('button[data-tab="userManagement"]');
    if (userManagementTab) {
        userManagementTab.addEventListener('click', refreshUserManagementTable);
    }

    const settingsTab = container.querySelector('button[data-tab="basicSettings"]'); // Changed from "settings" to "basicSettings" to match HTML
    if (settingsTab) {
        // The loadPageData function is called at the end, so no need for a click listener here
    }

    initStatisticsTab();

    const scheduleSettingsTab = container.querySelector('button[data-tab="scheduleSettings"]');
    if (scheduleSettingsTab) {
        scheduleSettingsTab.addEventListener('click', loadScheduleSettings);
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


    // 초기에 첫 번째 탭(기본 설정)을 활성화하고 데이터를 로드합니다.
    const firstTab = container.querySelector('.tab-button[data-tab="basicSettings"]');
    if (firstTab) {
        // The 'active' class is already on the first tab by default in HTML.
        // No need to simulate a click, just load the data.
    }
    loadPageData();
}

// --- END: Existing Page Logic ---
