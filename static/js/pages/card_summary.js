// static/js/pages/card_summary.js

import { downloadExcelTemplate } from '../utils/excelDownload.js';
import { filterActiveMstData } from '../modules/common/utils.js';

let mstData = {}; // For mapping job_id to name

function getDisplayName(cd) {
    const displayMode = document.querySelector('input[name="displayMode"]:checked')?.value || 'code';

    const match = cd.match(/([^(]+)(\(.*\))?/);
    if (!match) return cd; // No match, return original

    const baseCd = match[1].trim();
    const suffix = match[2] || '';
    const mstInfo = mstData[baseCd] || {};
    const name = mstInfo.cd_nm || '';
    const desc = mstInfo.cd_desc || '';

    switch (displayMode) {
        case 'name':
            return name ? name + suffix : cd;
        case 'both':
            return name ? `${cd} (${name})` : cd;
        case 'desc':
            return desc ? desc + suffix : cd;
        case 'code':
        default:
            return cd;
    }
}

/**
 * 툴팁 내용 생성 - collection_schedule.js와 동일한 방식
 * @param {string} jobId - Job ID (예: "CD101(14시)")
 * @param {string} group - 그룹명 (예: "CD100")
 * @param {Object} status - 상태 정보
 * @returns {string} 툴팁 내용
 */
function createTooltipContent(jobId, group, status) {
    const lines = [];
    
    // Job ID에서 시간 분리
    const match = jobId.match(/([^(]+)(\(.*\))?/);
    const baseJobId = match ? match[1].trim() : jobId;
    const hour = match && match[2] ? match[2] : '';
    
    // MST 데이터에서 이름과 설명 찾기
    const mstInfo = mstData[baseJobId] || {};
    const name = mstInfo.cd_nm || '';
    const desc = mstInfo.cd_desc || '';
    const displayName = name || baseJobId;
    
    lines.push(`Job: ${displayName}`);
    lines.push(`ID: ${baseJobId}`);
    
    if (desc) {
        lines.push(`설명: ${desc}`);
    }
    
    if (group) {
        lines.push(`그룹: ${group}`);
    }
    
    if (status && status.name) {
        lines.push(`상태: ${status.name}`);
    }
    
    if (hour) {
        lines.push(`예정시간: ${hour.replace(/[()]/g, '')}`);
    }
    
    return lines.join('\n');
}

/**
 * 검색어로 데이터 필터링
 */
function filterBySearch(data, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        return data;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = {};
    
    Object.entries(data).forEach(([group, groupData]) => {
        const filteredStatuses = {};
        let hasMatch = false;
        
        // 그룹명 검색
        if (group.toLowerCase().includes(term)) {
            hasMatch = true;
        }
        
        Object.entries(groupData.statuses).forEach(([cdCode, status]) => {
            const statusName = (status.name || '').toLowerCase();
            const filteredJobs = [];
            
            // 상태명 검색
            if (statusName.includes(term) || cdCode.toLowerCase().includes(term)) {
                hasMatch = true;
                filteredJobs.push(...status.jobs);
            } else {
                // Job ID 검색
                status.jobs.forEach(job => {
                    const jobLower = job.toLowerCase();
                    const displayName = getDisplayName(job).toLowerCase();
                    
                    if (jobLower.includes(term) || displayName.includes(term)) {
                        filteredJobs.push(job);
                        hasMatch = true;
                    }
                });
            }
            
            if (filteredJobs.length > 0) {
                filteredStatuses[cdCode] = {
                    ...status,
                    jobs: filteredJobs,
                    count: filteredJobs.length
                };
            }
        });
        
        if (hasMatch && Object.keys(filteredStatuses).length > 0) {
            filtered[group] = {
                ...groupData,
                statuses: filteredStatuses,
                total: Object.values(filteredStatuses).reduce((sum, s) => sum + s.count, 0)
            };
        }
    });
    
    return filtered;
}
 
async function fetchAndRenderCardSummary(searchTerm = '') {
    // Fetch MST data for mapping if not already fetched
    if (Object.keys(mstData).length === 0) {
        try {
            const mstResponse = await fetch('/api/mst_list');
            const mstResult = await mstResponse.json();
            if (mstResult) {
                // use_yn 필터 적용
                const activeMstResult = filterActiveMstData(mstResult);
                mstData = activeMstResult.reduce((acc, item) => {
                    acc[item.job_id] = {
                        cd_nm: item.cd_nm || '',
                        cd_desc: item.cd_desc || ''
                    };
                    return acc;
                }, {});
            }
        } catch (e) {
            console.error("Failed to fetch MST data", e);
        }
    }

    fetch('/api/card_summary')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(summaryData => {
            // 현재 데이터 저장 (검색용 및 콩 모드용)
            window.currentSummaryData = summaryData;
            
            // 모드에 따른 렌더링
            renderCardSummary(summaryData, searchTerm);
        })
        .catch(error => {
            const container = document.getElementById('cardContainer');
            if (container) {
                container.innerHTML = ''; // 기존 내용 지우기
                const errorElement = document.createElement('div');
                errorElement.className = 'no-data'; // 동일한 스타일 적용
                errorElement.textContent = `데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`;
                container.appendChild(errorElement);
            }
        });
}

// 엑셀 템플릿 다운로드 버튼 이벤트 리스너
function initDownloadButton() {
    const downloadExcelTemplateBtn = document.getElementById('downloadExcelTemplateBtn');
    if (downloadExcelTemplateBtn) {
        downloadExcelTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }
}

/**
 * @description 카드 요약 페이지의 진입점 함수. router.js에 의해 호출됩니다.
 */
export function init() {
    // 검색 입력창 이벤트 리스너 추가 (300ms 디바운스)
    const searchInput = document.getElementById('cardSearchInput');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchAndRenderCardSummary(e.target.value);
            }, 300); // 300ms 디바운스
        });
    }
    
    // 페이지가 처음 로드될 때 데이터를 가져와 렌더링합니다.
    fetchAndRenderCardSummary();

    document.querySelectorAll('input[name="displayMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const searchTerm = document.getElementById('cardSearchInput')?.value || '';
            fetchAndRenderCardSummary(searchTerm);
        });
    });

    // 엑셀 템플릿 다운로드 버튼 초기화
    initDownloadButton();

    // SPA 환경에서 중복 리스너 등록을 방지하기 위해 플래그를 사용합니다.
    if (!window.cardSummaryListenerAttached) {
        document.addEventListener('visibilitychange', () => {
            // 카드 요약 페이지가 화면에 표시되고 있을 때만 데이터를 새로고침합니다.
            if (document.visibilityState === 'visible' && document.getElementById('cardContainer')) {
                fetchAndRenderCardSummary();
            }
        });
        window.cardSummaryListenerAttached = true;
    }

    // 표/콩 모드 토글 초기화
    initViewModeToggle();

    // 백틱(`) 키로 토글 표시/숨김
    if (!window.backtickListenerAttached) {
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                const toggleContainer = document.getElementById('viewModeToggleContainer');
                if (toggleContainer) {
                    toggleContainer.classList.toggle('hidden');
                }
            }
        });
        window.backtickListenerAttached = true;
    }
}

// ============================================
// 표/콩 모드 전환 기능
// ============================================

let isBeanMode = false;

// 물리 시뮬레이션 설정값 (진동 방지 최적화)
window.PHYSICS = {
    gravity: 0.4,
    bounce: 0.6,              // 낮춤: 덜 튀기게
    friction: 0.95,           // 낮춤: 더 빨리 감속
    airResistance: 0.998,
    ballRadius: 30,
    ballElasticity: 0.85,     // 낮춤: 충돌 시 에너지 더 많이 소모
    ballFriction: 0.98,       // 낮춤: 마찰력 증가
    collisionDamping: 0.95,   // 낮춤: 충돌 후 속도 더 많이 감소
    minVelocity: 0.15,        // 높임: 더 빨리 정지 상태로
    positionCorrection: 0.5,  // 낮춤: 충돌 보정 완화
    initialVelocityX: 5,
    initialSpacing: 3,
    initialVelocityY: 1,
    dropDelay: 2,
    startY: -20,
    maxPlacementAttempts: 100,
    sleepThreshold: 10,       // 추가: 정지 상태 카운터 임계값
    
    // 이동 거리 기반 정지 판정 설정
    settleDistanceThreshold: 0.3,  // 이 거리 미만으로 움직이면 정지 후보
    settleFrameThreshold: 20,       // 연속 이 프레임 수만큼 움직임 없으면 정지
    
    // 겹침 해소 설정
    overlapPushFactor: 0.5,        // 겹침 해소 시 밀어내는 강도 (0.5 = 반반)
    
    // 강제 정지 시간 설정 (밀리초)
    forceSettleTime: 3500,         // 3.5초 후 강제 정지 (팝콘 효과 방지)
    
    // 마지막 구슬 떨어진 후 전체 정지 대기 시간 (밀리초)
    settleAfterLastDrop: 1000      // 1.5초 후 전체 동시 정지
};

function initViewModeToggle() {
    const toggle = document.getElementById('viewModeToggle');
    if (!toggle) return;

    toggle.addEventListener('click', function() {
        this.classList.toggle('active');
        isBeanMode = this.classList.contains('active');
        toggleViewMode();
    });
}

function toggleViewMode() {
    const container = document.getElementById('cardContainer');
    if (!container) return;

    // 현재 데이터를 기반으로 다시 렌더링
    const searchTerm = document.getElementById('cardSearchInput')?.value || '';
    
    if (window.currentSummaryData) {
        renderCardSummary(window.currentSummaryData, searchTerm);
    } else {
        fetchAndRenderCardSummary(searchTerm);
    }
}

// ============================================
// 렌더링 함수 (표/콩 모드 분기)
// ============================================

function renderCardSummary(data, searchTerm = '') {
    const filteredData = filterBySearch(data, searchTerm);
    const container = document.getElementById('cardContainer');
    if (!container) return;

    container.style.minHeight = '100px';
    container.innerHTML = '';

    if (!filteredData || Object.keys(filteredData).length === 0) {
        const noDataElement = document.createElement('div');
        noDataElement.className = 'no-data';
        noDataElement.textContent = searchTerm ? '검색 결과가 없습니다.' : '오늘 수집된 데이터가 없습니다.';
        container.appendChild(noDataElement);
        return;
    }

    const fragment = document.createDocumentFragment();

    Object.keys(filteredData).sort((a, b) => {
        const numA = parseInt(a.replace('CD', ''), 10);
        const numB = parseInt(b.replace('CD', ''), 10);
        return numA - numB;
    }).forEach(group => {
        const groupData = filteredData[group];
        if (!groupData.statuses || Object.keys(groupData.statuses).length === 0) {
            return;
        }

        const groupCard = createGroupCard(group, groupData);
        fragment.appendChild(groupCard);
    });

    if (fragment.children.length === 0) {
        const noDataElement = document.createElement('div');
        noDataElement.className = 'no-data';
        noDataElement.textContent = '오늘 처리된 수집 데이터가 없습니다.';
        container.appendChild(noDataElement);
    } else {
        container.appendChild(fragment);
        
        // 콩 모드일 때 물리 애니메이션 실행
        if (isBeanMode) {
            setTimeout(() => {
                runAllPhysicsAnimations();
            }, 100);
        }
    }
}

function getGroupDisplayName(group, groupData) {
    const displayMode = document.querySelector('input[name="displayMode"]:checked')?.value || 'code';
    
    // 그룹의 첫 번째 job에서 기본 ID 추출하여 그룹명 조회
    let groupName = '';
    let groupDesc = '';
    const statuses = Object.values(groupData.statuses || {});
    if (statuses.length > 0 && statuses[0].jobs && statuses[0].jobs.length > 0) {
        const firstJob = statuses[0].jobs[0];
        // "CD101(14시)" -> "CD101" 추출
        const match = firstJob.match(/([^(]+)/);
        if (match) {
            const baseJobId = match[1].trim();
            // CD101 -> CD100, CD1001 -> CD1000 (그룹 코드로 변환)
            const numericPart = baseJobId.substring(2);
            let groupJobId = '';
            if (numericPart.length >= 4) {
                // CD10xx -> CD1000 (4자리 이상)
                groupJobId = 'CD' + numericPart.substring(0, 2) + '00';
            } else if (numericPart.length >= 3) {
                // CD1xx -> CD100 (3자리)
                groupJobId = 'CD' + numericPart.substring(0, 1) + '00';
            } else {
                // CDxx -> CDxx00 (1~2자리)
                groupJobId = 'CD' + numericPart + '00';
            }
            const groupMstInfo = mstData[groupJobId] || mstData[baseJobId] || {};
            groupName = groupMstInfo.cd_nm || '';
            groupDesc = groupMstInfo.cd_desc || '';
        }
    }
    
    // 표시 모드에 따라 그룹명 반환
    switch (displayMode) {
        case 'name':
            return groupName || group;
        case 'both':
            return groupName ? `${group} (${groupName})` : group;
        case 'desc':
            return groupDesc || group;
        case 'code':
        default:
            return group;
    }
}

function createGroupCard(group, groupData) {
    const groupCard = document.createElement('div');
    groupCard.className = 'group-card';

    const summary = [];
    Object.entries(groupData.statuses).forEach(([cd, status]) => {
        if (status.count > 0) {
            summary.push(`${status.name} ${status.count}`);
        }
    });
    const summaryText = summary.join(' / ');

    const groupDisplayName = getGroupDisplayName(group, groupData);

    const groupHeader = document.createElement('div');
    groupHeader.className = 'group-header';
    groupHeader.style.backgroundColor = groupData.group_bg_colr || 'rgba(107, 114, 128, 0.5)';
    groupHeader.style.color = groupData.group_txt_colr || '#ffffff';
    groupHeader.innerHTML = `
        <div class="group-title">
            ${groupDisplayName}
            <span class="group-summary">${summaryText}</span>
        </div>
        <div class="group-total">총 ${groupData.total}건</div>
    `;
    groupCard.appendChild(groupHeader);

    const statusContainer = document.createElement('div');
    statusContainer.className = 'status-cards-container';

    Object.keys(groupData.statuses).sort().forEach(cdCode => {
        const status = groupData.statuses[cdCode];
        const ballCount = status.jobs ? status.jobs.length : 0;
        
        let countClass = 'ball-count-many';
        if (ballCount <= 10) {
            countClass = `ball-count-${ballCount}`;
        }

        const statusCard = document.createElement('div');
        statusCard.className = `status-card ${countClass}`;
        statusCard.style.backgroundColor = status.bg_colr;
        statusCard.style.color = status.txt_colr;

        const statusHeader = document.createElement('div');
        statusHeader.className = 'status-header';
        statusHeader.style.backgroundColor = status.bg_colr;
        statusHeader.style.color = status.txt_colr;
        statusHeader.innerHTML = `
            <span class="status-name">${status.name}</span>
            <span class="status-count">${status.count}건</span>
        `;
        statusCard.appendChild(statusHeader);

        // 표 모드와 콩 모드 컨테이너 생성
        const listContainer = document.createElement('div');
        listContainer.className = 'list-container';
        if (isBeanMode) {
            listContainer.classList.add('hidden');
        }

        const physicsContainer = document.createElement('div');
        physicsContainer.className = 'physics-container';
        physicsContainer.id = `physics-${group}-${cdCode}`;
        if (!isBeanMode) {
            physicsContainer.classList.add('hidden');
        }

        // Job 목록 채우기
        if (status.jobs) {
            status.jobs.forEach(job => {
                const jobPill = document.createElement('span');
                jobPill.className = 'job-pill';
                let displayName = getDisplayName(job);
                const maxLength = 12;
                if (displayName.length > maxLength) {
                    displayName = displayName.substring(0, maxLength) + '...';
                }
                jobPill.textContent = displayName;
                jobPill.style.backgroundColor = status.bg_colr;
                jobPill.style.color = status.txt_colr;
                jobPill.title = createTooltipContent(job, group, status);
                listContainer.appendChild(jobPill);
            });
        }

        statusCard.appendChild(listContainer);
        statusCard.appendChild(physicsContainer);
        statusContainer.appendChild(statusCard);
    });

    groupCard.appendChild(statusContainer);
    return groupCard;
}

// 구슬 크기 동적 계산 (수량에 따라 크기 조절) - 2배 증가
function calculateBallRadius(jobCount) {
    if (jobCount <= 5) return 12;    // 10 → 20
    if (jobCount <= 10) return 10;   // 8 → 16
    if (jobCount <= 20) return 8;   // 6 → 12
    if (jobCount <= 50) return 7;   // 6 → 12
    return 6; // 21개 이상 (5 → 10)
}

// ============================================
// 물리 애니메이션 클래스 및 함수
// ============================================

class Ball {
    constructor(color, tooltip, index, containerWidth, existingBalls, ballRadius) {
        this.index = index;
        this.radius = ballRadius || window.PHYSICS.ballRadius;
        this.color = color;
        this.tooltip = tooltip;
        this.settled = false;
        this.element = null;
        this.mass = 1;
        this.active = false;
        this.activationFrame = index * window.PHYSICS.dropDelay;
        
        const phys = window.PHYSICS;
        const margin = this.radius + 2;
        let bestX = 0;
        let bestY = phys.startY - (index * phys.initialSpacing);
        let maxMinDistance = 0;
        
        for (let i = 0; i < phys.maxPlacementAttempts; i++) {
            const tryX = Math.random() * (containerWidth - this.radius * 2) + this.radius;
            const tryY = phys.startY - (index * phys.initialSpacing);
            
            let minDistance = Infinity;
            let overlapping = false;
            
            for (const other of existingBalls) {
                const dx = tryX - other.x;
                const dy = tryY - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < margin * 2) {
                    overlapping = true;
                    break;
                }
                minDistance = Math.min(minDistance, distance);
            }
            
            if (!overlapping) {
                bestX = tryX;
                break;
            }
            
            if (minDistance > maxMinDistance) {
                maxMinDistance = minDistance;
                bestX = tryX;
            }
        }
        
        this.x = bestX;
        this.y = bestY;
        
        this.vx = (Math.random() - 0.5) * phys.initialVelocityX * 2;
        this.vy = phys.initialVelocityY;
        this.sleepCounter = 0;  // 정지 상태 카운터 추가
        
        // 이동 거리 기반 정지 판정 변수
        this.lastX = this.x;           // 이전 프레임 X 위치
        this.lastY = this.y;           // 이전 프레임 Y 위치
        this.stuckCounter = 0;         // 움직임 없음 연속 카운터
        this.hadCollision = false;     // 충돌 발생 플래그
        this.creationTime = Date.now(); // 생성 시간 (강제 정지용)
        this.globalSettleTime = null;  // 전체 동시 정지 예정 시간
    }

    createElement() {
        const el = document.createElement('div');
        el.className = 'physics-ball';
        el.style.width = `${this.radius * 2}px`;
        el.style.height = `${this.radius * 2}px`;
        el.style.backgroundColor = this.color;
        el.style.left = `${this.x - this.radius}px`;
        el.style.top = `${this.y - this.radius}px`;
        
        el.addEventListener('mouseenter', () => this.showTooltip(el));
        el.addEventListener('mouseleave', () => this.hideTooltip(el));
        
        this.element = el;
        return el;
    }

    showTooltip(el) {
        const tooltip = document.createElement('div');
        tooltip.className = 'ball-tooltip';
        tooltip.textContent = this.tooltip;
        el.appendChild(tooltip);
    }

    hideTooltip(el) {
        const tooltips = el.querySelectorAll('.ball-tooltip');
        tooltips.forEach(t => t.remove());
    }

    update(width, height, otherBalls, currentFrame) {
        if (!this.active) {
            if (currentFrame >= this.activationFrame) {
                this.active = true;
            } else {
                return;
            }
        }

        if (this.settled) return;

        const phys = window.PHYSICS;

        this.vy += phys.gravity;
        this.vx *= phys.airResistance;
        this.vy *= phys.airResistance;
        
        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -phys.bounce;
        } else if (this.x + this.radius > width) {
            this.x = width - this.radius;
            this.vx *= -phys.bounce;
        }

        if (this.y + this.radius > height) {
            this.y = height - this.radius;
            this.vy *= -phys.bounce;
            this.vx *= phys.friction;
        }
        
        // 진동 방지: 낮은 속도가 지속되면 완전히 정지
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed < phys.minVelocity * 2) {
            this.sleepCounter++;
            if (this.sleepCounter > phys.sleepThreshold) {
                this.settled = true;
                this.vy = 0;
                this.vx = 0;
                this.x = Math.round(this.x * 10) / 10;  // 위치 정규화
                this.y = Math.round(this.y * 10) / 10;
            }
        } else {
            this.sleepCounter = 0;
        }

        // 충돌 후 이동 거리 기반 정지 판정
        if (this.hadCollision && !this.settled) {
            const moveDistance = Math.sqrt(
                Math.pow(this.x - this.lastX, 2) +
                Math.pow(this.y - this.lastY, 2)
            );

            if (moveDistance < phys.settleDistanceThreshold) {
                this.stuckCounter++;
                if (this.stuckCounter >= phys.settleFrameThreshold) {
                    this.forceSettle(otherBalls, width, height);
                }
            } else {
                this.stuckCounter = 0;
            }
            this.hadCollision = false;
        }

        // 현재 위치 저장 (다음 프레임 비교용)
        this.lastX = this.x;
        this.lastY = this.y;

        // 마지막 구슬 떨어진 후 1.5초 후 전체 동시 정지
        if (this.globalSettleTime && !this.settled && Date.now() >= this.globalSettleTime) {
            this.settled = true;
            this.vx = 0;
            this.vy = 0;
            // resolveOverlap 호출 안 함 - 팝콘 효과 방지
        }

        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -phys.bounce;
        }

        otherBalls.forEach(other => {
            if (other === this || !other.active) return;
            this.resolveCollision(other);
        });

        if (this.element) {
            this.element.style.left = `${this.x - this.radius}px`;
            this.element.style.top = `${this.y - this.radius}px`;
        }
    }

    resolveCollision(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.radius + other.radius;

        if (distance >= minDistance || distance === 0) return;

        const phys = window.PHYSICS;

        const overlap = minDistance - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        
        const moveX = overlap * nx * phys.positionCorrection;
        const moveY = overlap * ny * phys.positionCorrection;
        
        this.x -= moveX;
        this.y -= moveY;
        other.x += moveX;
        other.y += moveY;

        const dvx = other.vx - this.vx;
        const dvy = other.vy - this.vy;
        const velAlongNormal = dvx * nx + dvy * ny;

        if (velAlongNormal > 0) return;

        const restitution = phys.ballElasticity;
        let j = -(1 + restitution) * velAlongNormal;
        j /= (1 / this.mass + 1 / other.mass);

        const impulseX = j * nx;
        const impulseY = j * ny;
        
        this.vx -= impulseX / this.mass * phys.collisionDamping;
        this.vy -= impulseY / this.mass * phys.collisionDamping;
        other.vx += impulseX / other.mass * phys.collisionDamping;
        other.vy += impulseY / other.mass * phys.collisionDamping;

        const tx = -ny;
        const ty = nx;
        const velAlongTangent = dvx * tx + dvy * ty;
        
        const jt = -velAlongTangent * phys.ballFriction;
        const frictionX = jt * tx;
        const frictionY = jt * ty;
        
        this.vx -= frictionX / this.mass;
        this.vy -= frictionY / this.mass;
        other.vx += frictionX / other.mass;
        other.vy += frictionY / other.mass;

        // 충돌 후 추가 감쇠로 진동 방지
        this.vx *= 0.98;
        this.vy *= 0.98;
        other.vx *= 0.98;
        other.vy *= 0.98;

        // 충돌 플래그 설정
        this.hadCollision = true;
        other.hadCollision = true;
    }

    forceSettle(otherBalls, width, height) {
        this.settled = true;
        this.vx = 0;
        this.vy = 0;

        // 주변 구슬과 겹침 해소
        this.resolveOverlap(otherBalls, width, height);
    }

    resolveOverlap(otherBalls, width, height) {
        const pushFactor = window.PHYSICS.overlapPushFactor;
        
        otherBalls.forEach(other => {
            if (other === this || !other.settled) return;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = this.radius + other.radius;

            if (distance < minDistance && distance > 0) {
                const overlap = minDistance - distance;
                const nx = dx / distance;
                const ny = dy / distance;

                this.x -= overlap * nx * pushFactor;
                this.y -= overlap * ny * pushFactor;
            }
        });

        // 화면 경계 제한
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));

        // DOM 업데이트
        if (this.element) {
            this.element.style.left = `${this.x - this.radius}px`;
            this.element.style.top = `${this.y - this.radius}px`;
        }
    }
}

function runPhysicsAnimation(containerId, jobs, color) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    // 수량에 맞춰 구슬 크기 동적 계산
    const ballRadius = calculateBallRadius(jobs.length);

    const balls = [];
    for (let i = 0; i < jobs.length; i++) {
        // 툴팁에 getDisplayName() 적용하여 라디오 버튼 선택에 따라 표시값 변경
        const displayTooltip = getDisplayName(jobs[i]);
        const ball = new Ball(color, displayTooltip, i, width, balls, ballRadius);
        container.appendChild(ball.createElement());
        balls.push(ball);
    }

    // 마지막 구슬 활성화 시간 계산 (60fps 기준)
    const lastActivationFrame = (jobs.length - 1) * window.PHYSICS.dropDelay;
    const lastActivationMs = (lastActivationFrame / 60) * 1000; // 프레임을 ms로 변환
    const globalSettleTime = Date.now() + lastActivationMs + window.PHYSICS.settleAfterLastDrop;

    // 모든 구슬에 동일한 정지 시간 설정
    balls.forEach(ball => {
        ball.globalSettleTime = globalSettleTime;
    });

    let frameCount = 0;
    function animate() {
        frameCount++;
        let allSettled = true;
        let allActive = true;

        balls.forEach(ball => {
            ball.update(width, height, balls, frameCount);
            if (!ball.settled && ball.active) allSettled = false;
            if (!ball.active) allActive = false;
        });

        /*/ 주기적으로 정지된 공들의 겹침 추가 해소
        if (frameCount % 30 === 0) {  // 0.5초마다 (60fps 기준)
            balls.forEach(ball => {
                if (ball.settled) {
                    ball.resolveOverlap(balls, width, height);
                }
            });
        }*/

        if ((!allSettled || !allActive) && frameCount < 800) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

function runAllPhysicsAnimations() {
    const physicsContainers = document.querySelectorAll('.physics-container:not(.hidden)');

    physicsContainers.forEach(container => {
        // 컨테이너 ID에서 그룹과 상태코드 추출
        const containerId = container.id;
        const match = containerId.match(/physics-(.+)-(.+)/);
        if (!match) return;

        const [, groupName, cdCode] = match;

        // 데이터에서 해당 상태의 jobs 찾기
        if (window.currentSummaryData && window.currentSummaryData[groupName]) {
            const groupData = window.currentSummaryData[groupName];
            if (groupData.statuses && groupData.statuses[cdCode]) {
                const status = groupData.statuses[cdCode];
                if (status.jobs && status.jobs.length > 0) {
                    runPhysicsAnimation(containerId, status.jobs, status.bg_colr);
                }
            }
        }
    });
}


