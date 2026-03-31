/**
 * API 키 관리 페이지의 UI 모듈
 */

// 페이지네이션 설정
const itemsPerPage = 10;

/**
 * API 키 관리 테이블 렌더링
 */
function renderApiKeyMngrTable() {
    const tableBody = document.getElementById('api-key-mngr-table-body');
    const paginationDiv = document.getElementById('api-key-mngr-pagination');
    
    // 정상 상태의 API 키 관리 데이터 가져오기
    const normalData = apiKeyMngrData.getNormalApiKeyMngrData();
    
    // 페이지네이션 기본 설정
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
                <td colspan="7" class="py-8 px-6 text-center text-gray-500">
                    정상 API 키 관리 데이터가 없습니다.
                </td>
            </tr>
        `;
    } else {
        paginatedData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition';
            
            const remainingDays = item.days_remaining;
            const remainingDaysClass = remainingDays <= 30 ? 'text-red-600 font-medium' : 'text-gray-700';
            
            row.innerHTML = `
                <td class="py-4 px-6 font-medium text-gray-800">${item.cd}</td>
                <td class="py-4 px-6 font-mono text-gray-700">${item.api_key}</td>
                <td class="py-4 px-6 text-gray-700">${item.api_ownr_email_addr || '-'}</td>
                <td class="py-4 px-6 text-gray-700">${item.due}년</td>
                <td class="py-4 px-6 text-gray-700">${formatDate(item.start_dt)}</td>
                <td class="py-4 px-6 ${remainingDaysClass}">${remainingDays}일</td>
                <td class="py-4 px-6">
                    <button class="text-blue-600 hover:text-blue-800 font-medium" onclick="sendNotification('${item.cd}')">
                        보내기
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    // 페이지네이션 렌더링
    renderPagination(paginationDiv, currentPage, totalPages, renderApiKeyMngrTable);
}

/**
 * 비정상 API 키 관리 테이블 렌더링
 */
function renderAbnormalApiKeyMngrTable() {
    const tableBody = document.getElementById('abnormal-api-key-mngr-table-body');
    
    // 비정상 상태의 API 키 관리 데이터 가져오기
    const abnormalData = apiKeyMngrData.getAbnormalApiKeyMngrData();
    
    // 테이블 렌더링
    tableBody.innerHTML = '';
    if (abnormalData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 px-6 text-center text-gray-500">
                    비정상 API 키 관리 데이터가 없습니다.
                </td>
            </tr>
        `;
    } else {
        abnormalData.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition';
            
            row.innerHTML = `
                <td class="py-4 px-6 font-medium text-gray-800">${item.cd}</td>
                <td class="py-4 px-6 font-mono text-gray-500">${item.api_key || '없음'}</td>
                <td class="py-4 px-6 text-gray-700">${item.api_ownr_email_addr || '-'}</td>
                <td class="py-4 px-6 text-gray-700">${item.due}년</td>
                <td class="py-4 px-6 text-gray-700">${formatDate(item.start_dt)}</td>
                <td class="py-4 px-6 text-red-600 font-medium">${item.days_remaining}일</td>
                <td class="py-4 px-6">
                    <button class="text-blue-600 hover:text-blue-800 font-medium" onclick="sendNotification('${item.cd}')">
                        보내기
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }
}

/**
 * 기간 차트 렌더링
 */
function renderApiKeyExpiryChart() {
    const chartContainer = document.getElementById('api-key-expiry-chart');
    
    // API 키 관리 데이터 가져오기
    const data = apiKeyMngrData.getApiKeyMngrData();
    
    // 차트 렌더링
    chartContainer.innerHTML = '';
    if (data.length === 0) {
        chartContainer.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                기간 차트 데이터가 없습니다.
            </div>
        `;
    } else {
        data.forEach(item => {
            const chartItem = document.createElement('div');
            chartItem.className = 'bg-gray-50 rounded-2xl p-6 border border-gray-200 transition hover:border-gray-300';
            
            const startDate = new Date(item.start_dt);
            const expiryDate = new Date(item.start_dt);
            expiryDate.setFullYear(expiryDate.getFullYear() + item.due);
            
            const totalDays = (expiryDate - startDate) / (1000 * 60 * 60 * 24);
            const remainingDays = item.days_remaining;
            const progress = ((totalDays - remainingDays) / totalDays) * 100;
            
            const isExpiringSoon = remainingDays <= 30;
            const chartColor = isExpiringSoon ? 'bg-red-500' : 'bg-green-500';
            
            chartItem.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-4">
                        <div class="font-bold text-gray-800 text-lg">${item.cd}</div>
                        <div class="text-sm text-gray-600">
                            ${formatDate(item.start_dt)} ~ ${formatDate(item.expiry_dt)}
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-sm font-medium text-gray-700">${remainingDays}일 남음</div>
                        <div class="text-xs text-gray-500">${item.due}년 유효</div>
                    </div>
                </div>
                
                <div class="relative h-6 bg-gray-200 rounded-lg overflow-hidden">
                    <div 
                        class="absolute top-0 left-0 h-full ${chartColor} transition-all duration-500 ease-out"
                        style="width: ${progress}%"
                    ></div>
                    <div class="absolute top-0 left-0 h-full w-full flex items-center justify-end px-3">
                        <span class="text-xs font-semibold text-white">${Math.round(progress)}%</span>
                    </div>
                </div>
                
                <div class="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${isExpiringSoon ? 'bg-red-500' : 'bg-green-500'}"></div>
                        <span>${isExpiringSoon ? '1개월 이내 유효' : '1개월 이상 유효'}</span>
                    </div>
                    <div>API 키: <span class="font-mono">${item.api_key || '없음'}</span></div>
                </div>
            `;
            
            chartContainer.appendChild(chartItem);
        });
    }
}

/**
 * 페이지네이션 렌더링
 */
function renderPagination(container, currentPage, totalPages, renderFunction) {
    container.innerHTML = '';
    
    // 이전 페이지 버튼
    const prevButton = document.createElement('button');
    prevButton.className = `px-3 py-1 rounded-lg text-sm font-medium ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`;
    prevButton.innerHTML = '이전';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            localStorage.setItem('apiKeyMngrPage', currentPage - 1);
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
        pageButton.className = `px-3 py-1 rounded-lg text-sm font-medium ${i === currentPage ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`;
        pageButton.textContent = i;
        pageButton.onclick = () => {
            localStorage.setItem('apiKeyMngrPage', i);
            renderFunction();
        };
        container.appendChild(pageButton);
    }
    
    // 다음 페이지 버튼
    const nextButton = document.createElement('button');
    nextButton.className = `px-3 py-1 rounded-lg text-sm font-medium ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`;
    nextButton.innerHTML = '다음';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            localStorage.setItem('apiKeyMngrPage', currentPage + 1);
            renderFunction();
        }
    };
    container.appendChild(nextButton);
}

/**
 * 날짜 포맷팅
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 알림 메일 전송
 */
function sendNotification(cd) {
    // 여기서 알림 메일 전송 로직 구현
    alert(`알림 메일이 전송되었습니다. (CD: ${cd})`);
}

/**
 * 로딩 표시
 */
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

/**
 * 로딩 숨기기
 */
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

/**
 * CD 업데이트 버튼 이벤트
 */
async function handleUpdateCdButton() {
    showLoading();
    try {
        const success = await apiKeyMngrData.updateCdFromMngrSett();
        if (success) {
            alert('CD 업데이트가 성공적으로 완료되었습니다.');
            renderApiKeyMngrTable();
            renderAbnormalApiKeyMngrTable();
            renderApiKeyExpiryChart();
        } else {
            alert('CD 업데이트에 실패했습니다.');
        }
    } catch (error) {
        console.error('CD 업데이트 오류:', error);
        alert('CD 업데이트 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

/**
 * 페이지 로드 이벤트
 */
async function handlePageLoad() {
    showLoading();
    try {
        const success = await apiKeyMngrData.loadApiKeyMngrData();
        if (success) {
            renderApiKeyMngrTable();
            renderAbnormalApiKeyMngrTable();
            renderApiKeyExpiryChart();
        } else {
            alert('API 키 관리 데이터 로드에 실패했습니다.');
        }
    } catch (error) {
        console.error('API 키 관리 데이터 로드 오류:', error);
        alert('API 키 관리 데이터 로드 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

/**
 * 탭 클릭 이벤트
 */
function handleTabClick(tabIndex) {
    // 탭 버튼 상태 업데이트
    document.querySelectorAll('.tab-btn').forEach((btn, index) => {
        if (index === tabIndex) {
            btn.classList.add('active', 'bg-blue-50', 'text-blue-600');
            btn.classList.remove('text-gray-600');
        } else {
            btn.classList.remove('active', 'bg-blue-50', 'text-blue-600');
            btn.classList.add('text-gray-600');
        }
    });
    
    // 탭 내용 표시 업데이트
    document.querySelectorAll('.tab-content').forEach((content, index) => {
        content.classList.toggle('hidden', index !== tabIndex);
    });
    
    // 탭 1(기간 차트)일 때 차트 다시 렌더링
    if (tabIndex === 1) {
        renderApiKeyExpiryChart();
    }
}

/**
 * API 키 관리 데이터 업데이트 이벤트
 */
async function handleUpdateApiKeyMngr(cd, due, start_dt, api_ownr_email_addr) {
    try {
        const success = await apiKeyMngrData.updateApiKeyMngr(cd, due, start_dt, api_ownr_email_addr);
        if (success) {
            alert('API 키 관리 데이터가 성공적으로 업데이트되었습니다.');
            renderApiKeyMngrTable();
            renderAbnormalApiKeyMngrTable();
            renderApiKeyExpiryChart();
        } else {
            alert('API 키 관리 데이터 업데이트에 실패했습니다.');
        }
    } catch (error) {
        console.error('API 키 관리 데이터 업데이트 오류:', error);
        alert('API 키 관리 데이터 업데이트 중 오류가 발생했습니다.');
    }
}

// 모듈 내보내기
export {
    renderApiKeyMngrTable,
    renderAbnormalApiKeyMngrTable,
    renderApiKeyExpiryChart,
    sendNotification,
    showLoading,
    hideLoading,
    handleUpdateCdButton,
    handlePageLoad,
    handleTabClick,
    handleUpdateApiKeyMngr
};