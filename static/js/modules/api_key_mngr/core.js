/**
 * API 키 관리 페이지의 Core 모듈
 * - 초기화, 유틸리티, 공통 함수, 탭 네비게이션
 */

window.ApiKeyMngrUI = window.ApiKeyMngrUI || {};

// ==========================================
// 공통 속성
// ==========================================
window.ApiKeyMngrUI.currentFilter = 'all';
window.ApiKeyMngrUI.riskMailFilter = 'all';
window.ApiKeyMngrUI.currentPage = 1;
window.ApiKeyMngrUI.itemsPerPage = 10;
window.ApiKeyMngrUI.mailSendHistoryPage = 1;
window.ApiKeyMngrUI.mailSendHistoryPageSize = 50;
window.ApiKeyMngrUI.mailSendHistoryFilters = {};
window.ApiKeyMngrUI.previewSampleData = null;

// ==========================================
// 유틸리티 함수
// ==========================================

/**
 * 페이지당 수량 가져오기
 */
window.ApiKeyMngrUI.getPageSize = function() {
    const select = document.getElementById('page-size-select');
    return select ? parseInt(select.value) : 10;
};

/**
 * 위험군 페이지당 수량 가져오기
 */
window.ApiKeyMngrUI.getRiskPageSize = function() {
    const select = document.getElementById('risk-page-size-select');
    return select ? parseInt(select.value) : 10;
};

/**
 * 날짜 포맷팅
 */
window.ApiKeyMngrUI.formatDate = function(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * 로딩 표시
 */
window.ApiKeyMngrUI.showLoading = function(show) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        if (show) {
            loadingElement.classList.remove('hidden');
        } else {
            loadingElement.classList.add('hidden');
        }
    }
};

/**
 * 로딩 숨기기
 */
window.ApiKeyMngrUI.hideLoading = function() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
};

/**
 * 성공 메시지 표시
 */
window.ApiKeyMngrUI.showSuccessMessage = function(message) {
    alert(message);
};

/**
 * 오류 메시지 표시
 */
window.ApiKeyMngrUI.showErrorMessage = function(message) {
    alert(message);
};

/**
 * 조사 처리 (이/가)
 */
window.ApiKeyMngrUI.getParticle = function(word, particle) {
    if (!word) return '';
    const lastChar = word.charCodeAt(word.length - 1);
    const hasJongseong = (lastChar - 0xAC00) % 28 !== 0;
    if (particle === 'iga') {
        return hasJongseong ? '이' : '가';
    }
    return '';
};

// ==========================================
// 탭 네비게이션
// ==========================================

/**
 * 탭 전환 이벤트 (mngr_sett와 동일한 구조)
 */
window.ApiKeyMngrUI.setupTabNavigation = function() {
    const tabs = document.querySelectorAll('#api_key_mngr_page .tab-button');
    const tabContents = document.querySelectorAll('#api_key_mngr_page .tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = tab.dataset.tab;

            // 모든 탭과 내용 숨기기
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // 선택된 탭 활성화
            tab.classList.add('active');
            const contentId = `content${tabId}`;
            const content = document.getElementById(contentId);
            if (content) {
                content.classList.add('active');
            }

            // 탭에 따라 데이터 로드
            if (tabId === '1') {
                console.log('기간 차트 탭 선택');
                window.ApiKeyMngrUI.loadApiKeyExpiryInfo();
            } else if (tabId === '2') {
                console.log('위험군 탭 선택');
                // 필터 버튼 초기 상태 설정
                window.ApiKeyMngrUI.riskMailFilter = 'all';
                document.querySelectorAll('.risk-mail-filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.filter === 'all') {
                        btn.classList.add('active');
                    }
                });
                window.ApiKeyMngrUI.renderRiskApiKeyMngrTable();
            } else if (tabId === '3') {
                console.log('설정 탭 선택');
                window.ApiKeyMngrUI.loadMailSettings();
                window.ApiKeyMngrUI.loadEventLog();
                window.ApiKeyMngrUI.loadScheduleSettings();
            }
        });
    });
};

/**
 * API 키 관리 탭 내부 탭 전환 이벤트
 */
window.ApiKeyMngrUI.setupApiTabNavigation = function() {
    const apiTabs = document.querySelectorAll('.api-tab-btn');
    const normalContainer = document.getElementById('normal-api-table-container');
    const abnormalContainer = document.getElementById('abnormal-api-table-container');

    apiTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const apiTab = tab.dataset.apiTab;

            // 모든 API 탭 버튼 상태 초기화
            apiTabs.forEach(t => {
                t.classList.remove('active');
            });

            // 선택된 API 탭 활성화
            tab.classList.add('active');

            // 테이블 컨테이너 표시/숨기기
            if (apiTab === 'normal') {
                normalContainer.classList.remove('hidden');
                abnormalContainer.classList.add('hidden');
                window.ApiKeyMngrUI.renderApiKeyMngrTable();
            } else if (apiTab === 'abnormal') {
                normalContainer.classList.add('hidden');
                abnormalContainer.classList.remove('hidden');
                window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable();
            }
        });
    });
};

/**
 * 설정 서브 탭 전환 이벤트
 */
window.ApiKeyMngrUI.setupSettingTabNavigation = function() {
    const settingTabs = document.querySelectorAll('.setting-tab-btn');
    const settingContents = document.querySelectorAll('.setting-tab-content');

    settingTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const settingTabId = tab.dataset.settingTab;

            // 모든 탭 버튼 비활성화
            settingTabs.forEach(t => {
                t.classList.remove('active');
                t.classList.remove('border-blue-600', 'text-blue-600');
                t.classList.add('border-transparent', 'text-gray-500');
            });

            // 모든 콘텐츠 숨기기
            settingContents.forEach(c => c.classList.add('hidden'));

            // 선택된 탭 활성화
            tab.classList.add('active');
            tab.classList.add('border-blue-600', 'text-blue-600');
            tab.classList.remove('border-transparent', 'text-gray-500');

            // 선택된 콘텐츠 표시
            const contentId = `setting-${settingTabId}`;
            const content = document.getElementById(contentId);
            if (content) {
                content.classList.remove('hidden');
            }

            // 스케줄 탭 선택 시 데이터 로드
            if (settingTabId === 'schedule') {
                window.ApiKeyMngrUI.loadScheduleSettings();
                window.ApiKeyMngrUI.loadMailSendHistory();
            }
        });
    });
};

// ==========================================
// 이벤트 리스너 설정
// ==========================================

/**
 * 페이지당 수량 선택 이벤트
 */
window.ApiKeyMngrUI.setupPageSizeSelect = function() {
    const pageSizeSelect = document.getElementById('page-size-select');
    const riskPageSizeSelect = document.getElementById('risk-page-size-select');

    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', () => {
            window.ApiKeyMngrUI.renderApiKeyMngrTable();
            window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable();
        });
    }

    if (riskPageSizeSelect) {
        riskPageSizeSelect.addEventListener('change', () => {
            window.ApiKeyMngrUI.renderRiskApiKeyMngrTable();
        });
    }
};

/**
 * CD 업데이트 버튼 이벤트
 */
window.ApiKeyMngrUI.setupUpdateCdButton = function() {
    const updateCdButton = document.getElementById('update-cd-button');
    if (updateCdButton) {
        updateCdButton.addEventListener('click', async () => {
            window.ApiKeyMngrUI.showLoading(true);
            try {
                const result = await ApiKeyMngrData.updateCdFromMngrSett();
                if (result) {
                    window.ApiKeyMngrUI.showSuccessMessage(`성공적으로 ${result.added_count}개의 CD 값을 추가했습니다.`);
                    // 데이터 다시 로드
                    await window.ApiKeyMngrUI.handlePageLoad();
                } else {
                    window.ApiKeyMngrUI.showErrorMessage('CD 업데이트에 실패했습니다.');
                }
            } catch (error) {
                window.ApiKeyMngrUI.showErrorMessage('CD 업데이트 중 오류가 발생했습니다.');
            } finally {
                window.ApiKeyMngrUI.hideLoading();
            }
        });
    }
};

/**
 * 스케줄 정보 업데이트 이벤트 바인딩
 */
window.ApiKeyMngrUI.setupScheduleInfoUpdate = function() {
    // 30일 전 스케줄
    const schd30Cycle = document.getElementById('schd_30_cycle');
    const schd30Hour = document.getElementById('schd_30_hour');
    if (schd30Cycle && schd30Hour) {
        schd30Cycle.addEventListener('change', () => window.ApiKeyMngrUI.updateScheduleInfo('30'));
        schd30Hour.addEventListener('change', () => window.ApiKeyMngrUI.updateScheduleInfo('30'));
    }

    // 7일 전 스케줄
    const schd7Cycle = document.getElementById('schd_7_cycle');
    const schd7Hour = document.getElementById('schd_7_hour');
    if (schd7Cycle && schd7Hour) {
        schd7Cycle.addEventListener('change', () => window.ApiKeyMngrUI.updateScheduleInfo('7'));
        schd7Hour.addEventListener('change', () => window.ApiKeyMngrUI.updateScheduleInfo('7'));
    }

    // 당일 스케줄
    const schd0Cycle = document.getElementById('schd_0_cycle');
    const schd0Hour = document.getElementById('schd_0_hour');
    if (schd0Cycle && schd0Hour) {
        schd0Cycle.addEventListener('change', () => window.ApiKeyMngrUI.updateScheduleInfo('0'));
        schd0Hour.addEventListener('change', () => window.ApiKeyMngrUI.updateScheduleInfo('0'));
    }
};

/**
 * Gantt 이벤트 리스너 설정
 */
window.ApiKeyMngrUI.setupGanttEventListeners = function() {
    document.addEventListener('mousemove', e => {
        const tip = document.getElementById('tooltip');
        if (tip && tip.style.display !== 'none') {
            window.ApiKeyMngrUI.moveTip(e);
        }
    });
};

// ==========================================
// 페이지 초기화
// ==========================================

/**
 * 페이지 로드 이벤트
 */
window.ApiKeyMngrUI.handlePageLoad = async function() {
    window.ApiKeyMngrUI.showLoading(true);
    try {
        const success = await ApiKeyMngrData.loadApiKeyMngrData();
        if (success) {
            window.ApiKeyMngrUI.renderApiKeyMngrTable();
            window.ApiKeyMngrUI.renderAbnormalApiKeyMngrTable();
            window.ApiKeyMngrUI.renderApiKeyExpiryChart();
        } else {
            alert('API 키 관리 데이터 로드에 실패했습니다.');
        }
    } catch (error) {
        console.error('API 키 관리 데이터 로드 오류:', error);
        alert('API 키 관리 데이터 로드 중 오류가 발생했습니다.');
    } finally {
        window.ApiKeyMngrUI.hideLoading();
    }
};

/**
 * API 키 유통기한 정보 로드
 */
window.ApiKeyMngrUI.loadApiKeyExpiryInfo = function() {
    window.ApiKeyMngrUI.showLoading(true);
    try {
        // 기존 데이터를 사용하여 Gantt 차트 렌더링
        window.ApiKeyMngrUI.renderGanttChart();
    } catch (error) {
        console.error('API 키 유통기한 정보 조회 실패:', error);
        window.ApiKeyMngrUI.showErrorMessage('API 키 유통기한 정보를 불러오는 데 실패했습니다.');
    } finally {
        window.ApiKeyMngrUI.hideLoading();
    }
};

/**
 * 스케줄 정보 업데이트
 */
window.ApiKeyMngrUI.updateScheduleInfo = function(type) {
    const cycle = document.getElementById(`schd_${type}_cycle`)?.value || '1';
    const hour = document.getElementById(`schd_${type}_hour`)?.value || '0';
    const infoEl = document.getElementById(`schd_${type}_info`);
    
    if (infoEl) {
        const hourStr = hour.padStart(2, '0');
        infoEl.textContent = `[${cycle}]일 [${hourStr}]시`;
    }
};

/**
 * 페이지 초기화
 */
window.ApiKeyMngrUI.init = function() {
    // 초기 데이터 로드
    window.ApiKeyMngrUI.handlePageLoad();

    // 탭 전환 이벤트
    window.ApiKeyMngrUI.setupTabNavigation();

    // API 키 관리 탭 내부 탭 전환 이벤트
    window.ApiKeyMngrUI.setupApiTabNavigation();

    // 설정 서브 탭 전환 이벤트
    window.ApiKeyMngrUI.setupSettingTabNavigation();

    // CD 업데이트 버튼 이벤트
    window.ApiKeyMngrUI.setupUpdateCdButton();

    // 페이지당 수량 선택 이벤트
    window.ApiKeyMngrUI.setupPageSizeSelect();

    // 스케줄 정보 업데이트 이벤트 바인딩
    window.ApiKeyMngrUI.setupScheduleInfoUpdate();
};