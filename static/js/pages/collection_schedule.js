import { showToast } from '../utils/toast.js';
import { downloadExcelTemplate } from '../utils/excelDownload.js';
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

    function renderCalendar(data, today) {
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
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = groupedData[dateStr] || [];
            
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            if (dateStr === today) dayColumn.classList.add('today');

            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')} (${['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]})`;
            
            const jobsContainer = document.createElement('div');
            jobsContainer.className = 'jobs-container';

            const jobsByGroup = dayData.reduce((acc, job) => {
                const jobIdNum = parseInt(job.job_id.replace('CD', ''), 10);
                if (isNaN(jobIdNum)) return acc;
                const groupId = `CD${Math.floor(jobIdNum / 100) * 100}`;
                if (!acc[groupId]) acc[groupId] = [];
                acc[groupId].push(job);
                return acc;
            }, {});

            Object.keys(jobsByGroup).sort((a, b) => {
                const numA = parseInt(a.replace('CD', ''), 10);
                const numB = parseInt(b.replace('CD', ''), 10);
                return numA - numB;
            }).forEach(groupName => {
                const groupJobs = jobsByGroup[groupName];
                const groupingThreshold = settingsManager.get('grpMinCnt');

                if (groupJobs.length >= groupingThreshold) {
                    // Render as a group pill
                    const allScheduled = groupJobs.every(j => j.status === '예정');

                    const total = groupJobs.length;
                    const success = groupJobs.filter(j => j.status === '성공').length;
                    const fail = groupJobs.filter(j => j.status === '실패').length;
                    const completed = success + fail;
                    
                    const progressRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const successRate = completed > 0 ? Math.round((success / completed) * 100) : 0;

                    let colorClass;
                    if (allScheduled) {
                        colorClass = 'status-scheduled';
                    } else {
                       const colorCriteria = settingsManager.get('grpColrCrtr') || 'prgr'; // 'prgr' for progress, 'succ' for success
                      if (colorCriteria === 'succ') {
                          // Success rate criteria
                          colorClass = getGroupPillColorClass(successRate, settingsManager.get('succRtRedThrsval'), settingsManager.get('succRtOrgThrsval'));
                      } else {
                          // Progress rate criteria (default)
                          colorClass = getGroupPillColorClass(progressRate, settingsManager.get('prgsRtRedThrsval'), settingsManager.get('prgsRtOrgThrsval'));
                       }
                    }

                    const groupContainer = document.createElement('div');
                    groupContainer.className = 'group-container';
                    groupContainer.style.position = 'relative'; // 팝업의 상대적 위치 기준점

                    const groupPill = document.createElement('div');
                    groupPill.className = `job-pill group-pill-summary ${colorClass}`;
                    // Apply border style from settings
                    const borderStyle = settingsManager.get('grpBrdrStyl') || 'solid';
                    if (borderStyle === 'none') {
                        groupPill.style.borderWidth = '0';
                    } else {
                        groupPill.style.borderStyle = borderStyle;
                        // 'none'이 아닐 경우 기본 border-width를 유지하거나 설정합니다.
                        groupPill.style.borderWidth = '2px';
                    }

                    const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
                    const originalGroupName = displayMode === 'name' && mstData[groupName] ? mstData[groupName] : groupName;
                    groupPill.innerHTML = `
                        <div>${originalGroupName}</div>
                        <div class="text-center">
                            (${settingsManager.getGroupIcon('prgs') || ''}&nbsp;${progressRate}% / ${settingsManager.getGroupIcon('sucs') || ''}&nbsp;${successRate}%)
                        </div>
                    `;
                    groupPill.title = originalGroupName;

                    const popup = document.createElement('div');
                    popup.className = 'popup';
                    groupJobs.sort((a, b) => {
                        const numA = parseInt(a.job_id.replace('CD', ''), 10);
                        const numB = parseInt(b.job_id.replace('CD', ''), 10);
                        return numA - numB;
                    }).forEach(job => {
                        const popupDisplayMode = document.querySelector('input[name="displayMode"]:checked').value;
                        let originalName = popupDisplayMode === 'name' && mstData[job.job_id] ? mstData[job.job_id] : job.job_id;
                        const statusInfo = statusMap[job.status] || { key: 'schd', class: 'status-scheduled' };

                        // If there are multiple jobs for the same job_id in a day,
                        // it implies multiple schedules. Display the scheduled hour from the job.date field.
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
                        
                        popup.appendChild(pillElement);
                    });
                    
                    groupContainer.appendChild(groupPill);
                    groupContainer.appendChild(popup);
                   jobsContainer.appendChild(groupContainer);

                   // --- Popup click logic ---
                   const togglePopup = (event) => {
                       event.stopPropagation(); // 이벤트 버블링 방지

                       // 다른 팝업들을 모두 닫음
                       document.querySelectorAll('.popup').forEach(p => {
                           if (p !== popup) {
                               p.style.display = 'none';
                               p.classList.remove('active');
                           }
                       });

                       // 현재 팝업 토글
                       const isVisible = popup.style.display === 'block';
                       if (isVisible) {
                           popup.style.display = 'none';
                           popup.classList.remove('active');
                       } else {
                           // 팝업 위치 계산 및 설정 (그룹 컨테이너 기준)
                           const containerRect = groupContainer.getBoundingClientRect();
                           const pillRect = groupPill.getBoundingClientRect();

                           // 팝업을 임시로 표시해서 크기를 측정
                           popup.style.display = 'block';
                           popup.style.visibility = 'hidden'; // 화면에 보이지 않게
                           popup.style.position = 'absolute'; // 컨테이너 기준 상대 위치
                           const popupRect = popup.getBoundingClientRect();
                           popup.style.visibility = 'visible';

                           // 팝업 위치 우선순위: 아래쪽 → 위쪽 → 중앙 (컨테이너 내 상대 위치)
                           let top, left;

                           // 그룹 컨테이너 내에서의 상대 위치 계산
                           const containerHeight = groupContainer.offsetHeight;
                           const containerWidth = groupContainer.offsetWidth;
                           const pillBottom = groupPill.offsetTop + groupPill.offsetHeight;
                           const pillLeft = groupPill.offsetLeft;

                           // 1. 아래쪽 공간 확인 (기본 우선순위)
                           const belowSpace = containerHeight - pillBottom - 5;
                           if (belowSpace >= popupRect.height) {
                               // 아래쪽에 충분한 공간이 있음
                               top = pillBottom + 5;
                               left = Math.max(0, Math.min(pillLeft, containerWidth - popupRect.width));
                           } else {
                               // 2. 위쪽 공간 확인
                               const aboveSpace = groupPill.offsetTop - 5;
                               if (aboveSpace >= popupRect.height) {
                                   // 위쪽에 충분한 공간이 있음
                                   top = groupPill.offsetTop - popupRect.height - 5;
                                   left = Math.max(0, Math.min(pillLeft, containerWidth - popupRect.width));
                               } else {
                                   // 3. 양쪽 모두 공간 부족 - 컨테이너 중앙에 표시
                                   top = Math.max(0, (containerHeight - popupRect.height) / 2);
                                   left = Math.max(0, (containerWidth - popupRect.width) / 2);
                               }
                           }

                           // 최종 위치 설정 (컨테이너 경계 보장)
                           top = Math.max(0, Math.min(top, containerHeight - popupRect.height));
                           left = Math.max(0, Math.min(left, containerWidth - popupRect.width));

                           popup.style.top = `${top}px`;
                           popup.style.left = `${left}px`;
                           popup.classList.add('active');
                       }
                   };

                   groupPill.addEventListener('click', togglePopup);
                } else {
                    // Render individual job pills
                    groupJobs.sort((a, b) => {
                        const numA = parseInt(a.job_id.replace('CD', ''), 10);
                        const numB = parseInt(b.job_id.replace('CD', ''), 10);
                        return numA - numB;
                    });
                    
                    groupJobs.forEach(job => {
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
                    mstData = mstResult.reduce((acc, item) => {
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
            const response = await fetch(`/api/collection_schedule?view=${viewType}`);
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
                renderCalendar(data.schedule_data, today);
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
                fetchData('weekly');
            }
        });
    }

    monthlyBtn.addEventListener('click', () => {
        if (!monthlyBtn.classList.contains('active')) {
            monthlyBtn.classList.add('active');
            if (weeklyBtn) weeklyBtn.classList.remove('active');
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

    // 엑셀 템플릿 다운로드 버튼 이벤트 리스너
    const downloadExcelTemplateBtn = document.getElementById('downloadExcelTemplateBtn');
    if (downloadExcelTemplateBtn) {
        downloadExcelTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }

    // Initial load - 게스트는 월간으로 고정
    const urlParams = new URLSearchParams(window.location.search);
    const isGuest = urlParams.get('guest') === '1';
    const initialView = isGuest ? 'monthly' : 'weekly';
    fetchData(initialView);
}
