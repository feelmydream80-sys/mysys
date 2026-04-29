// 파일명: static/js/modules/eventLog.js
// 주요 역할: 대시보드의 이벤트 로그 관련 기능을 담당합니다.

import { showMessage, formatNumberWithCommas } from '../common/utils.js';
import { initPagination } from '../ui_components/pagination.js';
import { formatDate, setDefaultDates, getKSTNow } from '../common/dateUtils.js';
import { displayMinMaxDates } from './ui.js';

// @AI_MOD: 전역 이벤트 로그 배열을 let -> const로 변경하고, toast와 공유
const eventLog = [];
let allEventLogData = [];
let eventLogStartDate = formatDate(getKSTNow());
let eventLogEndDate = formatDate(getKSTNow());
let allAdminSettings = [];

function formatDurationHr(start, end) {
    if (!start || !end) return '';
    // KST 시간 문자열(YYYY-MM-DD HH:mm:ss)을 안전하게 파싱
    const parseKSTDateTime = (dateTimeStr) => {
        const parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (!parts) return null;
        // KST 기준으로 Date 객체 생성 (월은 0-based)
        return new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]),
                       parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6]));
    };
    
    const startDate = parseKSTDateTime(start);
    const endDate = parseKSTDateTime(end);
    if (!startDate || !endDate) return '';
    
    const diffMs = endDate - startDate;
    if (isNaN(diffMs) || diffMs < 0) return '';
    const hours = diffMs / (1000 * 60 * 60);
    return `수집시간: ${hours.toFixed(1)}hr`;
}

function filterEventLogData(data, searchTerm, errorCodeMap = {}) {
    if (!searchTerm) return data;

    const searchLower = searchTerm.toLowerCase();
    return data.filter(item => {
        const row = item || {};
        if (row.job_id && row.job_id.toLowerCase().includes(searchLower)) return true;
        if (row.status && row.status.toLowerCase().includes(searchLower)) return true;
        if (row.rqs_info && row.rqs_info.toLowerCase().includes(searchLower)) return true;

        // 동적 상태 매핑 (기본값 제공)
        const defaultStatusMap = {
            'CD901': { msg: '정상 수집', desc: '수집완료' },
            'CD902': { msg: '장애 발생', desc: '실패' },
            'CD903': { msg: '미수집', desc: '미수집' },
            'CD904': { msg: '수집중', desc: '진행중' }
        };

        const statusLabel = errorCodeMap[row.status] || row.status || '';
        if (statusLabel.toLowerCase().includes(searchLower)) return true;

        const statusInfo = defaultStatusMap[row.status] || { msg: '', desc: '' };
        if (statusInfo.msg.toLowerCase().includes(searchLower)) return true;
        if (statusInfo.desc.toLowerCase().includes(searchLower)) return true;

        return false;
    });
}

function renderEventLogToasts(logs, errorCodeMap = {}) {
    const container = document.getElementById('event-log-ul');
    if (!container) return;

    // Adjust container height based on page size
    const pageSizeSelect = document.getElementById('eventLogPageSize');
    const pageSize = pageSizeSelect ? parseInt(pageSizeSelect.value, 10) : 5;
    const rowHeight = 28; // Approximate height of one log entry in pixels
    const headerHeight = 32; // Height for the header row
    container.style.height = `${(pageSize * rowHeight) + headerHeight}px`;

    // Clear previous logs
    container.innerHTML = '';

    const gridTemplateColumns = '160px 20px 60px 100px 100px 80px 80px 160px';
    const columnNames = ['시간', '', 'Job ID', '상태', '수집 건수', '성공률', '설명', '수집 시간'];

    // Create Header
    const header = document.createElement('div');
    header.className = 'grid';
    header.style.gridTemplateColumns = gridTemplateColumns;
    header.style.paddingBottom = '4px';
    header.style.borderBottom = '2px solid #e5e7eb'; // gray-200
    header.style.fontWeight = '600'; // font-semibold

    columnNames.forEach(name => {
        const cell = document.createElement('div');
        cell.className = 'text-sm text-gray-500';
        cell.className += ' text-center';
        cell.textContent = name;
        header.appendChild(cell);
    });
    container.appendChild(header);

    // Create a container for data rows
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.gridTemplateColumns = gridTemplateColumns;

    (logs || []).forEach(log => {
        const row = log || {};
        const jobId = row.job_id || '';
        const status = row.status || '';
        const rqsInfo = row.rqs_info || '';

        // --- 셀 생성을 위한 공통 변수 ---
        let icon = '🔔';
        let jobIdText = jobId;
        let statusText = status;
        let collectionCountText = '';
        let successRateText = '';
        let descriptionText = '';
        let durationDisplayText = '';

        // --- 날짜 포맷팅 ---
        const dt_str = row.start_dt;
        let mainTime = 'N/A';
        if (dt_str) {
            // 서버에서 이미 KST로 변환된 문자열을 제공하므로, 그대로 사용합니다.
            // JS의 Date 객체로 변환 시 발생하는 불필요한 시간대 재해석을 방지합니다.
            mainTime = dt_str;
        }

        // --- 로그 유형에 따른 분기 처리 ---
        if (status.startsWith('AUTH_') || status === 'LOGIN_SUCCESS') {
            // 인증 관련 이벤트 처리
            jobIdText = 'System';
            descriptionText = rqsInfo;
            
            const authStatusMap = {
                'LOGIN_SUCCESS': '로그인 성공', // 이전 버전 호환용
                'AUTH_LOGIN_SUCCESS': '로그인 성공',
                'AUTH_LOGIN_FAIL': '로그인 실패',
                'AUTH_REGISTER': '가입 신청',
                'AUTH_APPROVE': '가입 승인',
                'AUTH_REJECT': '가입 거절',
                'AUTH_DELETE': '사용자 삭제',
                'AUTH_RESET_PW': '비밀번호 초기화',
                'AUTH_CHANGE_PW': '비밀번호 변경',
                'AUTH_REQUEST_PW_RESET': '초기화 요청'
            };
            statusText = authStatusMap[status] || status;

        } else {
            // 기존 데이터 수집 작업 로그 처리
            const adminSetting = Array.isArray(allAdminSettings)
                ? (allAdminSettings.find(s => s.cd === jobId) || {})
                : {};
            
            // 기본 아이콘 매핑 (CD900번대 코드용)
            const defaultIconMap = {
                'CD901': adminSetting.sr_success_icon_code || '🔔',
                'CD902': adminSetting.cf_fail_icon_code || '🔔',
                'CD903': adminSetting.cf_warning_icon_code || '🟠',
                'CD904': adminSetting.sr_success_icon_code || '🔔'
            };
            icon = defaultIconMap[status] || '🔔';

            let success = 0, total = 0, percent = 0;
            if (rqsInfo) {
                const match = rqsInfo.match(/총 요청 수: (\d+), 실패: (\d+)/);
                if (match) {
                    total = parseInt(match[1]);
                    const fail = parseInt(match[2]);
                    success = total - fail;
                    percent = total > 0 ? Math.round((success / total) * 100) : 0;
                }
            }

            // 동적 상태 매핑 (기본값 제공)
            const defaultStatusMap = {
                'CD901': { msg: '정상 수집', desc: '수집완료' },
                'CD902': { msg: '장애 발생', desc: '실패' },
                'CD903': { msg: '미수집', desc: '미수집' },
                'CD904': { msg: '수집중', desc: '진행중' }
            };
            const statusInfo = defaultStatusMap[status] || { msg: errorCodeMap[status] || status, desc: errorCodeMap[status] || status };
            statusText = statusInfo.msg;
            descriptionText = statusInfo.desc;
            
            collectionCountText = `${formatNumberWithCommas(success)}/${formatNumberWithCommas(total)}`;
            successRateText = `${percent}%`;
            
            const durationHr = formatDurationHr(row.start_dt, row.end_dt);
            durationDisplayText = status === 'CD904' ? durationHr : `${durationHr}`;
        }

        // --- 셀(Cell) 생성 및 값 할당 ---
        const timeCell = document.createElement('div');
        timeCell.className = 'font-monospace text-gray-500 text-sm whitespace-nowrap';
        timeCell.textContent = mainTime;

        const iconCell = document.createElement('div');
        iconCell.className = 'text-center';
        iconCell.textContent = icon;

        const jobIdCell = document.createElement('div');
        jobIdCell.className = 'font-semibold text-blue-600 text-sm whitespace-nowrap text-center';
        jobIdCell.textContent = jobIdText;

        const statusCell = document.createElement('div');
        statusCell.className = 'text-gray-600 text-sm whitespace-nowrap text-center';
        statusCell.textContent = statusText;

        const collectionCountCell = document.createElement('div');
        collectionCountCell.className = 'text-gray-800 text-sm whitespace-nowrap text-center';
        collectionCountCell.textContent = collectionCountText;

        const successRateCell = document.createElement('div');
        successRateCell.className = 'text-gray-800 text-sm whitespace-nowrap text-center';
        successRateCell.textContent = successRateText;

        const descriptionCell = document.createElement('div');
        descriptionCell.className = 'text-gray-800 text-sm whitespace-nowrap text-center';
        descriptionCell.textContent = descriptionText;
        descriptionCell.title = descriptionText; // 긴 설명은 툴팁으로 표시

        const durationCell = document.createElement('div');
        durationCell.className = 'text-gray-800 text-sm truncate text-center';
        durationCell.textContent = durationDisplayText;
        durationCell.title = durationDisplayText;

        // --- 그리드에 셀 추가 ---
        grid.appendChild(timeCell);
        grid.appendChild(iconCell);
        grid.appendChild(jobIdCell);
        grid.appendChild(statusCell);
        grid.appendChild(collectionCountCell);
        grid.appendChild(successRateCell);
        grid.appendChild(descriptionCell);
        grid.appendChild(durationCell);
    });
    container.appendChild(grid);
}

export function renderEventLogPage(pageData) {
    renderEventLogToasts(pageData);
}

export async function loadEventLogPage(page = 1) {
    try {
        const params = new URLSearchParams({
            start_date: eventLogStartDate,
            end_date: eventLogEndDate
        });
        
        const url = `/api/dashboard/event-log?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const rawLogData = await res.json();

        // 모든 사용자가 모든 로그를 볼 수 있도록 필터링 로직 제거
        allEventLogData = rawLogData;
        
        initPagination({
            fullData: allEventLogData,
            pageSize: 5,
            renderTableCallback: renderEventLogPage,
            paginationId: 'eventLogPagination',
            pageSizeId: 'eventLogPageSize',
            searchId: 'eventLogSearch',
        });
        
    } catch (error) {
        
        allEventLogData = [];
        initPagination({
            fullData: [],
            pageSize: 5,
            renderTableCallback: renderEventLogPage,
            paginationId: 'eventLogPagination',
            pageSizeId: 'eventLogPageSize',
            searchId: 'eventLogSearch',
        });
    }
}

export function initEventLog(settings) {
    allAdminSettings = settings;
    displayMinMaxDates('eventLog', 'eventlog-min-date', 'eventlog-max-date');
    const startInput = document.getElementById('eventLogStartDate');
    const endInput = document.getElementById('eventLogEndDate');
    
    // setDefaultDates를 사용하여 날짜 초기화
    // eventLog는 다른 페이지와 달리 end_date가 오늘, start_date도 오늘로 시작해야 함
    if (startInput && endInput) {
        const today = getKSTNow();
        const todayStr = formatDate(today);
        
        startInput.value = todayStr;
        endInput.value = todayStr;
        eventLogStartDate = todayStr;
        eventLogEndDate = todayStr;

        startInput.addEventListener('change', () => {
            eventLogStartDate = startInput.value;
            loadEventLogPage(1);
        });
        endInput.addEventListener('change', () => {
            eventLogEndDate = endInput.value;
            loadEventLogPage(1);
        });
    }

    loadEventLogPage(1);

    const searchInput = document.getElementById('eventLogSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            const filteredData = filterEventLogData(allEventLogData, searchTerm);
            initPagination({
                fullData: filteredData,
                pageSize: 5,
                renderTableCallback: renderEventLogPage,
                paginationId: 'eventLogPagination',
                pageSizeId: 'eventLogPageSize',
                searchId: 'eventLogSearch',
            });
        });
    }

    // @AI_MOD: 'save-event-log-btn' 이벤트 리스너를 dashboard.js에서 여기로 이동
    const saveLogBtn = document.getElementById('save-event-log-btn');
    if (saveLogBtn) {
        saveLogBtn.addEventListener('click', async function() {
            const originalText = this.textContent;
            this.disabled = true;

            if (!allEventLogData || allEventLogData.length === 0) {
                showMessage('저장할 이벤트 로그 데이터가 없습니다.', 'warning');
                this.disabled = false;
                return;
            }

            try {
                const response = await fetch('/api/save-event-log', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(allEventLogData),
                });

                if (response.ok) {
                    const result = await response.json();
                    this.textContent = `저장 완료: ${result.file_path}`;
                    showMessage(`이벤트 로그가 서버에 저장되었습니다: ${result.file_path}`, 'success');
                } else {
                    const errorData = await response.json();
                    this.textContent = '저장 실패';
                    throw new Error(errorData.error || '서버 응답 오류');
                }
            } catch (error) {
                
                showMessage(`이벤트 로그 저장에 실패했습니다: ${error.message}`, 'error');
                this.textContent = '저장 실패';
            } finally {
                setTimeout(() => {
                    this.textContent = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    }
}

/**
 * @AI_ADD: 실시간 이벤트 토스트를 표시하는 함수 (dashboard.js에서 이동)
 * @param {object} eventData - 이벤트 데이터 객체 { jobId, eventType, message, icon, color, time }
 */
export function showEventToast({ jobId, eventType, message, icon, color, time }) {
    const container = document.getElementById('event-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `flex items-center px-4 py-3 rounded shadow-lg bg-white border-l-4 ${color} animate-fade-in`;
    toast.innerHTML = `
      <span class="mr-2 text-xl">${icon}</span>
      <div class="flex-1">
        <div class="font-semibold">${eventType} [${jobId}]</div>
        <div class="text-sm text-gray-700">${message}</div>
        <div class="text-xs text-gray-400">${time}</div>
      </div>
      <button class="ml-2 text-gray-400 hover:text-gray-700" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 7000);

    // 로그 배열에 저장 (다운로드용)
    eventLog.push({ jobId, eventType, message, icon, color, time });
}
