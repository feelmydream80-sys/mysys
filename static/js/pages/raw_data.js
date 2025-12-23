/**
 * @file raw_data.js
 * @description Raw Data 페이지의 메인 스크립트 파일
 */

import { fetchJobIds, fetchAllData, fetchErrorCodeMap } from '../modules/rawData/api.js';
import { RawDataUI } from '../modules/rawData/ui.js';
import { setupEventListeners } from '../modules/rawData/events.js';
import { filterData } from '../modules/rawData/utils.js';
import { initCollapsibleFeatures } from '../modules/ui_components/collapsible.js';
import { updateDateRangeDisplay } from '../modules/common/ui.js';
import { fetchMinMaxDates } from '../modules/common/api/dashboard.js';
import { setDataFlowStatus } from '../modules/common/api/client.js';
import { showMessage } from '../modules/common/utils.js';

/**
 * 애플리케이션 상태를 관리하는 객체
 */
const state = {
    allData: [],
    errorCodeMap: {},
    searchTerm: '',
};

let ui;
let userAllowedJobIds = []; // 사용자의 허용된 Job IDs 캐시

/**
 * UI를 다시 렌더링하는 함수
 */
async function rerender() {
    const filtered = filterData(state);
    ui.filteredData = filtered; // 필터링된 전체 데이터를 UI 객체에 할당
    ui.initializePagination(state, filtered);
}

/**
 * 페이지 초기화 및 데이터 로드 함수
 */
export async function init() {
    setDataFlowStatus({
        minMaxDatesFetch_rawData: { apiCallAttempted: false, apiCallSuccess: false, apiResponseCount: 0, error: null },
        fetchAllData_rawData: { apiCallAttempted: false, apiCallSuccess: false, apiResponseCount: 0, error: null }
    });

    initCollapsibleFeatures();
    loadSheetJS();

    ui = new RawDataUI();

    // 1. 실제 데이터 기간을 가져와서 화면과 날짜 입력 필드에 설정
    const dateRange = await fetchMinMaxDates('rawData');
    if (dateRange && dateRange.min_date && dateRange.max_date) {
        const maxDate = new Date(dateRange.max_date);
        const oneYearAgo = new Date(maxDate);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const minDate = new Date(dateRange.min_date);

        const startDate = minDate > oneYearAgo ? dateRange.min_date : oneYearAgo.toISOString().split('T')[0];
        const endDate = dateRange.max_date;

        document.getElementById('selectedDateDisplay').textContent = `${startDate} ~ ${endDate}`;
        document.getElementById('start-date').value = startDate;
        document.getElementById('end-date').value = endDate;
    }

    const [jobList, errorCodeMap] = await Promise.all([
        fetchJobIds(),
        fetchErrorCodeMap()
    ]);

    state.errorCodeMap = errorCodeMap;
    // 사용자의 허용된 Job IDs 캐시 (job_id 필드만 추출)
    userAllowedJobIds = jobList.map(item => item.job_id);
    ui.populateJobIdSelect(jobList);
    
    // 이벤트 리스너 설정
    const reloadData = async () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        const jobIdSelect = document.getElementById('job-id-select');
        const selectedJobId = jobIdSelect ? jobIdSelect.value : null;

        let jobIds = null;
        if (selectedJobId && selectedJobId !== '') {
            if (selectedJobId === 'all') {
                // "전체" 선택 시 사용자의 모든 허용된 Job IDs 전달
                jobIds = userAllowedJobIds.length > 0 ? userAllowedJobIds : null;
            } else {
                jobIds = [selectedJobId];
            }
        }

        state.allData = await fetchAllData(startDate, endDate, jobIds);
        rerender();
    };
    setupEventListeners(state, rerender, reloadData);
    
    // 2. 설정된 날짜 기준으로 초기 데이터 로드 (전체 허용 데이터)
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    // 초기 로드 시 사용자의 모든 허용된 Job 데이터 로드
    const initialJobIds = userAllowedJobIds.length > 0 ? userAllowedJobIds : null;
    state.allData = await fetchAllData(startDate, endDate, initialJobIds);
    
    // 초기 렌더링
    rerender();

    // 엑셀 템플릿 다운로드 버튼 이벤트 리스너
    const downloadExcelTemplateBtn = document.getElementById('downloadExcelTemplateBtn');
    if (downloadExcelTemplateBtn) {
        downloadExcelTemplateBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/excel_template/download');
                if (!response.ok) {
                    if (response.status === 404) {
                        showMessage('다운로드할 엑셀 템플릿이 없습니다.', 'warning');
                    } else {
                        throw new Error('다운로드에 실패했습니다.');
                    }
                    return;
                }

                // 파일 다운로드 처리
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'excel_template.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                showMessage('수집 요청서 양식 다운로드가 시작되었습니다.', 'success');
            } catch (error) {
                showMessage(error.message, 'error');
            }
        });
    }

    // 원천 데이터 엑셀 다운로드 버튼 이벤트 리스너
    const downloadRawDataBtn = document.getElementById('downloadRawDataBtn');
    if (downloadRawDataBtn) {
        downloadRawDataBtn.addEventListener('click', () => {
            // 기존 엑셀 다운로드 로직 사용
            const excelBtn = document.getElementById('excel-download-btn');
            if (excelBtn) {
                excelBtn.click();
            } else {
                showMessage('엑셀 다운로드 기능을 사용할 수 없습니다.', 'error');
            }
        });
    }

}

/**
 * SheetJS 라이브러리를 동적으로 로드합니다.
 * (폐쇄망 환경을 위해 비활성화)
 */
function loadSheetJS() {
    // if (!window.XLSX) {
    //     const script = document.createElement('script');
    //     script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    //     document.head.appendChild(script);
    // }
}

// DOMContentLoaded 이벤트가 발생하면 초기화 함수를 실행합니다.
document.addEventListener('DOMContentLoaded', init);
