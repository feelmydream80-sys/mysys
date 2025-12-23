import { debounce, showMessage } from '../modules/common/utils.js';
import { drawContinuousHeatmap, drawHeatmapIfNeeded } from '../modules/data_analysis/heatmap.js';
import { initJobInfo } from '../modules/dashboard/jobInfo.js';
import { initCollapsibleFeatures, initSingleCollapsibleCard } from '../modules/ui_components/collapsible.js';
import { initPagination } from '../modules/ui_components/pagination.js';
import { setDefaultDates } from '../modules/common/dateUtils.js';

export function init() {
    const jandiPageContainer = document.getElementById('jandi-page-container');
    const isAdmin = jandiPageContainer.dataset.isAdmin === 'True';
    initCollapsibleFeatures();
    setDefaultDates();
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const allDataCheckbox = document.getElementById('allDataCheckbox');
    const filterButton = document.getElementById('filter-button');
    const heatmapContainer = document.getElementById('heatmap-container');
    const loadingIndicator = document.getElementById('loading');
    const jandiSearchInput = document.getElementById('jandiSearch');
    const jandiPageSizeSelect = document.getElementById('jandiPageSize');
    const jandiPagination = document.getElementById('jandiPagination');
    const sortAscButton = document.getElementById('sortAsc');
    const sortDescButton = document.getElementById('sortDesc');
    const jobInfoSearchInput = document.getElementById('jobInfoSearch');
    const jobInfoPageSizeSelect = document.getElementById('jobInfoPageSize');

    let jobMstInfoMap = {};
    let allJandiData = {};
    let allJobInfoData = []; // Job Info 테이블의 전체 데이터를 저장할 변수
    let adminSettingsMap = {};
    let currentPage = 1;
    let pageSize = parseInt(jandiPageSizeSelect.value, 10);
    let searchTerm = '';
    let sortOrder = 'asc';


    async function fetchAllData() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const allData = allDataCheckbox.checked;

        if (!allData && (!startDate || !endDate)) {
            alert('전체 데이터 조회가 아닐 경우, 시작일과 종료일을 선택해주세요.');
            return;
        }

        loadingIndicator.style.display = 'block';
        heatmapContainer.innerHTML = '';

        try {
            // 관리자 설정 데이터 먼저 가져오기
            if (isAdmin) {
                const adminSettingsResponse = await fetch('/api/mngr_sett/settings/all');
                if (!adminSettingsResponse.ok) throw new Error('관리자 설정 조회 실패');
                const adminSettingsResult = await adminSettingsResponse.json();
                adminSettingsMap = adminSettingsResult.reduce((acc, setting) => {
                    acc[setting.cd] = setting;
                    return acc;
                }, {});
            }

            // Fetch all jobs without date filters to ensure all heatmaps are rendered
            const jobListResponse = await fetch(`/api/job-list?length=-1&start_date=${startDate}&end_date=${endDate}&allData=${allData}`);
            if (!jobListResponse.ok) throw new Error('Job 목록 조회 실패');
            const jobListResult = await jobListResponse.json();
            const allJobs = jobListResult.data;

            jobMstInfoMap = {};
            allJobs.forEach(job => {
                jobMstInfoMap[job.job_id] = job;
            });

            // Fetch Jandi data for each job individually
            allJandiData = {};
            for (const job of allJobs) {
                const job_id = job.job_id;
                const jandiDataResponse = await fetch(`/api/jandi-data?job_id=${job_id}&start_date=${startDate}&end_date=${endDate}&allData=${allData}`);
                if (!jandiDataResponse.ok) {
                    console.error(`Jandi 데이터 조회 실패 for job_id: ${job_id}`);
                    continue; // Skip to the next job if an error occurs
                }
                const jandiDataResult = await jandiDataResponse.json();
                
                const jobDataMap = new Map();
                jandiDataResult.forEach(item => {
                    if (item.date) { // 'log_dt'를 'date'로 변경
                        try {
                            // Ensure the dateKey is in "YYYY-MM-DD" format.
                            const dateKey = new Date(item.date).toISOString().substring(0, 10);
                            jobDataMap.set(dateKey, item.count); // 'execution_count'를 'count'로 변경
                        } catch (e) {
                            console.error(`Invalid date value for date: ${item.date}`, e);
                        }
                    }
                });
                allJandiData[job_id] = jobDataMap;
            }

            allJobInfoData = allJobs.map(job => ({
                job_id: job.job_id,
                cd_nm: job.cd_nm,
                cron: job.cron, // Use 'cron' from the new DAO response
                description: job.description // Use 'description' from the new DAO response
            }));
            initJobInfo(allJobInfoData, 5);

            renderPagedHeatmaps(true);

        } catch (error) {
            console.error('Error:', error);
            heatmapContainer.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    function renderPagedHeatmaps(isNewSearch = false) {
        heatmapContainer.innerHTML = '';

        let jobIds = Object.keys(jobMstInfoMap);
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            jobIds = jobIds.filter(id => 
                id.toLowerCase().includes(lowerCaseSearchTerm) || 
                (jobMstInfoMap[id].cd_nm && jobMstInfoMap[id].cd_nm.toLowerCase().includes(lowerCaseSearchTerm))
            );
        }
        jobIds.sort((a, b) => sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a));

        const totalItems = jobIds.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pagedJobIds = jobIds.slice(startIndex, endIndex);

        const renderCallback = (pagedIds) => {
            heatmapContainer.innerHTML = '';
            pagedIds.forEach(jobId => {
                renderJobHeatmap(jobId);
            });
        };

        initPagination({
            fullData: jobIds,
            pageSize: pageSize,
            renderTableCallback: renderCallback,
            paginationId: 'jandiPagination',
            pageSizeId: 'jandiPageSize',
            searchId: 'jandiSearch',
        });
    }
    
    function renderJobHeatmap(jobId) {
        const jobInfo = jobMstInfoMap[jobId];
        const jobName = jobInfo?.cd_nm || 'N/A';
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        const card = document.createElement('div');
        card.className = 'jandi-card collapsible-card';
        card.id = `jandi-card-${jobId}`;
        card.style.marginTop = '10px';
        
        card.innerHTML = `
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <h3 class="text-lg font-semibold mb-0">${jobId} (${jobName})</h3>
                <span class="transform transition-transform duration-300">▼</span>
            </div>
            <div class="card-content">
                <div class="graph" id="graph-${jobId}" style="min-height: 150px;"></div>
            </div>
        `;
        heatmapContainer.appendChild(card);
        initSingleCollapsibleCard(card);

        const graphDiv = card.querySelector('.graph');
        const dataMap = allJandiData[jobId] || new Map();
        
        const adminSetting = adminSettingsMap[jobId];
        const jandiColorMin = adminSetting?.jandi_color_min;
        const jandiColorMax = adminSetting?.jandi_color_max;

        drawContinuousHeatmap(graphDiv, dataMap, startDate, endDate, jandiColorMin, jandiColorMax);
    }


    filterButton.addEventListener('click', () => {
        currentPage = 1;
        fetchAllData();
    });
    
    jandiSearchInput.addEventListener('input', debounce(() => {
        searchTerm = jandiSearchInput.value;
        currentPage = 1;
        renderPagedHeatmaps(true);
    }, 300));

    jandiPageSizeSelect.addEventListener('change', () => {
        pageSize = parseInt(jandiPageSizeSelect.value, 10);
        currentPage = 1;
        renderPagedHeatmaps(true);
    });

    sortAscButton.addEventListener('click', () => {
        sortOrder = 'asc';
        currentPage = 1;
        renderPagedHeatmaps();
    });

    sortDescButton.addEventListener('click', () => {
        sortOrder = 'desc';
        currentPage = 1;
        renderPagedHeatmaps();
    });
    
    // jobInfoSearchInput 이벤트 리스너는 이제 jobInfo.js 모듈에서 중앙 관리됩니다.

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
            showMessage('잔디 페이지에서는 원천 데이터 다운로드가 지원되지 않습니다.', 'info');
        });
    }

    fetchAllData();
}
