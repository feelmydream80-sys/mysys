import { showToast } from '../utils/toast.js';
import { downloadExcelTemplate } from '../utils/excelDownload.js';
import { filterActiveMstData } from '../modules/common/utils.js';
export function init() {
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
    
    let mstData = {}; // For mapping job_id to name
    let monthOffset = 0; // 월 오프셋: 0=현재월, -1=지난달, 1=다음달
    let weekOffset = 0; // 주 오프셋: 0=이번 주, -1=지난 주, 1=다음 주

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

        // Helper to generate correct HTML for either an icon class or a literal character
        _generateIconHtml(iconCode) {
            if (!iconCode) {
                return '';
            }
            // If it looks like a Font Awesome class, use an <i> tag
            if (iconCode.includes('fa-')) {
                return `<i class="${iconCode}"></i>`;
            }
            // Otherwise, return the literal character
            return iconCode;
        },

        init() {
            // Re-initialize based on current settings
            this.applyToUI();
            this.updateGuidePopup();
        },

        updateSettings(settings) {
            if (settings && settings.useYn === 'Y') {
                this._settings = settings;
                // _extractIcons is no longer needed as we directly use icon codes
            }
            this.init();
        },

        // This function is no longer needed as we directly use the _cd fields.
        /* _extractIcons(settings) { ... } */
        
        applyToUI() {
            const styleId = 'dynamic-status-styles';
            let styleElement = document.getElementById(styleId);
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                document.head.appendChild(styleElement);
            }

            const s = this._settings;
            styleElement.innerHTML = `
                .status-success { background-color: ${s.sucsBgColr}; color: ${s.sucsTxtColr} !important; }
                .status-fail { background-color: ${s.failBgColr}; color: ${s.failTxtColr} !important; }
                .status-inprogress { background-color: ${s.prgsBgColr}; color: ${s.prgsTxtColr} !important; }
                .status-nodata { background-color: ${s.nodtBgColr}; color: ${s.nodtTxtColr} !important; }
                .status-scheduled { background-color: ${s.schdBgColr}; color: ${s.schdTxtColr} !important; }
            `;

            document.getElementById('grouping-threshold').value = s.grpMinCnt || 0;
            document.getElementById('red-threshold').value = s.prgsRtRedThrsval || 0;
            document.getElementById('orange-threshold').value = s.prgsRtOrgThrsval || 0;
        },
        
        updateGuidePopup() {
            const popup = document.getElementById('guide-popup');
            if (!popup) return;

            const createLi = (statusKey, label) => {
                const iconCode = this._settings[`${statusKey}IconCd`];
                const bgColor = this._settings[`${statusKey}BgColr`];
                const textColor = this._settings[`${statusKey}TxtColr`];
                const iconHtml = this._generateIconHtml(iconCode);

                return `
                    <li class="flex items-center">
                        <span class="job-pill mr-2" style="background-color:${bgColor}; color:${textColor};">${iconHtml} ${label}</span>
                        ${{sucs:'수집 완료', fail:'수집 중 오류 발생', prgs:'수집 진행 중', nodt:'수집되지 않음', schd:'수집 예정'}[statusKey]}
                    </li>`;
            };
            
            const individualItemsHtml = `
                ${createLi('sucs', '성공')}
                ${createLi('fail', '실패')}
                ${createLi('prgs', '수집중')}
                ${createLi('nodt', '미수집')}
                ${createLi('schd', '예정')}
            `;
            
            const groupItemsHtml = `
                <li class="flex items-center"><span class="job-pill status-success mr-2">정상 (녹색)</span> '경고' 임계값 이상</li>
                <li class="flex items-center"><span class="job-pill status-inprogress mr-2">경고 (주황색)</span> '문제점'과 '경고' 임계값 사이</li>
                <li class="flex items-center"><span class="job-pill status-fail mr-2">문제점 (붉은색)</span> '문제점' 임계값 미만</li>
            `;

            popup.querySelector('#individual-status-guide').innerHTML = individualItemsHtml;
            popup.querySelector('#group-status-guide').innerHTML = groupItemsHtml;
        },

        get(key) {
            return this._settings[key];
        },
        
        getIcon(statusKey) {
            // Directly access the icon code from the settings object
            const iconCode = this._settings[`${statusKey}IconCd`];
            return this._generateIconHtml(iconCode); // Use the new helper
        },
        
        getGroupIcon(type) { // type is 'prgs' or 'sucs'
            const keyMap = {
                prgs: 'grpPrgsIconCd',
                sucs: 'grpSucsIconCd'
            };
            const iconCode = this._settings[keyMap[type]];
            return this._generateIconHtml(iconCode);
        }
    };
    
    // --- End Settings Manager ---

    const statusMap = {
        '성공': { key: 'sucs', class: 'status-success' },
        '실패': { key: 'fail', class: 'status-fail' },
        '미수집': { key: 'nodt', class: 'status-nodata' },
        '수집중': { key: 'prgs', class: 'status-inprogress' },
        '예정': { key: 'schd', class: 'status-scheduled' }
    };

    function getGroupPillColorClass(rate, redThreshold, orangeThreshold) {
        if (rate < redThreshold) return 'status-fail';
        if (rate < orangeThreshold) return 'status-inprogress';
        return 'status-success';
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
            
            // 날짜별 상태 카운트 계산
            const statusCounts = {
                '성공': 0,
                '실패': 0,
                '미수집': 0,
                '예정': 0
            };
            
            dayData.forEach(job => {
                if (statusCounts.hasOwnProperty(job.status)) {
                    statusCounts[job.status]++;
                } else if (job.status === '수집중') {
                    // 수집중은 미수집으로 분류
                    statusCounts['미수집']++;
                }
            });
            
            // 날짜 헤더에 카운트 표시 (작은 글씨)
            dayHeader.innerHTML = `
                <div>${dateStr}</div>
                <div style="font-size: 10px; margin-top: 2px;">
                    <span style="color: ${settingsManager.get('sucsTxtColr') || '#008000'}">성공: ${statusCounts['성공']}</span> / 
                    <span style="color: ${settingsManager.get('failTxtColr') || '#ff0000'}">실패: ${statusCounts['실패']}</span> / 
                    <span style="color: ${settingsManager.get('nodtTxtColr') || '#808080'}">미수집: ${statusCounts['미수집']}</span> / 
                    <span style="color: ${settingsManager.get('schdTxtColr') || '#0000ff'}">예정: ${statusCounts['예정']}</span>
                </div>
            `;
            
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
                const groupingThreshold = settingsManager.get('grpMinCnt');
                
                // 전체 job 수 계산
                const totalJobs = Object.values(subGroups).reduce((sum, jobs) => sum + jobs.length, 0);
                
                if (totalJobs >= groupingThreshold) {
                    // 상위 그룹 렌더링 (CD100)
                    const allSubGroupJobs = Object.values(subGroups).flat();
                    const allScheduled = allSubGroupJobs.every(j => j.status === '예정');

                    const total = allSubGroupJobs.length;
                    const success = allSubGroupJobs.filter(j => j.status === '성공').length;
                    const fail = allSubGroupJobs.filter(j => j.status === '실패').length;
                    const completed = success + fail;
                    
                    const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const successRate = completed > 0 ? Math.round((success / completed) * 100) : 0;

                    let colorClass;
                    if (allScheduled) {
                        colorClass = 'status-scheduled';
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
                    const originalParentName = displayMode === 'name' && mstData[parentGroupName] ? mstData[parentGroupName] : parentGroupName;
                    
                    const redThreshold = settingsManager.get('prgsRtRedThrsval') || 30;
                    const orangeThreshold = settingsManager.get('prgsRtOrgThrsval') || 100;
                    
                    groupPill.innerHTML = `
                        <div>${originalParentName} <span class="expand-icon">▶</span></div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            ${createProgressBarHtml(progressRate, redThreshold, orangeThreshold)}
                            <span style="font-size: 0.75rem; white-space: nowrap;">${completed}/${total}</span>
                        </div>
                        <div class="text-center" style="font-size: 0.75rem;">
                            성공: ${success} / 실패: ${fail} (${successRate}%)
                        </div>
                    `;
                    groupPill.title = originalParentName;

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
                        const subTotal = subGroupJobs.length;
                        const subSuccess = subGroupJobs.filter(j => j.status === '성공').length;
                        const subFail = subGroupJobs.filter(j => j.status === '실패').length;
                        const subCompleted = subSuccess + subFail;
                        const subProgressRate = subTotal > 0 ? Math.round((subCompleted / subTotal) * 100) : 0;
                        const subSuccessRate = subCompleted > 0 ? Math.round((subSuccess / subCompleted) * 100) : 0;
                        const subAllScheduled = subGroupJobs.every(j => j.status === '예정');

                        let subColorClass;
                        if (subAllScheduled) {
                            subColorClass = 'status-scheduled';
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

                        const originalSubName = displayMode === 'name' && mstData[subGroupId] ? mstData[subGroupId] : subGroupId;
                        
                        subGroupPill.innerHTML = `
                            <div style="font-size: 0.85rem;">${originalSubName}</div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                ${createProgressBarHtml(subProgressRate, redThreshold, orangeThreshold)}
                                <span style="font-size: 0.7rem; white-space: nowrap;">${subCompleted}/${subTotal}</span>
                            </div>
                            <div class="text-center" style="font-size: 0.7rem;">
                                성공: ${subSuccess} / 실패: ${subFail} (${subSuccessRate}%)
                            </div>
                        `;
                        subGroupPill.title = originalSubName;

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
                            let originalName = popupDisplayMode === 'name' && mstData[job.job_id] ? mstData[job.job_id] : job.job_id;
                            const statusInfo = statusMap[job.status] || { key: 'schd', class: 'status-scheduled' };

                            const sameDayJobs = dayData.filter(d => d.job_id === job.job_id);
                            if (sameDayJobs.length > 1) {
                                const timePart = (job.date.split(' ')[1] || "");
                                if (timePart) {
                                    const hour = parseInt(timePart.substring(0, 2), 10);
                                    originalName += `(${hour}시)`;
                                }
                            }
                            const iconHtml = settingsManager.getIcon(statusInfo.key);
                            const contentHtml = iconHtml ? `${iconHtml}&nbsp;${originalName}` : originalName;

                            const pillElement = document.createElement('div');
                            pillElement.className = `job-pill ${statusInfo.class}`;
                            pillElement.title = createTooltipContent(job, originalName);
                            pillElement.innerHTML = contentHtml;
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
                    const allSubGroupJobs = Object.values(subGroups).flat();
                    allSubGroupJobs.sort((a, b) => {
                        const numA = parseInt(a.job_id.replace('CD', ''), 10);
                        const numB = parseInt(b.job_id.replace('CD', ''), 10);
                        return numA - numB;
                    });
                    
                    allSubGroupJobs.forEach(job => {
                        const jobItem = document.createElement('div');
                        const statusInfo = statusMap[job.status] || { key: 'schd', class: 'status-scheduled' };
                        jobItem.className = `job-pill ${statusInfo.class}`;
                        const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
                        let originalName = displayMode === 'name' && mstData[job.job_id] ? mstData[job.job_id] : job.job_id;
                        const maxLength = 12;
                        if (originalName.length > maxLength) {
                            originalName = originalName.substring(0, maxLength) + '...';
                        }
                        // 아이콘과 텍스트 사이에 공백 추가
                        const iconHTML = settingsManager.getIcon(statusInfo.key);
                        jobItem.innerHTML = iconHTML ? `${iconHTML}&nbsp;${originalName}` : originalName;
                        jobItem.title = createTooltipContent(job, originalName);
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
        const total = data.filter(d => d.status !== '예정').length;
        const success = data.filter(d => d.status === '성공').length;
        const fail = data.filter(d => d.status === '실패').length;
        const nodata = data.filter(d => d.status === '미수집' || d.status === '수집중').length;

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
                        acc[item.job_id] = item.cd_nm;
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

            cardTitle.textContent = viewType === 'weekly' ? '주간 수집 현황 히트맵' : '월간 수집 현황 히트맵';

            // 오늘 날짜를 가져와서 renderCalendar에 전달
            const today = await fetchTodayDate();

            // Render calendar and summary with the schedule data
            if(data.schedule_data) {
                renderCalendar(data.schedule_data, today, viewType);
                updateSummary(data.schedule_data);
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
}
