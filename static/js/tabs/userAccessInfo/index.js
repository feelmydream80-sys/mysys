/**
 * 사용자접속정보 메인 모듈
 * Tab content module for user access information management
 * 실제 API 연동 버전
 */

import { config } from './config.js';
import statusManager from './statusManager.js';
import userListRenderer, { setThresholds } from './userList.js';
import { getKSTNow, getLast6Months } from '../../modules/common/dateUtils.js';

// Chart.js가 로드되어 있는지 확인
function ensureChartJS() {
    return new Promise((resolve, reject) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }
        
        // Chart.js 로드
        const script = document.createElement('script');
        script.src = '/static/vendor/js/chart.umd.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
    });
}

class UserAccessInfo {
    constructor() {
        this.isInitialized = false;
        this.chartInst = null;
        this.hourChartInst = null;
        this.weeklyChartInst = null;
        this.currentUser = null;
        this.currentMode = 'all';
        this.chartType = 'heatmap'; // 'heatmap' 또는 'line'
        this.userListRenderer = userListRenderer; // 외부에서 접근 가능하도록
    }

    // 차트 타입 설정 (히트맵 vs 선차트) - 전역 적용
    setChartType(type) {
        this.chartType = type;
        // init 완료 후에만 userListRenderer의 차트 타입 동기화 (중복 렌더링 방지)
        if (this.isInitialized && this.userListRenderer) {
            this.userListRenderer.setChartType(type);
        }
        this.updateChartTypeButtons(type);
        // 현재 사용자가 있으면 차트 다시 렌더링
        if (this.currentUser) {
            this.renderWeeklyChart(this.currentUser);
        }
    }

    updateChartTypeButtons(type) {
        // 목록 뷰 버튼 업데이트
        const listBtnHeatmap = document.getElementById('btn-chart-heatmap');
        const listBtnLine = document.getElementById('btn-chart-line');
        if (listBtnHeatmap && listBtnLine) {
            if (type === 'heatmap') {
                listBtnHeatmap.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 11px; cursor: pointer;';
                listBtnLine.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 11px; cursor: pointer;';
            } else {
                listBtnHeatmap.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 11px; cursor: pointer;';
                listBtnLine.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 11px; cursor: pointer;';
            }
        }

        // 상세 뷰 버튼 업데이트
        const detailBtnHeatmap = document.getElementById('ua-chart-type-heatmap');
        const detailBtnLine = document.getElementById('ua-chart-type-line');
        if (detailBtnHeatmap && detailBtnLine) {
            if (type === 'heatmap') {
                detailBtnHeatmap.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 11px; cursor: pointer;';
                detailBtnLine.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 11px; cursor: pointer;';
            } else {
                detailBtnHeatmap.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 11px; cursor: pointer;';
                detailBtnLine.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 11px; cursor: pointer;';
            }
        }
    }

    async init() {
        if (this.isInitialized) return;

        try {
            await ensureChartJS();
        } catch (e) {
        }

        await statusManager.loadThresholds();
        setThresholds(statusManager.thresholds);
        this.updateThresholdInputs();
        this.updateMonthHeaders();
        this.setupEventListeners();
        this.updateChartTypeButtons(this.chartType);

        this.isInitialized = true;
    }

    // Promise 기반 파이프라인: 중복 호출 방지
    async pipeline() {
        if (this._pipelinePromise) {
            return this._pipelinePromise;
        }

        this._pipelinePromise = this._executePipeline();
        
        try {
            return await this._pipelinePromise;
        } finally {
            this._pipelinePromise = null;
        }
    }

    async _executePipeline() {
        // 순차 실행: 초기화 → 데이터 로드 → 렌더링 → 애니메이션
        if (!this.isInitialized) {
            await this.init();
        } else {
            // 이미 초기화됨: 헤더 업데이트 후 forceReload로 데이터 갱신
            this.updateMonthHeaders();
            this.updateThresholdInputs();
            await userListRenderer.render(1, null, null, true);
        }
    }

    updateMonthHeaders() {
        const monthLabels = getLast6Months(6);

        document.querySelectorAll('.month-header-col').forEach((th, idx) => {
            if (th && monthLabels[idx]) {
                th.textContent = monthLabels[idx];
            }
        });
    }

    setupEventListeners() {
        // 검색 입력
        const searchInput = document.getElementById('userAccessSearchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.refresh(1, null, e.target.value);
                }, config.debounceDelay);
            });
        }

        // 페이지 크기 선택
        const pageSizeSelect = document.getElementById('userAccessItemsPerPage');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.refresh(1, parseInt(e.target.value));
            });
        }
    }

    applyFilter(mode) {
        const days = parseInt(document.getElementById('day-input')?.value || 0);
        userListRenderer.setFilter(mode, days);
        this.updateFilterButtons(mode);
    }

    updateFilterButtons(mode) {
        const btnAll = document.getElementById('btn-filter-all');
        const btnNone = document.getElementById('btn-filter-none');
        if (btnAll && btnNone) {
            // 높이 32px로 통일
            btnAll.style.cssText = mode === 'all' 
                ? 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 12px; cursor: pointer;'
                : 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.16); background: white; color: #666; font-size: 12px; cursor: pointer;';
            
            btnNone.style.cssText = mode === 'none'
                ? 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 12px; cursor: pointer;'
                : 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.16); background: white; color: #666; font-size: 12px; cursor: pointer;';
        }
    }

    // 히트맵 모드 설정 (중복 포함 / 1일 1접속)
    async setMode(mode) {
        // 모드 변경 시 데이터 다시 로드
        await userListRenderer.setMode(mode);
        this.updateModeButtons(mode);
    }

    updateModeButtons(mode) {
        const btnAll = document.getElementById('btn-mode-all');
        const btnDistinct = document.getElementById('btn-mode-distinct');
        if (btnAll && btnDistinct) {
            if (mode === 'all') {
                btnAll.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 11px; cursor: pointer;';
                btnDistinct.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 11px; cursor: pointer;';
            } else {
                btnAll.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 11px; cursor: pointer;';
                btnDistinct.style.cssText = 'padding: 4px 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 11px; cursor: pointer;';
            }
        }
    }

    async refresh(page = 1, pageSize = null, searchTerm = null, forceReload = false) {
        const ps = pageSize || parseInt(document.getElementById('userAccessItemsPerPage')?.value || 10);
        const term = searchTerm !== null ? searchTerm : (document.getElementById('userAccessSearchInput')?.value || '');

        await userListRenderer.render(page, ps, term, 'none', 0, forceReload);
    }

    updateThresholdInputs() {
        const thresholds = statusManager.thresholds;

        const cd991Input = document.getElementById('cd991Threshold');
        const cd992Input = document.getElementById('cd992Threshold');
        const cd993Input = document.getElementById('cd993Threshold');

        if (cd991Input) cd991Input.value = thresholds.cd991;
        if (cd992Input) cd992Input.value = thresholds.cd992;
        if (cd993Input) cd993Input.value = thresholds.cd993;
    }

    async saveThresholds() {
        const newThresholds = {
            cd991: parseInt(document.getElementById('cd991Threshold')?.value || 30),
            cd992: parseInt(document.getElementById('cd992Threshold')?.value || 7),
            cd993: parseInt(document.getElementById('cd993Threshold')?.value || 90)
        };

        const success = await statusManager.saveThresholds(newThresholds);

        if (success) {
            this.showMessage('임계값이 저장되었습니다.', 'success');
        } else {
            this.showMessage('임계값 저장에 실패했습니다.', 'error');
        }

        return success;
    }

    // 상세 패널 표시
    async showDetail(userId) {
        try {
            // 현재 모드 가져오기
            const mode = userListRenderer.mode || 'all';
            
            // API에서 사용자 상세 정보 가져오기 (mode 파라미터 추가)
            const response = await fetch(`/api/analytics/statistics/user-detail/${userId}?mode=${mode}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user detail');
            }
            
            const user = await response.json();
            this.currentUser = user;
            this.currentMode = mode;

            // 목록 숨기고 상세 패널 표시
            const tableContainer = document.querySelector('#userAccessInfo .table-responsive');
            const pagination = document.getElementById('userAccessPagination');
            const detailPanel = document.getElementById('userAccessDetailPanel');
            const toolbar = document.querySelector('#userAccessInfo > div:nth-child(3)'); // 검색/필터 툴 바
            const settingsSection = document.querySelector('#userAccessInfo > div:nth-child(4)'); // 상태 설정 섹션

            if (tableContainer) tableContainer.style.display = 'none';
            if (pagination) pagination.style.display = 'none';
            if (toolbar) toolbar.style.display = 'none';
            if (settingsSection) settingsSection.style.display = 'none';
            if (detailPanel) detailPanel.style.display = 'block';

            // 사용자 정보 채우기
            document.getElementById('ua-avatar').textContent = user.initials || user.user_id.substring(0, 2).toUpperCase();
            document.getElementById('ua-user-id').textContent = user.user_id;

            const st = user.status_info;
            const badge = document.getElementById('ua-badge');
            badge.textContent = st.label;
            badge.style.cssText = `display:inline-block;padding:2px 8px;border-radius:20px;font-size:12px;font-weight:500;background:${st.cls === 'b-green' ? '#f0fdf4;color:#166534' : st.cls === 'b-amber' ? '#fffbeb;color:#92400e' : st.cls === 'b-red' ? '#fef2f2;color:#991b1b' : '#f4f4f4;color:#6b7280'}`;

            // 날짜 계산
            const daysAgo = user.last_acs_dt ? 
                Math.floor((new Date() - new Date(user.last_acs_dt)) / (1000 * 60 * 60 * 24)) : 
                999;
            const daLabel = daysAgo === 0 ? '오늘' : daysAgo === 1 ? '어제' : daysAgo < 0 ? '오늘' : daysAgo + '일 전';
            
            document.getElementById('ua-meta').textContent = 
                `마지막 접속: ${user.last_acs_dt || '-'} (${daLabel}) · 누적 접속: ${(user.total || 0).toLocaleString()}회 · 연속 접속: ${user.streak || 0}일`;

            // 통계 값
            document.getElementById('ua-monthly').textContent = (user.monthly || 0) + '회';
            const md = (user.monthly || 0) - (user.monthlyPrev || 0);
            document.getElementById('ua-monthly-sub').innerHTML = 
                `<span style="color:${md >= 0 ? '#16a34a' : '#dc2626'}">${md >= 0 ? '↑' : '↓'} ${Math.abs(md)}회 vs 지난달</span>`;

            document.getElementById('ua-weekly').textContent = (user.weekly || 0) + '회';
            const wd = (user.weekly || 0) - (user.weeklyPrev || 0);
            document.getElementById('ua-weekly-sub').innerHTML = 
                `<span style="color:${wd >= 0 ? '#16a34a' : '#dc2626'}">${wd >= 0 ? '↑' : '↓'} ${Math.abs(wd)}회 vs 지난주</span>`;

            document.getElementById('ua-total').textContent = (user.total || 0).toLocaleString() + '회';
            document.getElementById('ua-streak').textContent = (user.streak || 0) + '일';

            // 차트 렌더링
            this.renderCharts(user);
        } catch (e) {
            this.showMessage('사용자 상세 정보 로드에 실패했습니다.', 'error');
        }
    }

    // 목록으로 돌아가기
    showList() {
        const tableContainer = document.querySelector('#userAccessInfo .table-responsive');
        const pagination = document.getElementById('userAccessPagination');
        const detailPanel = document.getElementById('userAccessDetailPanel');
        const toolbar = document.querySelector('#userAccessInfo > div:nth-child(3)');
        const settingsSection = document.querySelector('#userAccessInfo > div:nth-child(4)');

        if (tableContainer) tableContainer.style.display = 'block';
        if (pagination) pagination.style.display = 'flex';
        if (toolbar) toolbar.style.display = 'flex';
        if (settingsSection) settingsSection.style.display = 'block';
        if (detailPanel) detailPanel.style.display = 'none';

        // 차트 정리
        if (this.chartInst) {
            this.chartInst.destroy();
            this.chartInst = null;
        }
        if (this.hourChartInst) {
            this.hourChartInst.destroy();
            this.hourChartInst = null;
        }
        if (this.weeklyChartInst) {
            this.weeklyChartInst.destroy();
            this.weeklyChartInst = null;
        }
    }

    renderCharts(user) {
        this.renderWeeklyChart(user);
        
        this.updateChartTypeButtons(this.chartType);
        if (typeof Chart === 'undefined') {
            return;
        }

        if (this.chartInst) {
            this.chartInst.destroy();
            this.chartInst = null;
        }
        if (this.hourChartInst) {
            this.hourChartInst.destroy();
            this.hourChartInst = null;
        }

        const tcol = 'rgba(0,0,0,0.35)', gcol = 'rgba(0,0,0,0.06)';
        const baseOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: tcol, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
                y: { ticks: { color: tcol, font: { size: 11 } }, grid: { color: gcol }, border: { display: false } }
            }
        };

        // 최근 6개월 라벨 동적 생성 (KST 기준) - YY.M 형식
        const months = getLast6Months(6);

        // 월별 접속 추이 차트
        const chartCanvas = document.getElementById('ua-chart');
        if (chartCanvas) {
            this.chartInst = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{ 
                        label: '접속', 
                        data: user.monthlyData || [0, 0, 0, 0, 0, 0], 
                        backgroundColor: '#3b82f6', 
                        borderRadius: 4, 
                        borderSkipped: false 
                    }]
                },
                options: { ...baseOpts }
            });
        }

        // 시간대별 분포 차트
        const hourCanvas = document.getElementById('ua-hour-chart');
        if (hourCanvas) {
            const hourLabels = Array.from({ length: 24 }, (_, i) => i % 6 === 0 ? i + '시' : '');
            this.hourChartInst = new Chart(hourCanvas, {
                type: 'bar',
                data: {
                    labels: hourLabels,
                    datasets: [{ 
                        label: '접속', 
                        data: user.hourData || Array(24).fill(0), 
                        backgroundColor: '#93c5fd', 
                        borderRadius: 3, 
                        borderSkipped: false 
                    }]
                },
                options: { ...baseOpts }
            });
        }
    }

    renderWeeklyChart(user) {
        if (typeof Chart === 'undefined') {
            return;
        }

        if (this.weeklyChartInst) {
            this.weeklyChartInst.destroy();
            this.weeklyChartInst = null;
        }

        const weeklyCanvas = document.getElementById('ua-weekly-chart');
        if (!weeklyCanvas) return;

        // hm 데이터가 32개 (26주 + 6개 구분자)인 경우 처리
        let weeklyData = [];
        let weekLabels = [];
        
        if (user.hm && Array.isArray(user.hm)) {
            // hm 데이터에서 주간 데이터 추출 (null 값은 구분자로 skip)
            user.hm.forEach((value, idx) => {
                if (value !== null) {
                    weeklyData.push(value);
                    weekLabels.push(`${idx + 1}주`);
                }
            });
        }

        // 데이터가 없으면 기본값
        if (weeklyData.length === 0) {
            weeklyData = Array(26).fill(0);
            weekLabels = Array.from({ length: 26 }, (_, i) => `${i + 1}주`);
        }

        const tcol = 'rgba(0,0,0,0.35)', gcol = 'rgba(0,0,0,0.06)';

        if (this.chartType === 'heatmap') {
            // 히트맵 스타일 차트 (수평 막대로 히트맵 효과)
            const backgroundColors = weeklyData.map(val => {
                if (this.currentMode === 'distinct') {
                    if (val === 0) return '#f3f4f6';
                    if (val === 1) return '#dbeafe';
                    if (val === 2) return '#93c5fd';
                    if (val === 3) return '#3b82f6';
                    return '#1e40af';
                } else {
                    if (val === 0) return '#f3f4f6';
                    if (val <= 10) return '#dbeafe';
                    if (val <= 30) return '#93c5fd';
                    if (val <= 50) return '#3b82f6';
                    if (val <= 100) return '#1d4ed8';
                    return '#1e40af';
                }
            });

            this.weeklyChartInst = new Chart(weeklyCanvas, {
                type: 'bar',
                data: {
                    labels: weekLabels,
                    datasets: [{
                        label: '접속 횟수',
                        data: weeklyData,
                        backgroundColor: backgroundColors,
                        borderRadius: 2,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (items) => items[0].label,
                                label: (item) => `${item.raw}회 접속`
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: false
                        },
                        y: {
                            ticks: { color: tcol, font: { size: 9 } },
                            grid: { color: gcol },
                            border: { display: false }
                        }
                    }
                }
            });
        } else {
            // 선차트 (line)
            this.weeklyChartInst = new Chart(weeklyCanvas, {
                type: 'line',
                data: {
                    labels: weekLabels,
                    datasets: [{
                        label: '접속 횟수',
                        data: weeklyData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        pointRadius: 3,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (items) => items[0].label,
                                label: (item) => `${item.raw}회 접속`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { 
                                color: tcol, 
                                font: { size: 9 },
                                maxRotation: 0,
                                autoSkip: true,
                                maxTicksLimit: 13
                            },
                            grid: { display: false },
                            border: { display: false }
                        },
                        y: {
                            ticks: { color: tcol, font: { size: 11 } },
                            grid: { color: gcol },
                            border: { display: false },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    showMessage(message, type = 'info') {
        // 기존 메시지가 있으면 제거
        const existing = document.getElementById('userAccessMessage');
        if (existing) existing.remove();

        // 새 메시지 생성
        const messageEl = document.createElement('div');
        messageEl.id = 'userAccessMessage';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
            ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
            ${type === 'info' ? 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;' : ''}
        `;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        // 3초 후 자동 제거
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }
}

// Singleton instance
const userAccessInfo = new UserAccessInfo();

// 전역에서 접근 가능하도록 등록
window.userAccessInfo = userAccessInfo;

// Promise 기반 파이프라인: 중복 호출 방지
function setupTabHandlers() {
    const tabButtons = document.querySelectorAll('.tab-button[data-tab="userAccessInfo"]');
    if (tabButtons.length > 0) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                // 파이프라인 실행: 탭 활성화 시 한 번만 데이터 로드
                await userAccessInfo.pipeline();
            });
        });
    }
}

// DOM 준비 상태 확인 후 핸들러 설정
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupTabHandlers);
} else {
    setupTabHandlers();
}

export default userAccessInfo;