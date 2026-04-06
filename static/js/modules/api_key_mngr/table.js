/**
 * API 키 관리 페이지의 Table 모듈
 * - 테이블 렌더링, 페이지네이션, 필터링, 정렬
 */

window.ApiKeyMngrUI = window.ApiKeyMngrUI || {};

// ==========================================
// 정렬 상태 관리
// ==========================================
window.ApiKeyMngrUI.sortState = {
    normal: { column: 'days_remaining', direction: 'asc' },
    abnormal: { column: 'days_remaining', direction: 'asc' }
};

/**
 * 데이터 정렬 함수
 */
window.ApiKeyMngrUI.sortData = function(data, column, direction, tableType) {
    if (!column) return data;
    
    return [...data].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // null/undefined 처리
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';
        
        // 숫자 비교 (days_remaining, due 등)
        if (column === 'days_remaining' || column === 'due') {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            return direction === 'asc' ? valA - valB : valB - valA;
        }
        
        // 날짜 비교 (start_dt)
        if (column === 'start_dt') {
            const dateA = new Date(valA);
            const dateB = new Date(valB);
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        // 문자열 비교 (cd, cd_nm, api_key, api_ownr_email_addr)
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
};

/**
 * 정렬 상태 업데이트 및 테이블 다시 렌더링
 */
window.ApiKeyMngrUI.handleSort = function(column, tableType) {
    const state = window.ApiKeyMngrUI.sortState[tableType];
    if (!state) return;
    
    // 같은 열 클릭 시 방향 토글, 다른 열 클릭 시 오름차순으로 초기화
    if (state.column === column) {
        state.direction = state.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.column = column;
        state.direction = 'asc';
    }
    
    // 테이블 다시 렌더링
    if (tableType === 'normal') {
        window.ApiKeyMngrUI.renderApiKeyMngrTable();
    } else if (tableType === 'abnormal') {
        window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable();
    }
};

/**
 * 정렬 아이콘 HTML 생성
 */
window.ApiKeyMngrUI.getSortIcon = function(column, tableType) {
    const state = window.ApiKeyMngrUI.sortState[tableType];
    if (!state || state.column !== column) {
        return '<span class="ml-1 text-gray-400 text-xs">↕</span>';
    }
    return state.direction === 'asc' 
        ? '<span class="ml-1 text-blue-600 text-xs">↑</span>' 
        : '<span class="ml-1 text-blue-600 text-xs">↓</span>';
};

/**
 * 정렬 가능한 헤더 HTML 생성
 */
window.ApiKeyMngrUI.createSortableHeader = function(column, label, tableType) {
    const widths = {
        'cd': '10%', 'cd_nm': '12%', 'api_key': '18%',
        'api_ownr_email_addr': '18%', 'due': '7%',
        'start_dt': '10%', 'days_remaining': '8%'
    };
    const width = widths[column] || 'auto';
    const icon = window.ApiKeyMngrUI.getSortIcon(column, tableType);
    return `<th class="py-4 px-6 text-left font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-200 select-none transition" 
                style="width: ${width};"
                onclick="ApiKeyMngrUI.handleSort('${column}', '${tableType}')">
                ${label}${icon}
            </th>`;
};

// ==========================================
// 필터링 함수
// ==========================================

/**
 * 필터링된 API 키 관리 데이터 가져오기
 */
window.ApiKeyMngrUI.getFilteredApiKeyMngrData = function(data) {
    const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const today = new Date();
    
    // 데이터 변환 (기간 차트와 동일한 로직)
    const keys = data.map(k => {
        const endDate = new Date(k.start_dt);
        endDate.setFullYear(endDate.getFullYear() + k.due);
        const daysLeft = Math.ceil((endDate - today) / 86400000);
        let status = 'ok';
        if (daysLeft <= 30 && daysLeft > 0) status = 'expiring-30';
        if (daysLeft <= 7 && daysLeft > 0) status = 'expiring-7';
        if (daysLeft <= 0) status = 'err';
        
        return { 
            ...k,
            status: status,
            daysLeft: daysLeft
        };
    });

    // 검색 및 필터링
    let filtered = keys.filter(k => {
        const matchQ = !q || k.cd.toLowerCase().includes(q) || (k.api_key && k.api_key.toLowerCase().includes(q));
        const matchS = window.ApiKeyMngrUI.currentFilter === 'all' || k.status === window.ApiKeyMngrUI.currentFilter;
        return matchQ && matchS;
    });

    return filtered;
};

// ==========================================
// 테이블 렌더링
// ==========================================

/**
 * API 키 관리 테이블 렌더링
 */
window.ApiKeyMngrUI.renderApiKeyMngrTable = function(data) {
    const tableBody = document.getElementById('api-key-mngr-table-body');
    const paginationDiv = document.getElementById('api-key-mngr-pagination');
    const tableHead = document.querySelector('#normal-api-table-container thead tr');
    
    // 정상 상태의 API 키 관리 데이터 가져오기
    let normalData = ApiKeyMngrData.getNormalApiKeyMngrData();
    
    // 필터 및 검색 적용
    normalData = window.ApiKeyMngrUI.getFilteredApiKeyMngrData(normalData);
    
    // 정렬 적용
    const sortState = window.ApiKeyMngrUI.sortState.normal;
    normalData = window.ApiKeyMngrUI.sortData(normalData, sortState.column, sortState.direction, 'normal');
    
    // 헤더 업데이트 (정렬 아이콘 포함)
    if (tableHead) {
        tableHead.innerHTML = `
            ${window.ApiKeyMngrUI.createSortableHeader('cd', '코드명', 'normal')}
            ${window.ApiKeyMngrUI.createSortableHeader('cd_nm', '명칭', 'normal')}
            ${window.ApiKeyMngrUI.createSortableHeader('api_key', 'API값', 'normal')}
            ${window.ApiKeyMngrUI.createSortableHeader('api_ownr_email_addr', 'API책임자이메일', 'normal')}
            ${window.ApiKeyMngrUI.createSortableHeader('due', '기간', 'normal')}
            ${window.ApiKeyMngrUI.createSortableHeader('start_dt', '등록일', 'normal')}
            ${window.ApiKeyMngrUI.createSortableHeader('days_remaining', '남은 기간', 'normal')}
            <th class="py-4 px-6 text-left font-medium text-gray-600 whitespace-nowrap" style="width: 10%;">알림 메일 전송</th>
            <th class="py-4 px-6 text-left font-medium text-gray-600 whitespace-nowrap" style="width: 7%;">수정</th>
        `;
    }
    
    // 페이지네이션 설정
    const itemsPerPage = window.ApiKeyMngrUI.getPageSize();
    const currentPage = parseInt(localStorage.getItem('apiKeyMngrPage')) || 1;
    const totalPages = Math.ceil(normalData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = normalData.slice(startIndex, endIndex);
    
    // 테이블 렌더링
    tableBody.innerHTML = '';
    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="py-8 px-6 text-center text-gray-500">
                    정상 API 키 관리 데이터가 없습니다.
                </td>
            </tr>
        `;
    } else {
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition';
            
            const remainingDays = item.days_remaining;
            // 기간 차트 필터 버튼과 동일한 조건부 색상 적용
            let remainingDaysClass = 'text-gray-700';
            if (remainingDays <= 0) {
                remainingDaysClass = 'text-red-600 font-medium'; // err (오버)
            } else if (remainingDays <= 7) {
                remainingDaysClass = 'text-orange-500 font-medium'; // expiring-7 (만료 임박 7일)
            } else if (remainingDays <= 30) {
                remainingDaysClass = 'text-yellow-600 font-medium'; // expiring-30 (만료 임박 30일)
            } else {
                remainingDaysClass = 'text-green-600 font-medium'; // ok (정상)
            }
            
            row.innerHTML = `
                <td class="py-4 px-6 font-medium text-gray-800">${item.cd}</td>
                <td class="py-4 px-6 text-gray-700">${item.cd_nm || '-'}</td>
                <td class="py-4 px-6 font-mono text-gray-700">${item.api_key}</td>
                <td class="py-4 px-6 text-gray-700">${item.api_ownr_email_addr || '-'}</td>
                <td class="py-4 px-6 text-gray-700">${item.due}년</td>
                <td class="py-4 px-6 text-gray-700">${window.ApiKeyMngrUI.formatDate(item.start_dt)}</td>
                <td class="py-4 px-6 ${remainingDaysClass}">${remainingDays}일</td>
                <td class="py-4 px-6">
                    <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm" onclick="ApiKeyMngrUI.sendNotification('${item.cd}')">
                        보내기
                    </button>
                </td>
                <td class="py-4 px-6">
                    <button class="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">
                        수정
                    </button>
                </td>
            `;
            
            // 수정 버튼 이벤트 리스너 추가
            const editButton = row.querySelector('td:last-child button');
            editButton.addEventListener('click', () => {
                window.ApiKeyMngrUI.showEditModal(item);
            });
            
            tableBody.appendChild(row);
        });
    }
    
    // 페이지네이션 렌더링
    window.ApiKeyMngrUI.renderPagination(paginationDiv, currentPage, totalPages, () => window.ApiKeyMngrUI.renderApiKeyMngrTable(), 'apiKeyMngrPage');
};

/**
 * 비정상 API 키 관리 테이블 렌더링
 */
window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable = function() {
    const tableBody = document.getElementById('abnormal-api-key-mngr-table-body');
    const paginationDiv = document.getElementById('abnormal-api-key-mngr-pagination');
    const tableHead = document.querySelector('#abnormal-api-table-container thead tr');
    
    // 비정상 상태의 API 키 관리 데이터 가져오기
    let abnormalData = ApiKeyMngrData.getAbnormalApiKeyMngrData();
    
    // 검색 적용 (필터는 적용하지 않음)
    const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
    abnormalData = abnormalData.filter(item => {
        return !q || item.cd.toLowerCase().includes(q) || (item.api_key && item.api_key.toLowerCase().includes(q));
    });
    
    // 정렬 적용
    const sortState = window.ApiKeyMngrUI.sortState.abnormal;
    abnormalData = window.ApiKeyMngrUI.sortData(abnormalData, sortState.column, sortState.direction, 'abnormal');
    
    // 헤더 업데이트 (정렬 아이콘 포함)
    if (tableHead) {
        tableHead.innerHTML = `
            ${window.ApiKeyMngrUI.createSortableHeader('cd', '코드명', 'abnormal')}
            ${window.ApiKeyMngrUI.createSortableHeader('cd_nm', '명칭', 'abnormal')}
            ${window.ApiKeyMngrUI.createSortableHeader('api_key', 'API값', 'abnormal')}
            ${window.ApiKeyMngrUI.createSortableHeader('api_ownr_email_addr', 'API책임자이메일', 'abnormal')}
            ${window.ApiKeyMngrUI.createSortableHeader('due', '기간', 'abnormal')}
            ${window.ApiKeyMngrUI.createSortableHeader('start_dt', '등록일', 'abnormal')}
            ${window.ApiKeyMngrUI.createSortableHeader('days_remaining', '남은 기간', 'abnormal')}
            <th class="py-4 px-6 text-left font-medium text-gray-600 whitespace-nowrap" style="width: 10%;">알림 메일 전송</th>
            <th class="py-4 px-6 text-left font-medium text-gray-600 whitespace-nowrap" style="width: 7%;">수정</th>
        `;
    }
    
    // 페이지네이션 설정
    const itemsPerPage = window.ApiKeyMngrUI.getPageSize();
    const currentPage = parseInt(localStorage.getItem('abnormalApiKeyMngrPage')) || 1;
    const totalPages = Math.ceil(abnormalData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = abnormalData.slice(startIndex, endIndex);
    
    // 테이블 렌더링
    tableBody.innerHTML = '';
    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="py-8 px-6 text-center text-gray-500">
                    비정상 API 키 관리 데이터가 없습니다.
                </td>
            </tr>
        `;
    } else {
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition';
            
            const remainingDays = item.days_remaining;
            // 기간 차트 필터 버튼과 동일한 조건부 색상 적용
            let remainingDaysClass = 'text-gray-700';
            if (remainingDays <= 0) {
                remainingDaysClass = 'text-red-600 font-medium'; // err (오버)
            } else if (remainingDays <= 7) {
                remainingDaysClass = 'text-orange-500 font-medium'; // expiring-7 (만료 임박 7일)
            } else if (remainingDays <= 30) {
                remainingDaysClass = 'text-yellow-600 font-medium'; // expiring-30 (만료 임박 30일)
            } else {
                remainingDaysClass = 'text-green-600 font-medium'; // ok (정상)
            }
            
            row.innerHTML = `
                <td class="py-4 px-6 font-medium text-gray-800">${item.cd}</td>
                <td class="py-4 px-6 text-gray-700">${item.cd_nm || '-'}</td>
                <td class="py-4 px-6 font-mono text-gray-500">${item.api_key || '없음'}</td>
                <td class="py-4 px-6 text-gray-700">${item.api_ownr_email_addr || '-'}</td>
                <td class="py-4 px-6 text-gray-700">${item.due}년</td>
                <td class="py-4 px-6 text-gray-700">${window.ApiKeyMngrUI.formatDate(item.start_dt)}</td>
                <td class="py-4 px-6 ${remainingDaysClass}">${remainingDays}일</td>
                <td class="py-4 px-6">
                    <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm" onclick="ApiKeyMngrUI.sendNotification('${item.cd}')">
                        보내기
                    </button>
                </td>
                <td class="py-4 px-6">
                    <button class="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm">
                        수정
                    </button>
                </td>
            `;
            
            // 수정 버튼 이벤트 리스너 추가
            const editButton = row.querySelector('td:last-child button');
            editButton.addEventListener('click', () => {
                window.ApiKeyMngrUI.showEditModal(item);
            });
            
            tableBody.appendChild(row);
        });
    }
    
    // 페이지네이션 렌더링
    window.ApiKeyMngrUI.renderPagination(paginationDiv, currentPage, totalPages, () => window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable(), 'abnormalApiKeyMngrPage');
};

/**
 * 위험군 API 키 관리 테이블 렌더링 (메일 전송 상태 포함)
 */
window.ApiKeyMngrUI.renderRiskApiKeyMngrTable = async function() {
    const tableBody = document.getElementById('risk-api-key-mngr-table-body');
    const paginationDiv = document.getElementById('risk-api-key-mngr-pagination');
    const summaryDiv = document.getElementById('risk-mail-status-summary');
    
    // 위험군 API 키 관리 데이터 가져오기 (1개월 이내 만료)
    const riskData = ApiKeyMngrData.getRiskApiKeyMngrData();
    
    // 메일 전송 이력 및 스케줄 정보 로드
    const mailStatusMap = await ApiKeyMngrData.getMailStatusForRiskGroup();
    const scheduleInfo = await ApiKeyMngrData.getScheduleHourInfo();
    
    // 메일 전송 상태별 분류
    let successCount = 0;
    let failedCount = 0;
    let waitingCount = 0;
    
    riskData.forEach(item => {
        const status = window.ApiKeyMngrUI.getMailStatusText(item, mailStatusMap, scheduleInfo);
        if (status.type === 'success') successCount++;
        else if (status.type === 'failed') failedCount++;
        else waitingCount++;
    });
    
    // 요약 패널 업데이트
    if (summaryDiv) {
        summaryDiv.innerHTML = `
            <div class="flex items-center gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span class="text-sm font-medium text-gray-700">📊 메일 전송 현황</span>
                <span class="text-sm text-green-600 font-medium">✅ 전송완료: ${successCount}건</span>
                <span class="text-sm text-red-600 font-medium">❌ 전송실패: ${failedCount}건</span>
                <span class="text-sm text-gray-500 font-medium">⏳ 대기중: ${waitingCount}건</span>
            </div>
        `;
    }
    
    // 필터 적용
    const currentFilter = window.ApiKeyMngrUI.riskMailFilter || 'all';
    let filteredData = riskData.filter(item => {
        const status = window.ApiKeyMngrUI.getMailStatusText(item, mailStatusMap, scheduleInfo);
        if (currentFilter === 'all') return true;
        if (currentFilter === 'success') return status.type === 'success';
        if (currentFilter === 'failed') return status.type === 'failed';
        if (currentFilter === 'waiting') return status.type === 'waiting';
        return true;
    });
    
    // 페이지네이션 설정
    const itemsPerPage = window.ApiKeyMngrUI.getRiskPageSize();
    const currentPage = parseInt(localStorage.getItem('riskApiKeyMngrPage')) || 1;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    // 테이블 렌더링
    tableBody.innerHTML = '';
    if (paginatedData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="py-8 px-6 text-center text-gray-500">
                    ${riskData.length === 0 ? '위험군 API 키가 없습니다.' : '필터 조건에 맞는 데이터가 없습니다.'}
                </td>
            </tr>
        `;
    } else {
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition';
            
            const remainingDays = item.days_remaining;
            const mailStatus = window.ApiKeyMngrUI.getMailStatusText(item, mailStatusMap, scheduleInfo);
            
            row.innerHTML = `
                <td class="py-4 px-4 font-medium text-gray-800 text-sm">${item.cd}</td>
                <td class="py-4 px-4 text-gray-700 text-sm">${item.cd_nm || '-'}</td>
                <td class="py-4 px-4 text-red-600 font-medium text-sm text-center">${remainingDays}일</td>
                <td class="py-4 px-4 text-sm">${mailStatus.html}</td>
                <td class="py-4 px-4 text-gray-700 text-sm">${item.api_ownr_email_addr || '-'}</td>
                <td class="py-4 px-4 text-gray-700 text-sm text-center">${item.due}년</td>
                <td class="py-4 px-4 text-gray-700 text-sm">${window.ApiKeyMngrUI.formatDate(item.start_dt)}</td>
                <td class="py-4 px-4">
                    <button class="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm edit-btn">
                        수정
                    </button>
                </td>
            `;
            
            // 수정 버튼 이벤트 리스너 추가
            const editButton = row.querySelector('.edit-btn');
            editButton.addEventListener('click', () => {
                window.ApiKeyMngrUI.showEditModal(item);
            });
            
            tableBody.appendChild(row);
        });
    }
    
    // 페이지네이션 렌더링
    window.ApiKeyMngrUI.renderPagination(paginationDiv, currentPage, totalPages, () => window.ApiKeyMngrUI.renderRiskApiKeyMngrTable(), 'riskApiKeyMngrPage');
};

// ==========================================
// 검색 및 필터
// ==========================================

/**
 * 검색 처리
 */
window.ApiKeyMngrUI.handleSearch = function() {
    const currentActiveTab = document.querySelector('.api-tab-btn.active');
    if (currentActiveTab && currentActiveTab.dataset.apiTab === 'normal') {
        window.ApiKeyMngrUI.renderApiKeyMngrTable();
    } else {
        window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable();
    }
};

/**
 * 필터 상태 설정
 */
window.ApiKeyMngrUI.filterByStatus = function(status) {
    window.ApiKeyMngrUI.currentFilter = status;
    
    // 현재 활성 탭에 따라 렌더링
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
        const tabId = activeTab.dataset.tab;
        if (tabId === '1') {
            window.ApiKeyMngrUI.renderGanttChart();
        } else if (tabId === '0') {
            const currentActiveApiTab = document.querySelector('.api-tab-btn.active');
            if (currentActiveApiTab && currentActiveApiTab.dataset.apiTab === 'normal') {
                window.ApiKeyMngrUI.renderApiKeyMngrTable();
            } else {
                window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable();
            }
        }
    }
};

/**
 * 위험군 메일 전송 상태 필터 적용
 */
window.ApiKeyMngrUI.filterRiskByMailStatus = function(filter) {
    window.ApiKeyMngrUI.riskMailFilter = filter;
    localStorage.setItem('riskApiKeyMngrPage', '1');
    
    // 필터 버튼 활성 상태 업데이트
    document.querySelectorAll('.risk-mail-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    window.ApiKeyMngrUI.renderRiskApiKeyMngrTable();
};

/**
 * 메일 전송 상태 텍스트 생성
 */
window.ApiKeyMngrUI.getMailStatusText = function(item, mailStatusMap, scheduleInfo) {
    const cd = item.cd;
    const daysRemaining = item.days_remaining;
    const mailStatus = mailStatusMap[cd];
    
    // 성공 이력이 있는 경우
    if (mailStatus && mailStatus.success.length > 0) {
        // 최근 5개까지만 표시
        const recentSuccess = mailStatus.success.slice(0, 5);
        const datesHtml = recentSuccess.map(s => {
            // YYMMDD 형식으로 변환
            const date = new Date(s.sent_dt);
            const yymmdd = String(date.getFullYear()).slice(2) + 
                           String(date.getMonth() + 1).padStart(2, '0') + 
                           String(date.getDate()).padStart(2, '0');
            return yymmdd;
        }).join(' ');
        
        return {
            type: 'success',
            html: `<span class="text-green-600 font-medium">✅ ${datesHtml}</span>`
        };
    }
    
    // 실패 이력이 있는 경우
    if (mailStatus && mailStatus.failed.length > 0) {
        const recentFailed = mailStatus.failed.slice(0, 5);
        const datesHtml = recentFailed.map(f => {
            const date = new Date(f.sent_dt);
            const yymmdd = String(date.getFullYear()).slice(2) + 
                           String(date.getMonth() + 1).padStart(2, '0') + 
                           String(date.getDate()).padStart(2, '0');
            return yymmdd;
        }).join(' ');
        
        return {
            type: 'failed',
            html: `<span class="text-red-600 font-medium">❌ ${datesHtml}</span>`
        };
    }
    
    // 대기중 - 발송 대상인지 확인
    const scheduleHour = scheduleInfo['7일전']?.hour ?? 9; // 기본 9시
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 7일 전~1일 전 범위인 경우 매일 발송
    if (daysRemaining >= 1 && daysRemaining <= 7) {
        if (currentHour >= scheduleHour) {
            return {
                type: 'waiting',
                html: `<span class="text-gray-500">⏳ 내일 ${String(scheduleHour).padStart(2, '0')}시 발송 예정</span>`
            };
        } else {
            return {
                type: 'waiting',
                html: `<span class="text-gray-500">⏳ 오늘 ${String(scheduleHour).padStart(2, '0')}시 발송 예정</span>`
            };
        }
    }
    
    // 30일 전인 경우
    if (daysRemaining === 30) {
        if (currentHour >= scheduleHour) {
            return {
                type: 'waiting',
                html: `<span class="text-gray-500">⏳ 발송 완료 (다음 스케줄 대기)</span>`
            };
        } else {
            return {
                type: 'waiting',
                html: `<span class="text-gray-500">⏳ 오늘 ${String(scheduleHour).padStart(2, '0')}시 발송 예정</span>`
            };
        }
    }
    
    // 당일인 경우
    if (daysRemaining === 0) {
        if (currentHour >= scheduleHour) {
            return {
                type: 'waiting',
                html: `<span class="text-gray-500">⏳ 발송 완료 (다음 스케줄 대기)</span>`
            };
        } else {
            return {
                type: 'waiting',
                html: `<span class="text-gray-500">⏳ 오늘 ${String(scheduleHour).padStart(2, '0')}시 발송 예정</span>`
            };
        }
    }
    
    // 아직 발송 범위가 아닌 경우
    let daysUntilSchedule = 0;
    if (daysRemaining > 30) {
        daysUntilSchedule = daysRemaining - 30;
    } else if (daysRemaining > 7) {
        daysUntilSchedule = daysRemaining - 7;
    }
    
    if (daysUntilSchedule > 0) {
        return {
            type: 'waiting',
            html: `<span class="text-gray-500">⏳ 전송 스케줄까지 ${daysUntilSchedule}일 남음</span>`
        };
    }
    
    return {
        type: 'waiting',
        html: `<span class="text-gray-500">⏳ 오늘 ${String(scheduleHour).padStart(2, '0')}시 발송 예정</span>`
    };
};

// ==========================================
// 페이지네이션
// ==========================================

/**
 * 페이지네이션 렌더링
 */
window.ApiKeyMngrUI.renderPagination = function(container, currentPage, totalPages, renderFunction, storageKey) {
    if (!storageKey) {
        storageKey = 'apiKeyMngrPage';
    }
    
    container.innerHTML = '';
    
    // 이전 페이지 버튼
    const prevButton = document.createElement('button');
    prevButton.className = 'px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition';
    prevButton.innerHTML = '이전';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = function() {
        if (currentPage > 1) {
            localStorage.setItem(storageKey, currentPage - 1);
            renderFunction();
        }
    };
    container.appendChild(prevButton);
    
    // 페이지 번호 버튼
    const visiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let endPage = Math.min(totalPages, startPage + visiblePages - 1);
    
    if (endPage - startPage + 1 < visiblePages) {
        startPage = Math.max(1, endPage - visiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition';
        pageButton.textContent = i;
        pageButton.onclick = function() {
            localStorage.setItem(storageKey, i);
            renderFunction();
        };
        container.appendChild(pageButton);
    }
    
    // 다음 페이지 버튼
    const nextButton = document.createElement('button');
    nextButton.className = 'px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition';
    nextButton.innerHTML = '다음';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = function() {
        if (currentPage < totalPages) {
            localStorage.setItem(storageKey, currentPage + 1);
            renderFunction();
        }
    };
    container.appendChild(nextButton);
};

// ==========================================
// 수정 모달
// ==========================================

/**
 * 수정 모달 표시
 */
window.ApiKeyMngrUI.showEditModal = function(item) {
    // 모달 HTML 생성 (동적으로 생성하여 기존 DOM에 추가)
    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-xl p-6 w-96';
    
    // 모달 내용 생성
    modalContent.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">API 키 정보 수정</h3>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">코드명 (CD)</label>
            <input type="text" id="editCd" disabled class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100">
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">API 값</label>
            <input type="text" id="editApiKey" class="w-full px-3 py-2 border border-gray-300 rounded-md">
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">API 책임자 이메일 (쉼표로 구분)</label>
            <textarea id="editApiOwnrEmail" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
            <div class="text-xs text-gray-500 mt-1">여러 이메일은 쉼표(,)로 구분해주세요.</div>
        </div>
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">기간 (년)</label>
            <input type="number" id="editDue" min="1" max="10" class="w-full px-3 py-2 border border-gray-300 rounded-md">
        </div>
        <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">등록일</label>
            <input type="date" id="editStartDt" class="w-full px-3 py-2 border border-gray-300 rounded-md">
        </div>
        <div class="flex justify-end gap-2">
            <button onclick="ApiKeyMngrUI.hideEditModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">취소</button>
            <button onclick="ApiKeyMngrUI.handleUpdateApiKeyMngr('${item.cd}')" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">수정</button>
        </div>
    `;
    
    // 입력 필드에 값 설정
    modalContent.querySelector('#editCd').value = item.cd;
    modalContent.querySelector('#editApiKey').value = item.api_key || '';
    modalContent.querySelector('#editApiOwnrEmail').value = item.api_ownr_email_addr || '';
    modalContent.querySelector('#editDue').value = item.due;
    modalContent.querySelector('#editStartDt').value = item.start_dt;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
};

/**
 * 수정 모달 숨기기
 */
window.ApiKeyMngrUI.hideEditModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.remove();
    }
};

/**
 * API 키 관리 데이터 업데이트 이벤트 (API 키 포함)
 */
window.ApiKeyMngrUI.handleUpdateApiKeyMngr = async function(cd) {
    const apiKey = document.getElementById('editApiKey').value;
    const apiOwnrEmail = document.getElementById('editApiOwnrEmail').value;
    const due = parseInt(document.getElementById('editDue').value);
    const startDt = document.getElementById('editStartDt').value;
    
    try {
        const success = await ApiKeyMngrData.updateApiKeyMngr(cd, due, startDt, apiOwnrEmail, apiKey);
        if (success) {
            window.ApiKeyMngrUI.hideEditModal();
            // 데이터를 다시 로드하여 최신 데이터로 화면 갱신
            await ApiKeyMngrData.loadApiKeyMngrData();
            window.ApiKeyMngrUI.renderApiKeyMngrTable();
            window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable();
            window.ApiKeyMngrUI.renderGanttChart();
            window.ApiKeyMngrUI.renderRiskApiKeyMngrTable();
        } else {
            window.ApiKeyMngrUI.showErrorMessage('API 키 관리 데이터 업데이트에 실패했습니다.');
        }
    } catch (error) {
        console.error('API 키 관리 데이터 업데이트 오류:', error);
        window.ApiKeyMngrUI.showErrorMessage('API 키 관리 데이터 업데이트 중 오류가 발생했습니다.');
    }
};