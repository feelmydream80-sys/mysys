/**
 * 사용자 목록 렌더러
 * 실제 API 연동 버전 - 월별 히트맵 지원
 */

import { config } from './config.js';
import statusManager from './statusManager.js';
import { formatDBDateTime, getLast6Months, getWeeksPerMonthFn } from '../../modules/common/dateUtils.js';

// 히트맵 색상 계산 (모드별 다른 기준)
function hmColor(value, mode = 'all') {
    if (!value) return '#f3f4f6'; // 0회: 회색
    
    if (mode === 'distinct') {
        // 1일 1접속 모드: 1-5회 기준
        if (value === 1) return '#dbeafe';  // 1회: 연한 파랑
        if (value === 2) return '#93c5fd';  // 2회: 중간 파랑
        if (value === 3) return '#3b82f6';  // 3회: 진한 파랑
        if (value >= 4) return '#1e40af';   // 4-5회: 가장 진한 파랑
    } else {
        // 중복 포함 모드: 1-10, 11-30, 31-50, 51-100, 100+ 기준
        if (value <= 10) return '#dbeafe';   // 1-10회: 연한 파랑
        if (value <= 30) return '#93c5fd';   // 11-30회: 중간 파랑
        if (value <= 50) return '#3b82f6';   // 31-50회: 진한 파랑
        if (value <= 100) return '#1d4ed8';  // 51-100회: 더 진한 파랑
        return '#1e40af';                     // 100회+: 가장 진한 파랑
    }
    return '#f3f4f6';
}

// 날짜 차이 계산
function daysAgo(dateStr) {
    if (!dateStr) return 999;
    const today = new Date();
    const date = new Date(dateStr);
    return Math.floor((today - date) / (1000 * 60 * 60 * 24));
}

// 월 이름 배열
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월'];

// 임계값 저장 (동적 로드)
let dynamicThresholds = { cd991: 30, cd992: 7, cd993: 90 };

export function setThresholds(thresholds) {
    dynamicThresholds = { ...dynamicThresholds, ...thresholds };
}

class UserListRenderer {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.total = 0;
        this.searchTerm = '';
        this.filterMode = 'none';
        this.filterDays = 0;
        this.sortKey = null;
        this.sortDir = 'asc';
        this.users = []; // 사용자 데이터 캐시
        this.mode = 'all'; // 'all' (중복 포함) 또는 'distinct' (1일 1접속)
        this.chartType = 'heatmap'; // 전역 차트 타입 (heatmap 또는 line) - 모든 사용자 동일
    }

    // 전역 차트 타입 설정
    setChartType(chartType) {
        this.chartType = chartType;
        // 전체 테이블 다시 렌더링
        this.renderTable(this.users);
        // 버튼 상태 업데이트
        this.updateChartTypeButtons();
    }

    // 차트 타입 버튼 상태 업데이트
    updateChartTypeButtons() {
        const btnHeatmap = document.getElementById('btn-chart-heatmap');
        const btnLine = document.getElementById('btn-chart-line');
        
        if (btnHeatmap) {
            const isActive = this.chartType === 'heatmap';
            btnHeatmap.style.cssText = isActive 
                ? 'padding: 4px 12px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 12px; cursor: pointer;'
                : 'padding: 4px 12px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 12px; cursor: pointer;';
        }
        
        if (btnLine) {
            const isActive = this.chartType === 'line';
            btnLine.style.cssText = isActive 
                ? 'padding: 4px 12px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 12px; cursor: pointer;'
                : 'padding: 4px 12px; border-radius: 4px; border: 1px solid #ddd; background: #fff; color: #666; font-size: 12px; cursor: pointer;';
        }
    }

    async setMode(mode) {
        this.mode = mode;
        // 모드 변경 시 데이터 다시 로드
        await this.render(this.currentPage, this.pageSize, this.searchTerm, this.filterMode, this.filterDays);
    }

    async render(page = 1, pageSize = 10, searchTerm = '', filterMode = 'none', filterDays = 0) {
        this.currentPage = page;
        this.pageSize = pageSize;
        this.searchTerm = searchTerm;
        this.filterMode = filterMode;
        this.filterDays = filterDays;

        // API에서 사용자 데이터 가져오기
        const data = await this.fetchUsers(page, pageSize, searchTerm);
        this.users = data.items;

        // 필터 적용
        if (filterMode === 'all' && filterDays > 0) {
            this.users = this.users.filter(u => daysAgo(u.last_acs_dt) >= filterDays);
            data.total = this.users.length;
            data.total_pages = Math.ceil(data.total / pageSize);
        }

        this.renderTable(this.users);
        this.renderPagination(data);
        this.updateChartTypeButtons();

        return data;
    }

    async fetchUsers(page, pageSize, searchTerm) {
        try {
            const params = new URLSearchParams({
                page: page,
                page_size: pageSize,
                mode: this.mode  // mode 파라미터 추가
            });
            
            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await fetch(`/api/analytics/statistics/user-list?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 사용자별 주간 데이터(26주)는 이미 API 응답에 포함됨 (backend get_user_list_with_stats에서 주입)
            const usersWithWeeklyData = data.items.map(user => ({
                ...user,
                weekly_data: user.weekly_data || [] // 26주 주간 데이터 (이미 포함됨)
            }));
            
            // API 응답을 프론트엔드 형식으로 변환
            return {
                items: usersWithWeeklyData.map(user => ({
                    user_id: user.user_id,
                    user_nm: user.user_id, // TB_USER에 이름 필드가 없으면 ID 사용
                    acc_sts: user.acc_sts,
                    monthly_counts: user.monthly_counts || [0,0,0,0,0,0], // 6개월 월별 데이터
                    weekly_data: user.weekly_data || [], // 26주 주간 데이터
                    total: user.total_acs_cnt || 0,
                    last_acs_dt: user.last_acs_dt,
                    initials: this._getInitials(user.user_id),
                    status_info: user.status_info || this._calculateStatus(user.last_acs_dt)
                })),
                total: data.total,
                page: data.page,
                page_size: data.page_size,
                total_pages: data.total_pages
            };
        } catch (e) {
            console.error('Failed to fetch users:', e);
            // 에러 시 빈 결과 반환
            return {
                items: [],
                total: 0,
                page: 1,
                page_size: pageSize,
                total_pages: 0
            };
        }
    }

    _getInitials(userId) {
        const letters = userId.match(/[a-zA-Z]/g);
        if (letters) {
            return letters.slice(0, 2).join('').toUpperCase();
        }
        return userId.substring(0, 2).toUpperCase();
    }

    _calculateStatus(lastAcsDt, accSts) {
        // acc_sts 값에 따라 직접 표시 (승인/대기/휴 면/비활성화)
        const statusMap = {
            'APPROVED': { label: '승인', cls: 'b-green' },
            'PENDING': { label: '대기', cls: 'b-amber' },
            'DORMANT': { label: '휴 면', cls: 'b-gray' },
            'INACTIVE': { label: '비활성', cls: 'b-red' }
        };
        
        if (accSts && statusMap[accSts]) {
            return statusMap[accSts];
        }
        
        // acc_sts가 없는 경우 last_acs_dt 기반으로 계산
        if (!lastAcsDt) {
            return { label: '미접속', cls: 'b-gray' };
        }
        
        const da = daysAgo(lastAcsDt);
        const { cd991, cd992, cd993 } = dynamicThresholds;
        
        // 활성/최근은 수치 기준만 사용 (표시용)
        if (da <= cd992) return { label: '활성', cls: 'b-green' };
        if (da <= cd991) return { label: '최근', cls: 'b-amber' };
        if (da <= cd993) return { label: '휴 면', cls: 'b-gray' };
        return { label: '비활성', cls: 'b-red' };
    }

    renderTable(users) {
        const tbody = document.getElementById('userAccessTableBody');
        if (!tbody) return;

        // 테이블 렌더링 전에 헤더 동기화
        if (window.userAccessInfo) {
            window.userAccessInfo.updateMonthHeaders();
        }

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 40px; color: #666;">
                        등록된 사용자가 없습니다.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => {
            const st = user.status_info || this._calculateStatus(user.last_acs_dt, user.acc_sts);
            const da = daysAgo(user.last_acs_dt);
            const daLabel = da === 0 ? '오늘' : da === 1 ? '어제' : da < 0 ? '오늘' : da + '일 전';

            const lastAccessDate = user.last_acs_dt ? 
                formatDBDateTime(user.last_acs_dt).split(' ')[0] : '-';

            // 주차별 데이터를 월별로 그룹화 - 동적 계산
            const weeksPerMonth = getWeeksPerMonthFn(6);
            const weeklyData = user.weekly_data || [];
            
            // 월별 데이터 렌더링 (차트 타입에 따라 다름) - 둘 다 동일한 26주 데이터 사용
            let monthlyCells;
            
            if (this.chartType === 'line') {
                // 선차트 모드: 26주 데이터를 월별로 집계하여 선으로 표시
                monthlyCells = this._renderWeeklyLineCells(weeklyData, weeksPerMonth);
            } else {
                // 히트맵(막대 차트) 모드: 주차별 막대
                monthlyCells = this._renderMonthlyHeatmapCells(weeklyData, weeksPerMonth);
            }

            return `
                <tr data-user-id="${this.escapeHtml(user.user_id)}">
                    <td><span class="user-id" style="font-family:monospace;font-size:12px;">${this.escapeHtml(user.user_id)}</span></td>
                    <td><span class="count" style="font-weight:500;">${user.total}회</span></td>
                    ${monthlyCells}
                    <td>
                        <div class="last-access" style="color:#666;font-size:12px;">${lastAccessDate}</div>
                        <div class="days-ago" style="font-size:11px;color:#999;margin-top:1px;">${daLabel}</div>
                    </td>
                    <td><span class="badge" style="display:inline-block;padding:2px 7px;border-radius:20px;font-size:11px;font-weight:500;background:${st.cls === 'b-green' ? '#f0fdf4;color:#166534' : st.cls === 'b-amber' ? '#fffbeb;color:#92400e' : st.cls === 'b-red' ? '#fef2f2;color:#991b1b' : '#f4f4f4;color:#6b7280'}">${st.label}</span></td>
                    <td><button class="detail-btn" onclick="window.userAccessInfo?.showDetail('${user.user_id}')" style="padding:4px 10px;border-radius:6px;border:1px solid #ddd;background:transparent;color:#666;font-size:11px;cursor:pointer;">상세</button></td>
                </tr>
            `;
        }).join('');
    }

    renderPagination(data) {
        const container = document.getElementById('userAccessPagination');
        const resultCount = document.getElementById('userAccessResultCount');
        const totalCountEl = document.getElementById('userAccessTotalCount');
        
        if (resultCount) {
            resultCount.textContent = data.total + '명';
        }
        
        // 총 인원 표시 업데이트
        if (totalCountEl) {
            totalCountEl.textContent = `(총 ${data.total}명)`;
        }

        if (!container) return;

        const { page, total_pages, total } = data;

        if (total === 0) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        // 이전 버튼
        if (page > 1) {
            html += `<button onclick="window.userAccessInfo?.render(${page - 1})" style="padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">이전</button>`;
        }

        // 페이지 번호
        for (let i = 1; i <= total_pages; i++) {
            if (i === 1 || i === total_pages || (i >= page - 2 && i <= page + 2)) {
                html += `<button onclick="window.userAccessInfo?.render(${i})" 
                        style="padding: 6px 12px; border: 1px solid ${i === page ? '#007bff' : '#ddd'}; background: ${i === page ? '#007bff' : 'white'}; color: ${i === page ? 'white' : '#333'}; border-radius: 4px; cursor: pointer;">${i}</button>`;
            } else if (i === page - 3 || i === page + 3) {
                html += `<span style="padding: 6px;">...</span>`;
            }
        }

        // 다음 버튼
        if (page < total_pages) {
            html += `<button onclick="window.userAccessInfo?.render(${page + 1})" style="padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">다음</button>`;
        }

        container.innerHTML = html;
    }

    setFilter(mode, days) {
        this.filterMode = mode;
        this.filterDays = days;
        this.render(this.currentPage, this.pageSize, this.searchTerm, mode, days);
    }

    updateFilterButtons(mode) {
        const btnAll = document.getElementById('btn-filter-all');
        const btnNone = document.getElementById('btn-filter-none');
        if (btnAll && btnNone) {
            btnAll.style.cssText = mode === 'all' 
                ? 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 12px; cursor: pointer;'
                : 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.16); background: white; color: #666; font-size: 12px; cursor: pointer;';
            btnNone.style.cssText = mode === 'none'
                ? 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid #333; background: #333; color: #fff; font-size: 12px; cursor: pointer;'
                : 'height: 32px; padding: 0 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.16); background: white; color: #666; font-size: 12px; cursor: pointer;';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 히트맵(막대 차트) 모드: 월별 셀에 주차별 막대 렌더링
    _renderMonthlyHeatmapCells(weeklyData, weeksPerMonth) {
        // weeklyData가 비어있거나 유효하지 않으면 기본값 사용
        if (!weeklyData || weeklyData.length === 0) {
            weeklyData = new Array(26).fill(0);
        }
        
        // null 구분자 제거하고 순수 주간 데이터만 추출 (최대 26주)
        const cleanWeeklyData = weeklyData.filter(v => v !== null).slice(0, 26);
        
        // 26주가 안되면 0으로 채움
        while (cleanWeeklyData.length < 26) {
            cleanWeeklyData.push(0);
        }
        
        let weekIndex = 0;
        
        return weeksPerMonth.map((weekCount, monthIdx) => {
            // 해당 월의 주차 데이터 추출
            const monthWeeks = [];
            for (let i = 0; i < weekCount && weekIndex < cleanWeeklyData.length; i++) {
                monthWeeks.push(cleanWeeklyData[weekIndex]);
                weekIndex++;
            }
            
            // 주차별 막대 렌더링 (값이 0이면 숨김)
            const bars = monthWeeks.map((val, idx) => {
                if (val === 0 || val === undefined || val === null) {
                    return `<div style="width: 4px; height: 30px; visibility: hidden; flex-shrink: 0;"></div>`;
                }
                const color = hmColor(val, this.mode);
                // 값에 비례하여 높이 조정 (최소 30px의 20% = 6px, 최대 100% = 30px)
                const heightPercent = Math.min(100, Math.max(20, val * 5)); // 값 * 5%로 높이 결정
                const heightPx = Math.round(30 * heightPercent / 100);
                return `<div style="width: 4px; height: ${heightPx}px; background: ${color}; border-radius: 1px; flex-shrink: 0;" title="${idx + 1}주차: ${val}회"></div>`;
            }).join('');
            
            return `<td style="text-align: center; padding: 8px 4px;">
                <div style="display: flex; align-items: flex-end; justify-content: center; gap: 2px; height: 30px;">
                    ${bars}
                </div>
            </td>`;
        }).join('');
    }

    // 선차트 모드: 26주 데이터 → 주차별 선차트 (히트맵과 동일한 데이터 사용)
    _renderWeeklyLineCells(weeklyData, weeksPerMonth) {
        const cleanWeeklyData = (weeklyData || []).filter(v => v !== null).slice(0, 26);
        while (cleanWeeklyData.length < 26) {
            cleanWeeklyData.push(0);
        }

        let weekIndex = 0;

        return weeksPerMonth.map((weekCount, monthIdx) => {
            const monthWeeks = [];
            for (let i = 0; i < weekCount && weekIndex < cleanWeeklyData.length; i++) {
                monthWeeks.push(cleanWeeklyData[weekIndex]);
                weekIndex++;
            }

            if (monthWeeks.length === 0) {
                return `<td style="text-align: center; padding: 8px 4px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                        <svg width="50" height="25"></svg>
                        <span style="font-size: 10px; font-weight: 500; color: #999;">0</span>
                    </div>
                </td>`;
            }

            const maxVal = Math.max(...monthWeeks, 1);
            const points = monthWeeks.map((val, i) => {
                const x = (i / (monthWeeks.length - 1 || 1)) * 50;
                const y = 25 - ((val / maxVal) * 20);
                return `${x},${y}`;
            }).join(' ');

            return `<td style="text-align: center; padding: 8px 4px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <svg width="50" height="25" style="vertical-align: middle;">
                        <polyline points="${points}" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        ${monthWeeks.map((val, i) => {
                            const x = (i / (monthWeeks.length - 1 || 1)) * 50;
                            const y = 25 - ((val / maxVal) * 20);
                            return `<circle cx="${x}" cy="${y}" r="2" fill="${i === monthWeeks.length - 1 ? '#1e40af' : '#93c5fd'}"/>`;
                        }).join('')}
                    </svg>
                    <span style="font-size: 10px; font-weight: 500; color: ${monthWeeks[monthWeeks.length - 1] > 0 ? '#333' : '#999'};">${monthWeeks[monthWeeks.length - 1]}</span>
                </div>
            </td>`;
        }).join('');
    }
}

// Singleton instance
const userListRenderer = new UserListRenderer();

export default userListRenderer;
