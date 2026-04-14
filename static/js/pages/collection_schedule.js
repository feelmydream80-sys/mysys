import { showToast } from '../utils/toast.js';
import { downloadExcelTemplate } from '../utils/excelDownload.js';
import { filterActiveMstData } from '../modules/common/utils.js';
import { scheduleSettingsApi } from '../services/api.js';
import { getKSTNow, formatDateTime, formatDBDateTime } from '../modules/common/dateUtils.js';

// 전역 변수
let mstData = {}; // For mapping job_id to name
let monthOffset = 0; // 월 오프셋: 0=현재월, -1=지난달, 1=다음달
let weekOffset = 0; // 주 오프셋: 0=이번 주, -1=지난 주, 1=다음 주
let subGroupsByParent = {}; // 상위 그룹별 하위 jobs (스케줄 데이터 기반)
let memoColors = { iconId: null, bgColr: '#fef08b', txtColr: '#a16207' };

export function init() {
    // Get user info from body data attribute
    let isAdminUser = false;
    const body = document.body;
    if (body && body.dataset.user) {
        try {
            const userData = JSON.parse(body.dataset.user);
            isAdminUser = userData.permissions && userData.permissions.includes('mngr_sett');
        } catch (e) {
            console.error('Failed to parse user data:', e);
        }
    }

    // DOM Elements
    const weeklyBtn = document.getElementById('weekly-btn');
    const monthlyBtn = document.getElementById('monthly-btn');
    const calendarGrid = document.getElementById('calendar-grid');
    const cardTitle = document.querySelector('.card-title');
    const totalCountEl = document.getElementById('total-count');
    const successCountEl = document.getElementById('success-count');
    const failCountEl = document.getElementById('fail-count');
    const nodataCountEl = document.getElementById('nodata-count');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsHeader = document.getElementById('settings-header');
    const settingsBody = document.getElementById('settings-body');
    const settingsContainer = document.getElementById('settings-container');
    const toggleIcon = document.getElementById('toggle-icon');
    
    // monthOffset와 weekOffset은 전역 변수를 재사용
    let monthOffset = 0;
    let weekOffset = 0;

    // --- Guide Popup ---
    const guideToggleBtn = document.getElementById('guide-toggle-btn');
    const guidePopup = document.getElementById('guide-popup');

    if (guideToggleBtn && guidePopup) {
        guideToggleBtn.addEventListener('mouseenter', () => {
            guidePopup.classList.remove('hidden');
        });
        guideToggleBtn.addEventListener('mouseleave', () => {
            guidePopup.classList.add('hidden');
        });
         // Persist showing popup on hover over the popup itself
        guidePopup.addEventListener('mouseenter', () => {
            guidePopup.classList.remove('hidden');
        });
        guidePopup.addEventListener('mouseleave', () => {
            guidePopup.classList.add('hidden');
        });
    }

    // --- Collapsible Settings ---
    const settingsCollapseManager = {
        _storageKey: 'heatmapSettingsCollapsed',
        _isCollapsed: false,

        init() {
            this.loadState();
            this.applyState();
            settingsHeader.addEventListener('click', () => {
                this.toggleState();
            });
        },
        loadState() {
            this._isCollapsed = localStorage.getItem(this._storageKey) === 'true';
        },
        saveState() {
            localStorage.setItem(this._storageKey, this._isCollapsed);
        },
        applyState() {
            settingsBody.classList.toggle('collapsed', this._isCollapsed);
            settingsContainer.classList.toggle('collapsed', this._isCollapsed);
            toggleIcon.classList.toggle('collapsed', this._isCollapsed);
        },
        toggleState() {
            this._isCollapsed = !this._isCollapsed;
            this.applyState();
            this.saveState();
        }
    };
    settingsCollapseManager.init();

    // --- Settings Manager ---
    const settingsManager = {
        _settings: {},
        _icons: {},
        _statusCodes: [],

        _generateIconHtml(iconCode) {
            if (!iconCode) {
                return '';
            }
            if (iconCode.includes('fa-')) {
                return `<i class="${iconCode}"></i>`;
            }
            return iconCode;
        },

        init() {
            this.applyToUI();
            this.updateGuidePopup();
        },

        updateSettings(settings) {
            if (settings) {
                this._settings = settings;
            }
            this.init();
        },

        updateStatusCodes(statusCodes) {
            this._statusCodes = statusCodes || [];
            this.buildDynamicStatusMap();
        },

        buildDynamicStatusMap() {
            this._statusMapByCd = {};
            this._statusCodes.forEach(code => {
                const cd = code.cd || code.CD;
                const bg_colr = code.bg_colr || code.BG_COLR;
                const txt_colr = code.txt_colr || code.TXT_COLR;
                const icon_cd = code.icon_cd || code.ICON_CD;
                
                if (cd) {
                    this._statusMapByCd[cd] = {
                        key: cd,
                        bg_colr: bg_colr,
                        txt_colr: txt_colr,
                        icon_cd: icon_cd
                    };
                }
            });
        },

        getStatusInfoByCd(statusCd) {
            const cd = statusCd?.toUpperCase() || statusCd;
            const info = this._statusMapByCd[cd] || this._statusMapByCd[statusCd];
            
            if (info) {
                return {
                    key: info.key,
                    class: `status-${info.key}`,
                    icon_cd: info.icon_cd,
                    bg_colr: info.bg_colr,
                    txt_colr: info.txt_colr
                };
            }
            return null;
        },

        getStatusInfo(statusCd) {
            return this.getStatusInfoByCd(statusCd) || { key: statusCd, class: `status-${statusCd}`, icon_cd: null, bg_colr: null, txt_colr: null };
        },
        
        applyToUI() {
            const styleId = 'dynamic-status-styles';
            let styleElement = document.getElementById(styleId);
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                document.head.appendChild(styleElement);
            }

            const s = this._settings;
            
            const defaultColors = {
                'CD901': { bg: '#dcfce7', txt: '#166534' },
                'CD902': { bg: '#fee2e2', txt: '#991b1b' },
                'CD907': { bg: '#f3f4f6', txt: '#6b7280' },
                'CD908': { bg: '#e5e7eb', txt: '#374151' }
            };

            let cssRules = '';
            this._statusCodes.forEach(code => {
                const cd = code.cd || code.CD;
                const bg = code.bg_colr || code.BG_COLR || defaultColors[cd]?.bg || '#808080';
                const txt = code.txt_colr || code.TXT_COLR || defaultColors[cd]?.txt || '#ffffff';
                cssRules += `.status-${cd} { background-color: ${bg}; color: ${txt} !important; }\n`;
                if (cd === 'CD902') {
                    cssRules += `.status-${cd}-warn { background-color: ${bg}; color: ${txt} !important; opacity: 0.5; }\n`;
                }
            });

            styleElement.innerHTML = cssRules;

            document.getElementById('grouping-threshold').value = s.grpMinCnt || 0;
            document.getElementById('red-threshold').value = s.prgsRtRedThrsval || 0;
            document.getElementById('orange-threshold').value = s.prgsRtOrgThrsval || 0;
        },
        
        updateGuidePopup() {
            const popup = document.getElementById('guide-popup');
            if (!popup) return;

            const statusList = this._statusCodes.map(code => {
                const cd = code.cd || code.CD;
                return {
                    key: cd,
                    label: code.nm || code.NM || cd,
                    cd: cd,
                    descr: code.descr || code.DESCR || '',
                    icon_cd: code.icon_cd || code.ICON_CD,
                    bg_colr: code.bg_colr || code.BG_COLR,
                    txt_colr: code.txt_colr || code.TXT_COLR
                };
            });

            const createLi = (status) => {
                const iconHtml = this._generateIconHtml(status.icon_cd);
                const bgColor = status.bg_colr || '#808080';
                const textColor = status.txt_colr || '#ffffff';

                return `
                    <li class="flex items-center">
                        <span class="job-pill mr-2" style="background-color:${bgColor}; color:${textColor};">${iconHtml} ${status.label}</span>
                        ${status.descr || ''}
                    </li>`;
            };
            
            const individualItemsHtml = statusList.map(s => createLi(s)).join('');
            
            const groupItemsHtml = `
                <li class="flex items-center"><span class="job-pill status-CD901 mr-2">정상 (녹색)</span> '경고' 임계값 이상</li>
                <li class="flex items-center"><span class="job-pill status-CD902 mr-2">문제점 (붉은색)</span> '문제점' 임계값 미만</li>
            `;

            popup.querySelector('#individual-status-guide').innerHTML = individualItemsHtml;
            popup.querySelector('#group-status-guide').innerHTML = groupItemsHtml;
        },

        get(key) {
            return this._settings[key];
        },
        
        getIconByCd(statusCd) {
            const cd = statusCd?.toUpperCase() || statusCd;
            const info = this._statusMapByCd[cd] || this._statusMapByCd[statusCd];
            if (info && info.icon_cd) {
                return this._generateIconHtml(info.icon_cd);
            }
            return '';
        },

        getIcon(statusKey) {
            const iconCode = this._settings[`${statusKey}IconCd`];
            return this._generateIconHtml(iconCode);
        }
    };
    
    // --- End Settings Manager ---

    function getStatusInfoByCd(statusCd) {
        return settingsManager.getStatusInfoByCd(statusCd) || { key: statusCd, class: `status-${statusCd}`, icon_cd: null, bg_colr: null, txt_colr: null };
    }

    function isStatusDisplayed(job) {
        return true;
    }

    function getGroupPillColorClass(rate, redThreshold, orangeThreshold) {
        if (rate < redThreshold) return 'status-CD902';
        if (rate < orangeThreshold) return 'status-CD902-warn';
        return 'status-CD901';
    }

    function getProgressBarColorClass(rate, redThreshold, orangeThreshold) {
        if (rate < redThreshold) return 'progress-bar-danger';
        if (rate < orangeThreshold) return 'progress-bar-warning';
        return 'progress-bar-success';
    }

    function createProgressBarHtml(rate, redThreshold, orangeThreshold) {
        const colorClass = getProgressBarColorClass(rate, redThreshold, orangeThreshold);
        return `<div class="progress-bar-container"><div class="progress-bar-fill ${colorClass}" style="width: ${rate}%"></div></div>`;
    }

    function createTooltipContent(job, name) {
        const lines = [];
        if (job.date) {
            lines.push(`예정: ${job.date}`);
        }
        if (job.actual_date) {
            lines.push(`실제 수집: ${job.actual_date}`);
        }
        if (job.status) {
            lines.push(`상태: ${job.status}`);
        }
        if (job.cd_nm) {
            lines.push(`이름: ${job.cd_nm}`);
        }
        if (job.cd_desc) {
            lines.push(`설명: ${job.cd_desc}`);
        }
        return lines.join('\n');
    }

    function renderCalendar(data, today, viewType = 'weekly') {
        calendarGrid.innerHTML = '';
        const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
        if (displayMode === 'name') {
            calendarGrid.classList.add('name-mode');
        } else {
            calendarGrid.classList.remove('name-mode');
        }
        // today는 매개변수로 받음 (서버에서 온 KST 기준 날짜)

        const groupedData = data.reduce((acc, item) => {
            const date = item.date.split(' ')[0]; // Use only the date part for grouping
            if (!acc[date]) acc[date] = [];
            acc[date].push(item);
            return acc;
        }, {});

        if (data.length === 0) {
            calendarGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">해당 기간에 예정된 수집 일정이 없습니다.</p>';
            return;
        }

        const allDates = Array.from(new Set(data.map(item => item.date.split(' ')[0]))).sort();
        const startDate = new Date(allDates[0]);
        const endDate = new Date(allDates[allDates.length - 1]);
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const currentDateStr = currentDate.toISOString().split('T')[0];
            const dayData = groupedData[currentDateStr] || [];
            
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            if (currentDateStr === today) dayColumn.classList.add('today');

            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            const dateStr = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')} (${['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]})`;
            
            // 날짜별 상태 카운트 계산 (CD 코드 기반)
            const statusCounts = {
                'CD901': 0,  // 성공
                'CD902': 0,  // 실패
                'CD908': 0,  // 미수집 (CD904, CD905 포함)
                'CD907': 0   // 예정
            };
            
            dayData.filter(isStatusDisplayed).forEach(job => {
                if (job.status === 'CD901') statusCounts['CD901']++;
                else if (job.status === 'CD902') statusCounts['CD902']++;
                else if (job.status === 'CD907') statusCounts['CD907']++;
                else if (['CD908', 'CD904', 'CD905'].includes(job.status)) statusCounts['CD908']++;
            });
            
            // 날짜별 Jobs 수 (하위 그룹 수, 고유 job_id 수 - Cron 반복 미포함)
            const jobsCount = new Set(dayData.filter(isStatusDisplayed).map(j => j.job_id)).size;

            // 날짜 헤더에 카운트 표시 (작은 글씨)
            dayHeader.innerHTML = `
                <div>${dateStr}</div>
                <div style="font-size: 10px; margin-top: 2px;">
                    <span style="color: ${settingsManager.getStatusInfoByCd('CD901')?.txt_colr || '#166534'}">성공: ${statusCounts['CD901']}</span> / 
                    <span style="color: ${settingsManager.getStatusInfoByCd('CD902')?.txt_colr || '#991b1b'}">실패: ${statusCounts['CD902']}</span> / 
                    <span style="color: ${settingsManager.getStatusInfoByCd('CD908')?.txt_colr || '#374151'}">미수집: ${statusCounts['CD908']}</span> / 
                    <span style="color: ${settingsManager.getStatusInfoByCd('CD907')?.txt_colr || '#6b7280'}">예정: ${statusCounts['CD907']}</span>
                </div>
            `;
            dayHeader.title = `Jobs: ${jobsCount}개`;
            
            const jobsContainer = document.createElement('div');
            jobsContainer.className = 'jobs-container';

            // 2단계 그룹핑: 상위 그룹(CD100) → 하위 그룹(CD101, CD102, CD103)
            const jobsBySubGroup = dayData.reduce((acc, job) => {
                const jobIdNum = parseInt(job.job_id.replace('CD', ''), 10);
                if (isNaN(jobIdNum)) return acc;
                // 하위 그룹은 개별 job_id (CD101, CD102, CD103)
                const subGroupId = job.job_id;
                if (!acc[subGroupId]) acc[subGroupId] = [];
                acc[subGroupId].push(job);
                return acc;
            }, {});

            // 상위 그룹으로 묶기 (CD100, CD200, CD300)
            const jobsByParentGroup = {};
            Object.keys(jobsBySubGroup).forEach(subGroupId => {
                const subIdNum = parseInt(subGroupId.replace('CD', ''), 10);
                const parentGroupId = `CD${Math.floor(subIdNum / 100) * 100}`;
                if (!jobsByParentGroup[parentGroupId]) jobsByParentGroup[parentGroupId] = {};
                jobsByParentGroup[parentGroupId][subGroupId] = jobsBySubGroup[subGroupId];
            });

            Object.keys(jobsByParentGroup).sort((a, b) => {
                const numA = parseInt(a.replace('CD', ''), 10);
                const numB = parseInt(b.replace('CD', ''), 10);
                return numA - numB;
            }).forEach(parentGroupName => {
                const subGroups = jobsByParentGroup[parentGroupName];
                
                // 스케줄 데이터 기반 하위 그룹 저장 (스케줄에 있는 그룹만)
                subGroupsByParent[parentGroupName] = Object.keys(subGroups).map(subId => ({
                    cd: subId,
                    cd_nm: mstData[subId]?.cd_nm || subId
                }));
                
                const groupingThreshold = settingsManager.get('grpMinCnt');
                
                // 전체 job 수 계산
                const totalJobs = Object.values(subGroups).flat().filter(isStatusDisplayed).length;
                
                if (totalJobs >= groupingThreshold) {
                    // 상위 그룹 렌더링 (CD100)
                    const allSubGroupJobs = Object.values(subGroups).flat().filter(isStatusDisplayed);
                    // CD904, CD905는 "없는 것"으로 취급
                    const validJobs = allSubGroupJobs.filter(j => ['CD901', 'CD902', 'CD907', 'CD908'].includes(j.status));
                    const allScheduled = validJobs.length > 0 && validJobs.every(j => j.status === 'CD907');

                    const total = validJobs.length;
                    const success = validJobs.filter(j => j.status === 'CD901').length;
                    const fail = validJobs.filter(j => j.status === 'CD902').length;
                    const completed = success + fail;
                    
                    const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const successRate = completed > 0 ? Math.round((success / completed) * 100) : 0;

                    let colorClass;
                    if (allScheduled) {
                        colorClass = 'status-CD907';
                    } else {
                       const colorCriteria = settingsManager.get('grpColrCrtr') || 'prgr';
                      if (colorCriteria === 'succ') {
                          colorClass = getGroupPillColorClass(successRate, settingsManager.get('succRtRedThrsval'), settingsManager.get('succRtOrgThrsval'));
                      } else {
                          colorClass = getGroupPillColorClass(progressRate, settingsManager.get('prgsRtRedThrsval'), settingsManager.get('prgsRtOrgThrsval'));
                       }
                    }

                    const groupContainer = document.createElement('div');
                    groupContainer.className = 'group-container';
                    groupContainer.style.position = 'relative';

                    const groupPill = document.createElement('div');
                    groupPill.className = `job-pill group-pill-summary ${colorClass}`;
                    const borderStyle = settingsManager.get('grpBrdrStyl') || 'solid';
                    if (borderStyle === 'none') {
                        groupPill.style.borderWidth = '0';
                    } else {
                        groupPill.style.borderStyle = borderStyle;
                        groupPill.style.borderWidth = '2px';
                    }

                    const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
                    let parentDisplayName = parentGroupName;
                    if (displayMode === 'name' && mstData[parentGroupName]) {
                        parentDisplayName = mstData[parentGroupName].cd_nm;
                    } else if (displayMode === 'desc' && mstData[parentGroupName]) {
                        parentDisplayName = mstData[parentGroupName].cd_desc || parentGroupName;
                    }
                    
                    const redThreshold = settingsManager.get('prgsRtRedThrsval') || 30;
                    const orangeThreshold = settingsManager.get('prgsRtOrgThrsval') || 100;
                    
                    groupPill.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${parentDisplayName} <span class="expand-icon">▶</span></span>
                            <span class="memo-btn" data-grp-id="${parentGroupName}" data-date="${currentDateStr}" data-depth="1" style="cursor: pointer; font-size: 0.65rem; padding: 1px 3px; border-radius: 4px;">+</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            ${createProgressBarHtml(progressRate, redThreshold, orangeThreshold)}
                            <span style="font-size: 0.75rem; white-space: nowrap;">${completed}/${total}</span>
                        </div>
                        <div class="text-center" style="font-size: 0.75rem;">
                            <span style="color: ${settingsManager.getStatusInfoByCd('CD901')?.txt_colr || '#166534'}">성공: ${success}</span> / 
                            <span style="color: ${settingsManager.getStatusInfoByCd('CD902')?.txt_colr || '#991b1b'}">실패: ${fail}</span> 
                            (${successRate}%)
                        </div>
                    `;
                    groupPill.title = parentDisplayName;

                    // 상위 그룹 팝업 - 하위 그룹들을 팝업으로 표시 (5x4 페이징)
                    const parentPopup = document.createElement('div');
                    parentPopup.className = 'popup';
                    parentPopup.style.maxWidth = '900px';
                    parentPopup.style.zIndex = '10000';
                    parentPopup.style.position = 'fixed';
                    
                    const parentPopupContent = document.createElement('div');
                    parentPopupContent.className = 'popup-content';
                    parentPopupContent.style.gridTemplateColumns = 'repeat(5, 1fr)';
                    parentPopupContent.style.gap = '0.75rem';

                    // 하위 그룹 정렬
                    const sortedSubGroupIds = Object.keys(subGroups).sort((a, b) => {
                        const numA = parseInt(a.replace('CD', ''), 10);
                        const numB = parseInt(b.replace('CD', ''), 10);
                        return numA - numB;
                    });

                    // 하위 그룹들을 팝업 내용에 추가
                    sortedSubGroupIds.forEach(subGroupId => {
                        const subGroupJobs = subGroups[subGroupId];
                        const filteredSubJobs = subGroupJobs.filter(isStatusDisplayed);
                        // CD904, CD905는 "없는 것"으로 취급
                        const validSubJobs = filteredSubJobs.filter(j => ['CD901', 'CD902', 'CD907', 'CD908'].includes(j.status));
                        const subTotal = validSubJobs.length;
                        const subSuccess = validSubJobs.filter(j => j.status === 'CD901').length;
                        const subFail = validSubJobs.filter(j => j.status === 'CD902').length;
                        const subCompleted = subSuccess + subFail;
                        const subProgressRate = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;
                        const subSuccessRate = subCompleted > 0 ? Math.round((subSuccess / subCompleted) * 100) : 0;
                        const subAllScheduled = validSubJobs.length > 0 && validSubJobs.every(j => j.status === 'CD907');

                        let subColorClass;
                        if (subAllScheduled) {
                            subColorClass = 'status-CD907';
                        } else {
                            const colorCriteria = settingsManager.get('grpColrCrtr') || 'prgr';
                            if (colorCriteria === 'succ') {
                                subColorClass = getGroupPillColorClass(subSuccessRate, settingsManager.get('succRtRedThrsval'), settingsManager.get('succRtOrgThrsval'));
                            } else {
                                subColorClass = getGroupPillColorClass(subProgressRate, settingsManager.get('prgsRtRedThrsval'), settingsManager.get('prgsRtOrgThrsval'));
                            }
                        }

                        const subGroupContainer = document.createElement('div');
                        subGroupContainer.className = 'group-container sub-group-item';
                        subGroupContainer.style.position = 'relative';

                        const subGroupPill = document.createElement('div');
                        subGroupPill.className = `job-pill group-pill-summary ${subColorClass} sub-group-pill`;
                        if (borderStyle === 'none') {
                            subGroupPill.style.borderWidth = '0';
                        } else {
                            subGroupPill.style.borderStyle = borderStyle;
                            subGroupPill.style.borderWidth = '1px';
                        }

                        let subDisplayName = subGroupId;
                        if (displayMode === 'name' && mstData[subGroupId]) {
                            subDisplayName = mstData[subGroupId].cd_nm;
                        } else if (displayMode === 'desc' && mstData[subGroupId]) {
                            subDisplayName = mstData[subGroupId].cd_desc || subGroupId;
                        }
                        
                        subGroupPill.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${subDisplayName}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                ${createProgressBarHtml(subProgressRate, redThreshold, orangeThreshold)}
                                <span style="font-size: 0.7rem; white-space: nowrap;">${subCompleted}/${subTotal}</span>
                            </div>
                            <div class="text-center" style="font-size: 0.7rem;">
                                <span style="color: ${settingsManager.getStatusInfoByCd('CD901')?.txt_colr || '#166534'}">성공: ${subSuccess}</span> / 
                                <span style="color: ${settingsManager.getStatusInfoByCd('CD902')?.txt_colr || '#991b1b'}">실패: ${subFail}</span> 
                                (${subSuccessRate}%)
                            </div>
                        `;
                        subGroupPill.title = subDisplayName;

                        // 하위 그룹의 상세 팝업
                        const subPopup = document.createElement('div');
                        subPopup.className = 'popup';
                        subPopup.style.zIndex = '100000';
                        subPopup.style.position = 'fixed';
                        const subPopupContent = document.createElement('div');
                        subPopupContent.className = 'popup-content';

                        const sortedSubJobs = subGroupJobs.sort((a, b) => {
                            const numA = parseInt(a.job_id.replace('CD', ''), 10);
                            const numB = parseInt(b.job_id.replace('CD', ''), 10);
                            return numA - numB;
                        });

                        sortedSubJobs.forEach(job => {
                            const popupDisplayMode = document.querySelector('input[name="displayMode"]:checked').value;
                            let jobDisplayName = job.job_id;
                            if (popupDisplayMode === 'name' && mstData[job.job_id]) {
                                jobDisplayName = mstData[job.job_id].cd_nm;
                            } else if (popupDisplayMode === 'desc' && mstData[job.job_id]) {
                                jobDisplayName = mstData[job.job_id].cd_desc || job.job_id;
                            }
                            const statusInfo = getStatusInfoByCd(job.status);

                            const sameDayJobs = dayData.filter(d => d.job_id === job.job_id);
                            if (sameDayJobs.length > 1) {
                                const timePart = (job.date.split(' ')[1] || "");
                                if (timePart) {
                                    const hour = parseInt(timePart.substring(0, 2), 10);
                                    jobDisplayName += `(${hour}시)`;
                                }
                            }
                            const iconHtml = settingsManager.getIconByCd(job.status);
                            const contentHtml = iconHtml ? `${iconHtml}&nbsp;${jobDisplayName}` : jobDisplayName;

                            const pillElement = document.createElement('div');
                            pillElement.className = `job-pill ${statusInfo.class}`;
                            pillElement.title = createTooltipContent(job, jobDisplayName);
                            pillElement.innerHTML = contentHtml;
                            if (statusInfo.bg_colr) {
                                pillElement.style.backgroundColor = statusInfo.bg_colr;
                            }
                            if (statusInfo.txt_colr) {
                                pillElement.style.color = statusInfo.txt_colr;
                            }
                            subPopupContent.appendChild(pillElement);
                        });

                        const subPagination = document.createElement('div');
                        subPagination.className = 'pagination';
                        const subItemsPerPage = 50;
                        const subTotalPages = Math.ceil(sortedSubJobs.length / subItemsPerPage);
                        let subCurrentPage = 1;

                        function updateSubPopupContent() {
                            const startIndex = (subCurrentPage - 1) * subItemsPerPage;
                            const endIndex = startIndex + subItemsPerPage;
                            Array.from(subPopupContent.children).forEach((pill, index) => {
                                pill.style.display = (index >= startIndex && index < endIndex) ? 'block' : 'none';
                            });
                            updateSubPaginationUI();
                        }

                        function updateSubPaginationUI() {
                            subPagination.innerHTML = '';
                            const prevBtn = document.createElement('button');
                            prevBtn.textContent = '← 이전';
                            prevBtn.disabled = subCurrentPage === 1;
                            prevBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (subCurrentPage > 1) {
                                    subCurrentPage--;
                                    updateSubPopupContent();
                                }
                            });
                            subPagination.appendChild(prevBtn);

                            const pageInfo = document.createElement('span');
                            pageInfo.className = 'page-info';
                            pageInfo.textContent = `${subCurrentPage} / ${subTotalPages}`;
                            subPagination.appendChild(pageInfo);

                            const nextBtn = document.createElement('button');
                            nextBtn.textContent = '다음 →';
                            nextBtn.disabled = subCurrentPage === subTotalPages;
                            nextBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (subCurrentPage < subTotalPages) {
                                    subCurrentPage++;
                                    updateSubPopupContent();
                                }
                            });
                            subPagination.appendChild(nextBtn);
                        }

                        subPopup.appendChild(subPopupContent);
                        if (subTotalPages > 1) {
                            subPopup.appendChild(subPagination);
                        }
                        document.body.appendChild(subPopup);
                        updateSubPopupContent();

                        const toggleSubPopup = (event) => {
                            // memo-btn 클릭 시에는 메모 팝업만 열림
                            if (event.target.classList.contains('memo-btn')) {
                                event.stopPropagation();
                                return;
                            }
                            
                            event.stopPropagation();
                            document.querySelectorAll('.popup').forEach(p => {
                                if (p !== subPopup && p !== parentPopup) {
                                    p.style.display = 'none';
                                    p.classList.remove('active');
                                }
                            });

                            const isVisible = subPopup.style.display === 'block';
                            if (isVisible) {
                                subPopup.style.display = 'none';
                                subPopup.classList.remove('active');
                            } else {
                                const pillRect = subGroupPill.getBoundingClientRect();
                                subPopup.style.display = 'block';
                                subPopup.style.visibility = 'hidden';
                                subPopup.style.position = 'fixed';
                                const popupRect = subPopup.getBoundingClientRect();
                                subPopup.style.visibility = 'visible';

                                // fixed 포지션이므로 viewport 기준 좌표 사용
                                const pillBottom = pillRect.bottom;
                                const pillTop = pillRect.top;
                                const pillLeft = pillRect.left;

                                const belowSpace = window.innerHeight - pillRect.bottom - 5;
                                let top, left;
                                if (belowSpace >= popupRect.height) {
                                    top = pillBottom + 5;
                                    left = Math.max(0, Math.min(pillLeft, window.innerWidth - popupRect.width));
                                } else {
                                    const aboveSpace = pillRect.top - 5;
                                    if (aboveSpace >= popupRect.height) {
                                        top = pillTop - popupRect.height - 5;
                                        left = Math.max(0, Math.min(pillLeft, window.innerWidth - popupRect.width));
                                    } else {
                                        top = Math.max(0, (window.innerHeight - popupRect.height) / 2);
                                        left = Math.max(0, (window.innerWidth - popupRect.width) / 2);
                                    }
                                }

                                top = Math.max(0, Math.min(top, window.innerHeight - popupRect.height));
                                left = Math.max(0, Math.min(left, window.innerWidth - popupRect.width));

                                subPopup.style.top = `${top}px`;
                                subPopup.style.left = `${left}px`;
                                subPopup.classList.add('active');
                            }
                        };

                        subGroupPill.addEventListener('click', toggleSubPopup);
                        subGroupContainer.appendChild(subGroupPill);
                        parentPopupContent.appendChild(subGroupContainer);
                    });

                    // 상위 그룹 팝업 페이징 (5x4 = 20개씩)
                    const parentPagination = document.createElement('div');
                    parentPagination.className = 'pagination';
                    const parentItemsPerPage = 20; // 5열 x 4행
                    const parentTotalPages = Math.ceil(sortedSubGroupIds.length / parentItemsPerPage);
                    let parentCurrentPage = 1;

                    function updateParentPopupContent() {
                        const startIndex = (parentCurrentPage - 1) * parentItemsPerPage;
                        const endIndex = startIndex + parentItemsPerPage;
                        Array.from(parentPopupContent.children).forEach((pill, index) => {
                            pill.style.display = (index >= startIndex && index < endIndex) ? 'block' : 'none';
                        });
                        updateParentPaginationUI();
                    }

                    function updateParentPaginationUI() {
                        parentPagination.innerHTML = '';
                        if (parentTotalPages <= 1) return;
                        
                        const prevBtn = document.createElement('button');
                        prevBtn.textContent = '← 이전';
                        prevBtn.disabled = parentCurrentPage === 1;
                        prevBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (parentCurrentPage > 1) {
                                parentCurrentPage--;
                                updateParentPopupContent();
                            }
                        });
                        parentPagination.appendChild(prevBtn);

                        const pageInfo = document.createElement('span');
                        pageInfo.className = 'page-info';
                        pageInfo.textContent = `${parentCurrentPage} / ${parentTotalPages}`;
                        parentPagination.appendChild(pageInfo);

                        const nextBtn = document.createElement('button');
                        nextBtn.textContent = '다음 →';
                        nextBtn.disabled = parentCurrentPage === parentTotalPages;
                        nextBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (parentCurrentPage < parentTotalPages) {
                                parentCurrentPage++;
                                updateParentPopupContent();
                            }
                        });
                        parentPagination.appendChild(nextBtn);
                    }

                    parentPopup.appendChild(parentPopupContent);
                    if (parentTotalPages > 1) {
                        parentPopup.appendChild(parentPagination);
                    }
                    document.body.appendChild(parentPopup);
                    updateParentPopupContent();

                    // 상위 그룹 클릭 시 하위 그룹 팝업 표시
                    groupPill.addEventListener('click', (event) => {
                        // memo-btn 클릭 시 parentPopup 열지 않고 종료 (이벤트는 document까지 전파)
                        if (event.target.classList.contains('memo-btn')) {
                            return;
                        }
                        
                        event.stopPropagation();
                        document.querySelectorAll('.popup').forEach(p => {
                            if (p !== parentPopup) {
                                p.style.display = 'none';
                                p.classList.remove('active');
                            }
                        });

                        const isVisible = parentPopup.style.display === 'block';
                        if (isVisible) {
                            parentPopup.style.display = 'none';
                            parentPopup.classList.remove('active');
                        } else {
                            // 팝업을 열 때 페이지 초기화
                            parentCurrentPage = 1;
                            updateParentPopupContent();
                            const pillRect = groupPill.getBoundingClientRect();
                            parentPopup.style.display = 'block';
                            parentPopup.style.visibility = 'hidden';
                            parentPopup.style.position = 'fixed';
                            const popupRect = parentPopup.getBoundingClientRect();
                            parentPopup.style.visibility = 'visible';

                            // fixed 포지션이므로 viewport 기준 좌표 사용
                            const pillBottom = pillRect.bottom;
                            const pillLeft = pillRect.left;
                            const pillTop = pillRect.top;

                            const belowSpace = window.innerHeight - pillRect.bottom - 5;
                            let top, left;
                            if (belowSpace >= popupRect.height) {
                                top = pillBottom + 5;
                                left = Math.max(0, Math.min(pillLeft, window.innerWidth - popupRect.width));
                            } else {
                                const aboveSpace = pillRect.top - 5;
                                if (aboveSpace >= popupRect.height) {
                                    top = pillTop - popupRect.height - 5;
                                    left = Math.max(0, Math.min(pillLeft, window.innerWidth - popupRect.width));
                                } else {
                                    top = Math.max(0, (window.innerHeight - popupRect.height) / 2);
                                    left = Math.max(0, (window.innerWidth - popupRect.width) / 2);
                                }
                            }

                            top = Math.max(0, Math.min(top, window.innerHeight - popupRect.height));
                            left = Math.max(0, Math.min(left, window.innerWidth - popupRect.width));

                            parentPopup.style.top = `${top}px`;
                            parentPopup.style.left = `${left}px`;
                            parentPopup.classList.add('active');
                        }
                    });

                    groupContainer.appendChild(groupPill);
                    jobsContainer.appendChild(groupContainer);
                } else {
                    // 임계값 미달 - 개별 job pills로 렌더링
                    const allSubGroupJobs = Object.values(subGroups).flat().filter(isStatusDisplayed);
                    allSubGroupJobs.sort((a, b) => {
                        const numA = parseInt(a.job_id.replace('CD', ''), 10);
                        const numB = parseInt(b.job_id.replace('CD', ''), 10);
                        return numA - numB;
                    });
                    
                    allSubGroupJobs.forEach(job => {
                        const jobItem = document.createElement('div');
                        const statusInfo = getStatusInfoByCd(job.status);
                        jobItem.className = `job-pill ${statusInfo.class}`;
                        if (statusInfo.bg_colr) {
                            jobItem.style.backgroundColor = statusInfo.bg_colr;
                        }
                        if (statusInfo.txt_colr) {
                            jobItem.style.color = statusInfo.txt_colr;
                        }
                        const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
                        let jobDisplayName = job.job_id;
                        if (displayMode === 'name' && mstData[job.job_id]) {
                            jobDisplayName = mstData[job.job_id].cd_nm;
                        } else if (displayMode === 'desc' && mstData[job.job_id]) {
                            jobDisplayName = mstData[job.job_id].cd_desc || job.job_id;
                        }
                        const maxLength = 12;
                        if (jobDisplayName.length > maxLength) {
                            jobDisplayName = jobDisplayName.substring(0, maxLength) + '...';
                        }
                        const iconHTML = settingsManager.getIconByCd(job.status);
                        jobItem.innerHTML = iconHTML ? `${iconHTML}&nbsp;${jobDisplayName}` : jobDisplayName;
                        jobItem.title = createTooltipContent(job, jobDisplayName);
                        jobsContainer.appendChild(jobItem);
                    });
                }
            });

            dayColumn.appendChild(dayHeader);
            dayColumn.appendChild(jobsContainer);
            calendarGrid.appendChild(dayColumn);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    function updateSummary(data) {
        const filteredData = data.filter(isStatusDisplayed);
        const total = filteredData.filter(d => d.status !== 'CD907').length;
        const success = filteredData.filter(d => d.status === 'CD901').length;
        const fail = filteredData.filter(d => d.status === 'CD902').length;
        const nodata = filteredData.filter(d => ['CD908', 'CD904', 'CD905'].includes(d.status)).length;

        totalCountEl.textContent = total;
        successCountEl.textContent = success;
        failCountEl.textContent = fail;
        nodataCountEl.textContent = nodata;
    }

    // 오늘 날짜를 서버에서 가져오는 독립적인 함수
    async function fetchTodayDate() {
        try {
            const response = await fetch('/api/today_date');
            if (!response.ok) {
                throw new Error('Failed to fetch today date');
            }
            const data = await response.json();
            return data.today_date;
        } catch (e) {
            console.error("Failed to fetch today date, using client time", e);
            // 실패 시 클라이언트 시간 사용 (fallback)
            return new Date().toISOString().split('T')[0];
        }
    }

    async function fetchData(viewType) {
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
                            cd_nm: item.cd_nm,
                            cd_desc: item.cd_desc ? item.cd_desc.replace(/_/g, ' ') : ''
                        };
                        return acc;
                    }, {});
                }
            } catch (e) {
                console.error("Failed to fetch MST data", e);
                // Continue without mapping
            }
        }

        try {
            let url = `/api/collection_schedule?view=${viewType}`;
            if (viewType === 'monthly') {
                url += `&month_offset=${monthOffset}`;
            } else {
                url += `&week_offset=${weekOffset}`;
            }
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401) {
                    showToast('세션이 만료되었거나 로그인되지 않았습니다. 로그인 페이지로 이동합니다.', 'error');
                    window.location.href = '/login';
                }
                throw new Error('Network response was not ok');
            }

            const data = await response.json();


            if (data.error) {
                showToast(data.error, 'error');
                return;
            }

            // Update settings manager with the new settings from the API
            if (data.display_settings) {
                settingsManager.updateSettings(data.display_settings);
            }

            // Load memo colors from schedule settings
            try {
                const schedRes = await scheduleSettingsApi.getSettings();
                
                if (schedRes && typeof schedRes === 'object' && Object.keys(schedRes).length > 0) {
                    const s = schedRes;
                    memoColors = {
                        iconId: s.memoIconId || null,
                        bgColr: s.memoBgColr || '#708090',
                        txtColr: s.memoTxtColr || '#ffffff'
                    };
                }
            } catch (e) {
                console.warn('[memo colors] 로드 실패:', e);
            }

            if (data.status_codes) {
                settingsManager.updateStatusCodes(data.status_codes);
                settingsManager.applyToUI();
            }

            cardTitle.textContent = viewType === 'weekly' ? '주간 수집 현황 히트맵' : '월간 수집 현황 히트맵';

            // 오늘 날짜를 가져와서 renderCalendar에 전달
            const today = await fetchTodayDate();

            // Render calendar and summary with the schedule data
            if(data.schedule_data) {
                renderCalendar(data.schedule_data, today, viewType);
                updateSummary(data.schedule_data);
                await updateMemoButtons();
            }

            showToast(viewType === 'weekly' ? '주간 데이터를 불러왔습니다.' : '월간 데이터를 불러왔습니다.', 'success');

        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('데이터를 불러오는 데 실패했습니다.', 'error');
        }
    }

    if (weeklyBtn) {
        weeklyBtn.addEventListener('click', () => {
            if (!weeklyBtn.classList.contains('active')) {
                weeklyBtn.classList.add('active');
                monthlyBtn.classList.remove('active');
                // 탭 전환 시에는 항상 "이번 주"로 리셋
                weekOffset = 0;
                updateNavigationVisibility();
                fetchData('weekly');
            }
        });
    }

    monthlyBtn.addEventListener('click', () => {
        if (!monthlyBtn.classList.contains('active')) {
            monthlyBtn.classList.add('active');
            if (weeklyBtn) weeklyBtn.classList.remove('active');
            // 탭 전환 시에는 항상 "이번 달"로 리셋
            monthOffset = 0;
            updateNavigationVisibility();
            fetchData('monthly');
        }
    });

    document.querySelectorAll('input[name="displayMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const activeView = weeklyBtn.classList.contains('active') ? 'weekly' : 'monthly';
            fetchData(activeView);
        });
    });
 
    // --- Global click handler to close popups when clicking outside ---
    document.addEventListener('click', (event) => {
        // Check if the click is outside any group container
        const groupContainers = document.querySelectorAll('.group-container');
        let clickedOutside = true;

        groupContainers.forEach(container => {
            if (container.contains(event.target)) {
                clickedOutside = false;
            }
        });

        if (clickedOutside) {
            // Close all popups
            document.querySelectorAll('.popup').forEach(popup => {
                popup.style.display = 'none';
                popup.classList.remove('active');
            });
        }
    });

    // 지난달/다음달 / 지난주/다음주 버튼 이벤트 리스너
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const monthNavigation = document.getElementById('month-navigation');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const weekNavigation = document.getElementById('week-navigation');
    
    // 주간/월간 뷰에 따라 네비게이션 표시 제어
    function updateNavigationVisibility() {
        const isMonthlyView = monthlyBtn.classList.contains('active');
        const isWeeklyView = weeklyBtn && weeklyBtn.classList.contains('active');

        if (monthNavigation) {
            monthNavigation.style.display = isMonthlyView ? 'inline-flex' : 'none';
        }
        if (weekNavigation) {
            weekNavigation.style.display = isWeeklyView ? 'inline-flex' : 'none';
        }
    }
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            monthOffset--;
            fetchData('monthly');
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            monthOffset++;
            fetchData('monthly');
        });
    }

    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            weekOffset--;
            if (weeklyBtn && !weeklyBtn.classList.contains('active')) {
                // 탭 상태가 꼬이지 않도록 보정
                weeklyBtn.classList.add('active');
                monthlyBtn.classList.remove('active');
            }
            fetchData('weekly');
        });
    }

    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            weekOffset++;
            if (weeklyBtn && !weeklyBtn.classList.contains('active')) {
                weeklyBtn.classList.add('active');
                monthlyBtn.classList.remove('active');
            }
            fetchData('weekly');
        });
    }
    
    // 초기 로드 시 버튼 visibility 설정
    updateNavigationVisibility();
    
    // 엑셀 템플릿 다운로드 버튼 이벤트 리스너
    const downloadExcelTemplateBtn = document.getElementById('downloadExcelTemplateBtn');
    if (downloadExcelTemplateBtn) {
        downloadExcelTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }

    // Initial load - 게스트는 월간으로 고정
    const urlParams = new URLSearchParams(window.location.search);
    const isGuest = urlParams.get('guest') === '1';
    const initialView = isGuest ? 'monthly' : 'weekly';
    // 초기 뷰에 따라 오프셋 초기화
    monthOffset = 0;
    weekOffset = 0;
    fetchData(initialView);

    // 메모 팝업 이벤트 처리
    const memoPopup = document.getElementById('memo-popup');
    const memoForm = document.getElementById('memo-form');
    const memoCloseBtn = document.getElementById('memo-close-btn');
    const memoDeleteBtn = document.getElementById('memo-delete-btn');
    const memoContent = document.getElementById('memo-content');
    const memoGrpId = document.getElementById('memo-grp-id');
    const memoDate = document.getElementById('memo-date');
    const memoDepth = document.getElementById('memo-depth');

    if (memoCloseBtn && memoPopup) {
        memoCloseBtn.addEventListener('click', () => {
            memoPopup.classList.add('hidden');
        });
    }

    if (memoPopup) {
        memoPopup.addEventListener('click', (e) => {
            if (e.target === memoPopup) {
                memoPopup.classList.add('hidden');
            }
        });
    }

    if (memoForm) {
        memoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const grpId = memoGrpId.value;
            const date = memoDate.value;
            const depth = parseInt(memoDepth.value);
            const content = memoContent.value;

            try {
                const response = await fetch('/api/group-memo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ grp_id: grpId, memo_date: date, depth: depth, content: content })
                });
                const result = await response.json();
                if (result.success) {
                    memoPopup.classList.add('hidden');
                    await updateMemoButtons();
                }
            } catch (err) {
                console.error('메모 저장 오류:', err);
                alert('메모 저장 중 오류가 발생했습니다.');
            }
        });
    }

    if (memoDeleteBtn) {
        memoDeleteBtn.addEventListener('click', async () => {
            const grpId = memoGrpId.value;
            const date = memoDate.value;
            const depth = parseInt(memoDepth.value);

            try {
                const response = await fetch(`/api/group-memo?grp_id=${grpId}&depth=${depth}&memo_date=${date}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (result.success) {
                    // 삭제 후 popup 닫기 전에 현재 그룹의 메모 버튼 색상 즉시 초기화
                    const currentMemoBtn = document.querySelector(`.memo-btn[data-grp-id='${grpId}'][data-date='${date}']`);
                    if (currentMemoBtn) {
                        const groupContainer = currentMemoBtn.closest('.group-container');
                        const groupPill = groupContainer?.querySelector('.group-pill-summary');
                        if (groupPill) {
                            groupPill.style.removeProperty('background-color');
                            groupPill.style.removeProperty('color');
                        }
                    }
                    memoPopup.classList.add('hidden');
                    await updateMemoButtons();
                } else {
                    alert(result.error || '메모 삭제에 실패했습니다.');
                }
            } catch (err) {
                console.error('메모 삭제 오류:', err);
                alert('메모 삭제 중 오류가 발생했습니다.');
            }
        });
    }

    // 메모 버튼 클릭 이벤트 - 동적으로 생성된 요소 위임
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('memo-btn')) {
            e.stopPropagation();
            const grpId = e.target.dataset.grpId;
            const date = e.target.dataset.date;
            const depth = parseInt(e.target.dataset.depth);

            console.log('[DEBUG] 메모 팝업 열림 - grpId:', grpId, 'date:', date, 'depth:', depth);

            memoGrpId.value = grpId;
            memoDate.value = date;
            memoDepth.value = depth;

            let loadedMemo = null;
            
            // 기존 메모 로드
            try {
                const response = await fetch(`/api/group-memo?grp_id=${grpId}&depth=${depth}&memo_date=${date}`);
                const result = await response.json();
                loadedMemo = result.memo;
                console.log('[DEBUG] 메모 로드 완료 - loadedMemo:', loadedMemo);
            } catch (err) {
                console.error('메모 로드 오류:', err);
            }

            const isAdmin = typeof isAdminUser !== 'undefined' && isAdminUser;
            
            // 관리자이고 상위 그룹(depth=1)일 때 하위 그룹 정보 자동 입력
            if (isAdmin && depth === 1) {
                const subGroups = getSubGroupsByParent(grpId);
                const subGroupList = subGroups.length > 0 ? subGroups.map(sg => {
                    const now = getKSTNow();
                    const dateStr = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    return `${sg.cd}-${sg.cd_nm}\n- '${dateStr}' : 특이사항 없음`;
                }).join('\n') + '\n\n' : '';
                
                if (loadedMemo) {
                    memoContent.value = loadedMemo.content;
                } else {
                    memoContent.value = subGroupList;
                }
            } else {
                // 일반적인 경우
                if (loadedMemo) {
                    memoContent.value = loadedMemo.content;
                } else {
                    memoContent.value = '';
                }
            }

            // 관리자가 아니면 읽기 전용
            if (memoContent) {
                memoContent.readOnly = !isAdmin;
            }

            // 작성자/일시 정보 표시
            const memoInfo = document.getElementById('memo-info');
            const memoWriter = document.getElementById('memo-writer');
            const memoDateInfo = document.getElementById('memo-date-info');
            console.log('[DEBUG] 메모 정보 표시:', { loadedMemo, memoInfo, memoWriter, memoDateInfo });
            if (memoInfo && memoWriter && memoDateInfo) {
                if (loadedMemo && loadedMemo.writer_id) {
                    memoWriter.textContent = loadedMemo.writer_id;
                    const createdAt = loadedMemo.created_at || loadedMemo.createdAt;
                    console.log('[DEBUG] createdAt:', createdAt, 'formatDBDateTime 결과:', formatDBDateTime(createdAt));
                    memoDateInfo.textContent = formatDBDateTime(createdAt);
                } else {
                    memoWriter.textContent = '';
                    memoDateInfo.textContent = '';
                }
            }

            // 저장/삭제 버튼 표시 여부
            if (memoForm && memoForm.querySelector) {
                memoForm.querySelector('button[type="submit"]').style.display = isAdmin ? 'inline-block' : 'none';
            }
            if (memoDeleteBtn) {
                memoDeleteBtn.style.display = (isAdmin && loadedMemo) ? 'inline-block' : 'none';
            }

            if (memoPopup) {
                memoPopup.classList.remove('hidden');
                
                // 디버그: 팝업 크기 로그
                const container = memoPopup.querySelector('div[class*="bg-white"]');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    console.log('[DEBUG] 메모 팝업 크기 - 너비:', rect.width, 'px, 높이:', rect.height, 'px');
                    console.log('[DEBUG] 윈도우 크기 - 너비:', window.innerWidth, 'px, 높이:', window.innerHeight, 'px');
                    
                    // textarea 크기 로그
                    const textarea = document.getElementById('memo-content');
                    if (textarea) {
                        const taRect = textarea.getBoundingClientRect();
                        console.log('[DEBUG] Textarea 크기 - 너비:', taRect.width, 'px, 높이:', taRect.height, 'px');
                        console.log('[DEBUG] Textarea class:', textarea.className);
                        console.log('[DEBUG] Textarea style.height:', textarea.style.height || '(없음 - CSS 적용)');
                    }
                }
            }
        }
    });

    // ESC 키로 메모 팝업 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && memoPopup && !memoPopup.classList.contains('hidden')) {
            memoPopup.classList.add('hidden');
        }
    });
}

async function updateMemoButtons() {
    const memoBtns = document.querySelectorAll('.memo-btn');
    if (memoBtns.length === 0) {
        return;
    }

    const grpIds = [...new Set(Array.from(memoBtns).map(btn => btn.dataset.grpId))];
    const dates = [...new Set(Array.from(memoBtns).map(btn => btn.dataset.date))];

    try {
        const apiUrl = '/api/memos-batch?grp_ids=' + grpIds.join(',') + '&dates=' + dates.join(',');
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        if (!result.memos || result.memos.length === 0) {
            memoBtns.forEach(btn => {
                btn.textContent = '+';
                btn.style.color = '';
                btn.style.backgroundColor = '';
            });
            return;
        }

        memoBtns.forEach(btn => {
            const btnGrpId = btn.dataset.grpId;
            const btnDate = btn.dataset.date;
            
            const hasMemo = result.memos.some(m => {
                const memoDateObj = new Date(m.memo_date);
                const memoDateStr = !isNaN(memoDateObj) ? memoDateObj.toISOString().split('T')[0] : String(m.memo_date).slice(0, 10);
                return m.grp_id === btnGrpId && memoDateStr === btnDate;
            });
            
            if (hasMemo) {
                btn.textContent = '✓';
                btn.style.color = memoColors.txtColr;
                btn.style.backgroundColor = memoColors.bgColr;
                
                // 그룹 전체에 메모 색상 적용 (최우선 순위)
                const groupContainer = btn.closest('.group-container');
                const groupPill = groupContainer?.querySelector('.group-pill-summary');
                if (groupPill) {
                    groupPill.style.setProperty('background-color', memoColors.bgColr, 'important');
                    groupPill.style.setProperty('color', memoColors.txtColr, 'important');
                }
            } else {
                btn.textContent = '+';
                btn.style.color = '';
                btn.style.backgroundColor = '';
                
                // 메모가 없는 그룹은 색상 초기화 (삭제된 경우)
                const groupContainer = btn.closest('.group-container');
                const groupPill = groupContainer?.querySelector('.group-pill-summary');
                if (groupPill) {
                    groupPill.style.removeProperty('background-color');
                    groupPill.style.removeProperty('color');
                }
            }
        });
    } catch (err) {
        console.error('[updateMemoButtons] 오류:', err);
    }
}

// 상위 그룹의 하위 그룹 목록 조회 (스케줄 데이터 기반)
function getSubGroupsByParent(parentGrpId) {
    return subGroupsByParent[parentGrpId] || [];
}
