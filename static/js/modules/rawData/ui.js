/**
 * @module ui
 * @description UI 렌더링 및 조작을 담당하는 클래스를 제공하는 모듈
 */

import { formatNumber, formatNumberAbbreviated, getStatusClass } from './utils.js';
import { initPagination, updatePaginationData } from '../ui_components/pagination.js';

/**
 * @class RawDataUI
 * @description Raw Data 페이지의 UI를 관리하는 클래스
 */
export class RawDataUI {
    /**
     * @param {object} options - UI 옵션
     * @param {Function} options.onPageChange - 페이지 변경 시 호출될 콜백 함수
     */
    constructor() {
        this.elements = {
            jobSelect: document.getElementById('job-id-select'),
            startDateInput: document.getElementById('start-date'),
            endDateInput: document.getElementById('end-date'),
            selectedDateDisplay: document.getElementById('selectedDateDisplay'),
            tbody: document.getElementById('detail-table-body'),
            totalSuccessRate: document.getElementById('total-success-rate'),
            statusSummary: document.getElementById('status-summary'),
            pagination: document.getElementById('pagination'),
            pageSizeSelect: document.getElementById('pageSizeSelect'),
            searchInput: document.getElementById('table-search'),
            totalCount: document.getElementById('raw-data-total-count'),
        };
        this.filteredData = [];
    }

    /**
     * Job ID 선택 옵션을 채웁니다.
     * @param {Array<Object>} jobList - Job ID 목록
     */
    populateJobIdSelect(jobList) {
        if (!this.elements.jobSelect) return;
        this.elements.jobSelect.innerHTML = ''; // Clear existing options

        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = '전체';
        this.elements.jobSelect.appendChild(allOpt);

        jobList.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job.job_id;
            opt.textContent = job.job_id;
            this.elements.jobSelect.appendChild(opt);
        });
    }

    /**
     * 테이블과 관련 UI 요소들을 렌더링합니다.
     * @param {object} state - 애플리케이션 상태
     * @param {Array<object>} filteredData - 필터링된 데이터
     */
    render(state, pageData) {
        this.updateDateDisplay();
        this.renderTable(state, pageData);
        this.renderStatusSummary(state);
    }

    /**
     * 선택된 날짜 범위를 화면에 표시합니다.
     */
    updateDateDisplay() {
        const start = this.elements.startDateInput.value;
        const end = this.elements.endDateInput.value;
        this.elements.selectedDateDisplay.textContent = `${start} ~ ${end}`;
    }

    /**
     * 상세 데이터 테이블을 렌더링합니다.
     * @param {object} state - 애플리케이션 상태
     * @param {Array<object>} pageData - 현재 페이지에 해당하는 데이터
     */
    renderTable(state, pageData) {
        this.elements.tbody.innerHTML = '';
        const { errorCodeMap } = state;

        let totalSuccess = 0, totalCount = 0;

        this.filteredData.forEach(row => {
            let total = 0, fail = 0, success = 0;
            const match = row.rqs_info && String(row.rqs_info).match(/(총 요청 수|총 요청 수): (\d+), (실패|실패): (\d+)/);
            if (match) {
                total = parseInt(match[2], 10);
                fail = parseInt(match[4], 10);
                success = total - fail;
            }
            totalSuccess += success;
            totalCount += total;
        });

        pageData.forEach(row => {
            let total = 0, fail = 0, success = 0, percent = 0;
            const match = row.rqs_info && String(row.rqs_info).match(/(총 요청 수|총 요청 수): (\d+), (실패|실패): (\d+)/);
            if (match) {
                total = parseInt(match[2], 10);
                fail = parseInt(match[4], 10);
                success = total - fail;
                percent = total > 0 ? Math.round((success / total) * 100) : 0;
            }

            const statusLabel = errorCodeMap[row.status] || row.status || '';
            const formattedKstStart = row.start_dt || '';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 align-top">${formattedKstStart}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">${row.job_id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-700 align-top">${formatNumber(success)}/${formatNumber(total)} (${percent}%)</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm align-top ${getStatusClass(row.status)}">${statusLabel}</td>
            `;
            this.elements.tbody.appendChild(tr);
        });

        const totalPercent = totalCount > 0 ? Math.round((totalSuccess / totalCount) * 100) : 0;
        this.elements.totalSuccessRate.textContent = `전체 성공률: ${formatNumberAbbreviated(totalSuccess)}/${formatNumberAbbreviated(totalCount)} (${totalPercent}%)`;
        
        return pageData;
    }

    /**
     * 상태 요약 정보를 렌더링합니다.
     * @param {object} state - 애플리케이션 상태
     */
    renderStatusSummary(state) {
        const statusCount = this.filteredData.reduce((acc, row) => {
            acc[row.status] = (acc[row.status] || 0) + 1;
            return acc;
        }, {});

        const { errorCodeMap } = state;

        // 기본 색상 매핑 (CD900번대 코드용)
        const defaultColorMap = {
            'CD901': 'bg-green-100 text-green-700',
            'CD902': 'bg-red-100 text-red-700',
            'CD903': 'bg-gray-100 text-gray-700',
            'CD904': 'bg-blue-200 text-blue-800 border border-blue-200'
        };

        let summaryHtml = '<div class="flex flex-wrap gap-2">';
        const totalRows = this.filteredData.length;

        // 모든 상태 코드에 대해 처리
        Object.keys(statusCount).forEach(code => {
            const count = statusCount[code] || 0;
            if (count > 0) {
                const percent = totalRows > 0 ? ((count / totalRows) * 100).toFixed(1) : '0.0';
                const label = errorCodeMap[code] || code;
                const colorClass = defaultColorMap[code] || 'bg-gray-100 text-gray-700';

                summaryHtml += `<div class="${colorClass} rounded px-3 py-1 flex items-center shadow-sm">
                    <span class="font-semibold mr-1">${label}</span>
                    <span class="font-bold">${formatNumberAbbreviated(count)}건</span>
                    <span class="ml-1 text-xs">(${percent}%)</span>
                </div>`;
            }
        });

        summaryHtml += '</div>';
        this.elements.statusSummary.innerHTML = summaryHtml;
    }

    /**
     * 페이지네이션 UI를 렌더링합니다.
     * @param {object} state - 애플리케이션 상태
     * @param {number} totalRows - 전체 데이터 행 수
     */
    initializePagination(state, filteredData) {
        if (this.elements.totalCount) {
            this.elements.totalCount.textContent = `총 ${filteredData.length}개`;
        }

        initPagination({
            fullData: filteredData,
            pageSize: 10,
            renderTableCallback: (pageData) => {
                this.render(state, pageData);
            },
            paginationId: 'pagination',
            pageSizeId: 'pageSizeSelect',
            searchId: 'table-search',
            totalCountId: 'raw-data-total-count'
        });
    }
}
