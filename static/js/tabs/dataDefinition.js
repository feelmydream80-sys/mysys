// 데이터 정의 탭 로직
// 전역 상태
let selectedGroup = null;
let selectedRow = null;
let isModalOpen = false;
let isInitialized = false;

export async function init() {
    // 중복 실행 방지
    if (isInitialized) {
        console.log('이미 초기화되었습니다.');
        return;
    }
    
    isInitialized = true;
    
    console.log('데이터 정의 탭 초기화');
    
    // F5 새로고침 시 전역 상태 초기화
    selectedGroup = null;
    selectedRow = null;
    isModalOpen = false;
    
    // 기존 모달이 남아있다면 제거
    const existingModal = document.querySelector('div[style*="rgba(0,0,0,0.5)"]');
    if (existingModal) {
        existingModal.remove();
    }
    
    // UI 요소 초기화 및 이벤트 리스너 설정
    setupUIElements();
    setupEventListeners();
    
    // DOM 로드 후에 버튼 이벤트 등록 보장
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupGroupActionButtons);
    } else {
        setupGroupActionButtons();
    }
    
    // API 데이터로 카드 렌더링
    await renderGroupCards();
    
    console.log('데이터 정의 탭 초기화 완료');
}

    // UI 요소 초기화 함수
    function setupUIElements() {
        // 검색 UI 추가
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = 'margin-bottom: 20px; display: flex; gap: 15px; align-items: center;';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = '검색어 입력 (코드+명칭)';
        searchInput.id = 'dataDefinitionSearch';
        searchInput.style.cssText = 'flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;';
        
        const displayOptions = document.createElement('div');
        displayOptions.style.cssText = 'display: flex; gap: 15px; align-items: center; font-size: 14px;';
        
        const codeNameLabel = document.createElement('label');
        codeNameLabel.innerHTML = '<input type="radio" name="displayOption" value="codeName" checked> 코드+명칭';
        
        const nameLabel = document.createElement('label');
        nameLabel.innerHTML = '<input type="radio" name="displayOption" value="name"> 명칭';
        
        const deletedLabel = document.createElement('label');
        deletedLabel.innerHTML = '<input type="radio" name="displayOption" value="deleted"> 삭제그룹';
        
        displayOptions.appendChild(codeNameLabel);
        displayOptions.appendChild(nameLabel);
        displayOptions.appendChild(deletedLabel);
        
        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(displayOptions);
        
        // 검색 컨테이너를 카드 컨테이너 위에 삽입
        const cardContainer = document.getElementById('definitionCardContainer');
        if (cardContainer && cardContainer.parentNode) {
            cardContainer.parentNode.insertBefore(searchContainer, cardContainer);
        }
        
        // 검색 이벤트 리스너 추가
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterGroups(searchTerm);
        });
        
        // 표시 옵션 변경 이벤트 리스너 추가
        document.querySelectorAll('input[name="displayOption"]').forEach(radio => {
            radio.addEventListener('change', updateDisplayOption);
        });
    }

    // 그룹 필터링 함수 - 대소문자 구분 없는 검색
    function filterGroups(searchTerm) {
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent;
            const matches = title.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (matches) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // 표시 옵션 업데이트 함수
    function updateDisplayOption() {
        const selectedOption = document.querySelector('input[name="displayOption"]:checked').value;
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            const titleElement = card.querySelector('.card-title');
            const originalText = titleElement.dataset.originalText || titleElement.textContent;
            
            // 원본 텍스트 저장 (한 번만)
            if (!titleElement.dataset.originalText) {
                titleElement.dataset.originalText = originalText;
            }
            
            // 선택된 옵션에 따라 텍스트 업데이트
            if (selectedOption === 'codeName') {
                // 코드+명칭 표시 (원본 텍스트 그대로)
                titleElement.textContent = originalText;
                // 모든 카드 표시
                card.style.display = 'block';
            } else if (selectedOption === 'name') {
                // 명칭만 표시 (CDXXX - 전체명칭에서 전체명칭만 추출)
                const nameMatch = originalText.match(/- (.+)$/);
                if (nameMatch) {
                    titleElement.textContent = nameMatch[1];
                } else {
                    titleElement.textContent = originalText;
                }
                // 모든 카드 표시
                card.style.display = 'block';
            } else if (selectedOption === 'deleted') {
                // 삭제 그룹만 표시 (use_yn = 'N'인 그룹)
                const isInactive = card.classList.contains('inactive-group');
                if (isInactive) {
                    // 삭제 그룹은 코드로 표시
                    const codeMatch = originalText.match(/(CD\d+)/);
                    if (codeMatch) {
                        titleElement.textContent = codeMatch[1];
                    } else {
                        titleElement.textContent = originalText;
                    }
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            }
        });
        
        // 검색 필터 적용 (삭제 그룹 필터와 함께 작동)
        const searchTerm = document.getElementById('dataDefinitionSearch').value.toLowerCase();
        filterGroups(searchTerm);
    }

    // API 호출 함수
    async function callAPI(endpoint, method = 'GET', data = null) {
        try {
            const url = `/api/${endpoint}`;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }
            
            console.log(`HTTP 요청: ${method} ${url}`, options);
            
            const response = await fetch(url, options);
            
            console.log(`HTTP 응답: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`API 응답 성공: ${endpoint}`, result);
            
            return result;
        } catch (error) {
            console.log(`API 호출 실패: ${endpoint}`, error);
            throw error;
        }
    }

    // 1. 그룹 카드 렌더링
    async function renderGroupCards() {
        const container = document.getElementById('definitionCardContainer');
        container.innerHTML = '';

        try {
            // API에서 전체 데이터 가져오기
            console.log('API에서 데이터 정의 그룹 정보 가져오기');
            const allData = await callAPI('data_definition/groups');
            console.log('API 응답 데이터:', allData);
            
            if (allData && allData.length > 0) {
                // 전체 데이터를 그룹별로 분류
                const groupedData = {};
                
                // 1단계: 모든 데이터를 먼저 수집
                const allItems = allData;
                
                // 2단계: 그룹 먼저 생성 (모든 데이터를 순회하며 그룹 찾기)
                allItems.forEach(item => {
                    const cd_cl = item.cd_cl;
                    // cd_cl이 100단위인 데이터를 그룹으로 정의
                    if (cd_cl && /^CD\d*00$/.test(cd_cl)) {
                        if (!groupedData[cd_cl]) {
                            // cd_cl과 cd가 같은 그룹 헤더 데이터 찾기
                            const groupHeader = allItems.find(headerItem => 
                                headerItem.cd_cl === cd_cl && headerItem.CD === cd_cl
                            );
                            
                            // 그룹 헤더가 있으면 그 데이터의 cd_nm을 사용, 없으면 현재 item의 cd_nm 사용
                            const groupName = groupHeader ? groupHeader.cd_nm : item.cd_nm;
                            
                            groupedData[cd_cl] = {
                                cd: cd_cl,
                                cd_nm: groupName,
                                count: 0,
                                activeCount: 0,
                                inactiveCount: 0,
                                details: [],
                                use_yn: groupHeader ? groupHeader.use_yn : 'Y' // 그룹 헤더의 use_yn 추가
                            };
                        }
                    }
                });
                
                // 3단계: 개별 데이터 할당 (모든 데이터를 다시 순회하며 할당)
                allItems.forEach(item => {
                    const cd_cl = item.cd_cl;
                    const cdValue = item.CD;
                    
                    // 개별 데이터인 경우 (cd가 100단위가 아닌 경우)
                    if (cdValue && !/^CD\d*00$/.test(cdValue)) {
                        // cd_cl에 따라 그룹 할당
                        if (groupedData[cd_cl]) {
                            groupedData[cd_cl].details.push(item);
                            groupedData[cd_cl].count++;
                            if (item.use_yn && (item.use_yn.trim() === 'T' || item.use_yn.trim() === 'Y')) {
                                groupedData[cd_cl].activeCount++;
                            } else {
                                groupedData[cd_cl].inactiveCount++;
                            }
                        }
                    }
                });
                
                // 그룹 배열로 변환
                const groups = Object.values(groupedData);
                console.log('분류된 그룹 데이터:', groups);
                
                // 그룹 코드 순서로 정렬 (오름차순) - 숫자 기반 정렬
                groups.sort((a, b) => {
                    const numA = parseInt(a.cd.replace('CD', ''));
                    const numB = parseInt(b.cd.replace('CD', ''));
                    return numA - numB;
                });
                
                // 카드 렌더링
                groups.forEach(group => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    
                    // use_yn에 따른 시각적 구분 적용
                    if (group.use_yn && group.use_yn.trim() === 'N') {
                        card.className = 'card inactive-group'; // 전체 비활성화
                    }
                    
                    card.innerHTML = `
                        <div class="card-header">
                            <div class="card-title" data-original-text="${group.cd} - ${group.cd_nm}">${group.cd} - ${group.cd_nm}</div>
                            <div style="font-size:0.9rem;color:#666;">총 ${group.count}건</div>
                        </div>
                        <div class="status-group">
                            <div class="status-item status-success">
                                <div>사용중</div>
                                <div style="font-weight:600;font-size:1.1rem;">${group.activeCount}</div>
                            </div>
                            <div class="status-item status-fail">
                                <div>사용안함</div>
                                <div style="font-weight:600;font-size:1.1rem;">${group.inactiveCount}</div>
                            </div>
                        </div>
                    `;
                    card.addEventListener('click', () => selectGroup(group));
                    container.appendChild(card);
                });
                
                // 카드 렌더링 후 표시 옵션 적용
                updateDisplayOption();
            } else {
                // API에서 데이터를 못 가져왔을 경우 에러 처리
                container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">그룹 데이터를 불러오지 못했습니다.</div>';
            }
        } catch (error) {
            console.log('그룹 데이터 로드 실패:', error);
            container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">그룹 데이터를 불러오지 못했습니다.</div>';
        }
    }

    // 2. 그룹 선택 처리
    function selectGroup(group) {
        // 기존 선택된 카드 스타일 초기화
        document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        
        // 선택된 카드 하이라이트
        const selectedCard = event.currentTarget;
        selectedCard.classList.add('selected');
        
        selectedGroup = group;
        
        // 상세 정보 패널 표시 및 데이터 로드
        loadGroupDetails(group.cd);
    }

    // 3. 그룹 상세 정보 로드 및 렌더링
    async function loadGroupDetails(groupCd) {
        console.log(`그룹 상세 정보 로드 시작: ${groupCd}`);
        
        const detailPanel = document.getElementById('detailPanel');
        const selectedGroupTitle = document.getElementById('selectedGroupTitle');
        const detailTableBody = document.getElementById('detailTableBody');

        // 타이틀 업데이트
        selectedGroupTitle.textContent = `${selectedGroup.cd} - ${selectedGroup.cd_nm}`;

        // 테이블 내용 초기화
        detailTableBody.innerHTML = '';

        // API에서 최신 데이터 직접 가져오기 (추가한 데이터 불러오기 문제 해결)
        const allData = await callAPI('data_definition/groups');
        const groupDetails = allData.filter(item => item.cd_cl === groupCd && item.CD !== groupCd) || [];

        // 테이블 헤더는 기본 열만 표시 (체크박스 열 추가)
        updateDetailTableHeader();

        if (groupDetails.length > 0) {
            // 상세 데이터 렌더링 (CD 기준 오름차순 정렬)
            groupDetails
                .sort((a, b) => a.CD.localeCompare(b.CD))
                .forEach(item => {
                    const row = renderDetailRow(item);
                    detailTableBody.appendChild(row);
                });
        } else {
            // 상세 데이터가 없을 경우
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="5" style="text-align: center; color: #94a3b8;">데이터가 없습니다.</td>';
            detailTableBody.appendChild(emptyRow);
        }

        // 상세 패널 표시
        detailPanel.style.display = 'block';
        
        // 버튼 영역에 추가 버튼 추가
        const buttonContainer = document.getElementById('buttonContainer');
        if (buttonContainer) {
            // 기존 버튼들 초기화
            buttonContainer.innerHTML = '';
            
            // 활성화 버튼 (멀티선택시 활성화)
            const activateBtn = document.createElement('button');
            activateBtn.id = 'activateBtn';
            activateBtn.textContent = '활성화';
            activateBtn.className = 'btn btn-success';
            activateBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;';
            activateBtn.disabled = true;
            activateBtn.addEventListener('click', () => activateSelectedItems());
            
            // 추가 버튼
            const addDetailBtn = document.createElement('button');
            addDetailBtn.textContent = '추가';
            addDetailBtn.className = 'btn btn-primary';
            addDetailBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;';
            addDetailBtn.addEventListener('click', () => showAddDetailModal(selectedGroup));
            
            // 수정 버튼
            const editBtn = document.createElement('button');
            editBtn.id = 'editBtn';
            editBtn.textContent = '수정';
            editBtn.className = 'btn';
            editBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; margin-right: 10px;';
            editBtn.disabled = true;
            editBtn.addEventListener('click', () => {
                if (selectedRow) {
                    showEditModal(selectedRow.item);
                } else {
                    showToast('데이터를 선택해주세요.', 'warning');
                }
            });
            
            // 삭제 버튼
            const deleteBtn = document.createElement('button');
            deleteBtn.id = 'deleteBtn';
            deleteBtn.textContent = '삭제';
            deleteBtn.className = 'btn';
            deleteBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
            deleteBtn.disabled = true;
            deleteBtn.addEventListener('click', () => {
                if (selectedRow) {
                    showDeleteConfirm(selectedRow.item);
                } else {
                    showToast('데이터를 선택해주세요.', 'warning');
                }
            });

            buttonContainer.appendChild(activateBtn);
            buttonContainer.appendChild(addDetailBtn);
            buttonContainer.appendChild(editBtn);
            buttonContainer.appendChild(deleteBtn);
        }
        
        // 버튼 상태 초기화
        updateActionButtons();
        
        console.log(`그룹 상세 정보 로드 완료: ${groupCd}`);
    }

    // 상세 테이블 헤더 업데이트 함수 (체크박스 열 추가)
    function updateDetailTableHeader() {
        const detailTable = document.querySelector('#detailPanel table');
        const thead = detailTable.querySelector('thead');
        
        // 기존 헤더 제거
        thead.innerHTML = '';
        
        // 새로운 헤더 생성
        const headerRow = document.createElement('tr');
        
        // 체크박스 열 추가
        const checkboxTh = document.createElement('th');
        const headerCheckbox = document.createElement('input');
        headerCheckbox.type = 'checkbox';
        headerCheckbox.id = 'headerCheckbox';
        headerCheckbox.addEventListener('change', toggleAllCheckboxes);
        checkboxTh.appendChild(headerCheckbox);
        headerRow.appendChild(checkboxTh);
        
        // 기본 열
        const defaultColumns = [
            { key: 'CD', label: '코드' },
            { key: 'cd_nm', label: '명칭' },
            { key: 'cd_desc', label: '활용목적' },
            { key: 'use_yn', label: '사용여부' },
            { key: 'update_dt', label: '수정일시' }
        ];
        
        // 기본 열 추가
        defaultColumns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
    }

    // 전체 체크박스 토글 함수
    function toggleAllCheckboxes() {
        const headerCheckbox = document.getElementById('headerCheckbox');
        const rowCheckboxes = document.querySelectorAll('#detailTableBody input[type="checkbox"]');
        
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = headerCheckbox.checked;
        });
        
        updateActionButtons();
    }

    // 선택된 행 활성화 함수
    async function activateSelectedItems() {
        const selectedCheckboxes = document.querySelectorAll('#detailTableBody input[type="checkbox"]:checked');
        const selectedItems = [];
        
        selectedCheckboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const cd = row.querySelector('td:nth-child(2)').textContent;
            selectedItems.push(cd);
        });
        
        if (selectedItems.length < 2) {
            showToast('활성화할 항목을 2개 이상 선택해주세요.', 'warning');
            return;
        }
        
        try {
            for (const cd of selectedItems) {
                await callAPI(`data_definition/detail/${cd}`, 'PUT', { use_yn: 'Y' });
            }
            
            showToast(`선택된 ${selectedItems.length}개의 항목이 활성화되었습니다.`, 'success');
            await loadGroupDetails(selectedGroup.cd);
        } catch (error) {
            console.error('활성화 실패:', error);
            showToast('항목 활성화에 실패했습니다.', 'error');
        }
    }

    // Mock 데이터 렌더링 함수
    function renderMockDetails(groupCd) {
        const detailTableBody = document.getElementById('detailTableBody');
        const details = mockData.details[groupCd] || [];

        if (details.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="4" style="text-align: center; color: #94a3b8;">데이터가 없습니다.</td>';
            detailTableBody.appendChild(emptyRow);
        } else {
            details.forEach(item => {
                const row = renderDetailRow(item);
                detailTableBody.appendChild(row);
            });
        }
    }

    // API 데이터 렌더링 함수
    function renderDetailRows(details) {
        const detailTableBody = document.getElementById('detailTableBody');
        
        if (details.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="4" style="text-align: center; color: #94a3b8;">데이터가 없습니다.</td>';
            detailTableBody.appendChild(emptyRow);
        } else {
            details.forEach(item => {
                const row = renderDetailRow(item);
                detailTableBody.appendChild(row);
            });
        }
    }

    // 4. 상세 행 렌더링 (use_yn에 따른 시각적 구분 포함)
    function renderDetailRow(item) {
        const row = document.createElement('tr');
        
    // use_yn이 'T'나 'Y'가 아닌 경우(사용안함) 시각적 구분 적용
        if (!item.use_yn || item.use_yn.trim() === 'N') {
            row.className = 'inactive-row';
        }
        
        // 행 클릭 이벤트 추가 - 체크박스 토글 기능
        row.addEventListener('click', (e) => {
            // 체크박스 자체를 클릭한 경우 이벤트 전파 방지
            if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                updateActionButtons();
                return;
            }
            
            // 체크박스 상태 토글
            const checkbox = row.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            // 행 선택 처리
            selectDetailRow(row, item);
        });
        
        row.innerHTML = `
            <td><input type="checkbox" onchange="updateActionButtons()"></td>
            <td>${item.CD}</td>
            <td>${item.cd_nm}</td>
            <td>${item.cd_desc || ''}</td>
            <td>${(item.use_yn && (item.use_yn.trim() === 'T' || item.use_yn.trim() === 'Y')) ? '사용중' : '사용안함'}</td>
            <td>${item.update_dt || ''}</td>
        `;
        
        return row;
    }

    // 5. 상세 행 선택 처리
    function selectDetailRow(row, item) {
        // 기존 선택된 행 스타일 초기화
        document.querySelectorAll('#detailTableBody tr').forEach(r => r.style.backgroundColor = '');
        
        // 선택된 행 하이라이트
        row.style.backgroundColor = '#e6f7ee';
        
        selectedRow = { row, item };
        
        // 액션 버튼 활성화
        updateActionButtons();
    }

    // Toast 알림 함수
    function showToast(message, type = 'info') {
        // 기존 toast가 있으면 제거
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Toast 요소 생성
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #3b82f6;
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;

        // 타입에 따라 색상 변경
        switch(type) {
            case 'success':
                toast.style.borderLeftColor = '#10b981';
                break;
            case 'error':
                toast.style.borderLeftColor = '#ef4444';
                break;
            case 'warning':
                toast.style.borderLeftColor = '#f59e0b';
                break;
            default:
                toast.style.borderLeftColor = '#3b82f6';
        }

        // 메시지 내용
        toast.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">알림</div>
            <div style="font-size: 0.9rem; color: #374151;">${message}</div>
        `;

        // 슬라이드 인 애니메이션 스타일 추가
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // DOM에 추가
        document.body.appendChild(toast);

        // 3초 후 자동 제거
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // 6. 액션 버튼 상태 업데이트
    function updateActionButtons() {
        const editBtn = document.getElementById('editBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const activateBtn = document.getElementById('activateBtn');
        const addDetailBtn = document.querySelector('#buttonContainer .btn-primary');
        
        const selectedCheckboxes = document.querySelectorAll('#detailTableBody input[type="checkbox"]:checked');
        const hasSelectedCheckboxes = selectedCheckboxes.length > 0;
        const hasMultipleSelected = selectedCheckboxes.length >= 2;
        
        if (hasMultipleSelected) {
            // 멀티선택 상태: 활성화 버튼 활성화, 추가/수정 버튼 비활성화
            activateBtn.disabled = false;
            addDetailBtn.disabled = true;
            editBtn.disabled = true;
            deleteBtn.disabled = true;
        } else if (hasSelectedCheckboxes) {
            // 단일 선택 상태: 활성화 버튼 비활성화, 추가/수정/삭제 버튼 활성화
            activateBtn.disabled = true;
            addDetailBtn.disabled = false;
            editBtn.disabled = false;
            deleteBtn.disabled = false;
        } else {
            // 선택 없음: 활성화 버튼 비활성화, 추가 버튼 활성화
            activateBtn.disabled = true;
            addDetailBtn.disabled = false;
            
            if (selectedRow) {
                editBtn.disabled = false;
                deleteBtn.disabled = false;
            } else {
                editBtn.disabled = true;
                deleteBtn.disabled = true;
            }
        }
    }

    // 7. 이벤트 리스너 설정
    function setupEventListeners() {
        // 이벤트 리스너 중복 등록 방지
        if (setupEventListeners.hasRun) {
            return;
        }
        setupEventListeners.hasRun = true;

        const editBtn = document.getElementById('editBtn');
        const deleteBtn = document.getElementById('deleteBtn');

        // 수정 버튼 클릭
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                if (selectedRow) {
                    showEditModal(selectedRow.item);
                } else {
                    showToast('데이터를 선택해주세요.', 'warning');
                }
            });
        }

        // 삭제 버튼 클릭
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (selectedRow) {
                    showDeleteConfirm(selectedRow.item);
                } else {
                    showToast('데이터를 선택해주세요.', 'warning');
                }
            });
        }
    }
    // setupEventListeners 함수가 실행되었는지 추적
    setupEventListeners.hasRun = false;

    // 8. 그룹 액션 버튼 설정
    function setupGroupActionButtons() {
        // 이벤트 리스너 중복 등록 방지
        if (setupGroupActionButtons.hasRun) {
            return;
        }
        setupGroupActionButtons.hasRun = true;

        console.log('setupGroupActionButtons 함수 실행');
        
        const addGroupBtn = document.getElementById('addGroupBtn');
        const editGroupBtn = document.getElementById('editGroupBtn');
        const deleteGroupBtn = document.getElementById('deleteGroupBtn');

        console.log('DOM 요소 접근 결과:');
        console.log('addGroupBtn:', addGroupBtn);
        console.log('editGroupBtn:', editGroupBtn);
        console.log('deleteGroupBtn:', deleteGroupBtn);

        // 기존 이벤트 리스너 제거 후 재등록
        if (addGroupBtn) {
            // 기존 이벤트 리스너 제거
            const newAddGroupBtn = addGroupBtn.cloneNode(true);
            addGroupBtn.parentNode.replaceChild(newAddGroupBtn, addGroupBtn);
            
            console.log('addGroupBtn 버튼에 이벤트 리스너 등록');
            newAddGroupBtn.addEventListener('click', () => {
                console.log('addGroupBtn 버튼 클릭 감지');
                showAddGroupModal();
            });
        }

        if (editGroupBtn) {
            // 기존 이벤트 리스너 제거
            const newEditGroupBtn = editGroupBtn.cloneNode(true);
            editGroupBtn.parentNode.replaceChild(newEditGroupBtn, editGroupBtn);
            
            newEditGroupBtn.addEventListener('click', () => {
                if (selectedGroup) {
                    showEditGroupModal(selectedGroup);
                } else {
                    alert('수정할 그룹을 먼저 선택해주세요.');
                }
            });
        }

        if (deleteGroupBtn) {
            // 기존 이벤트 리스너 제거
            const newDeleteGroupBtn = deleteGroupBtn.cloneNode(true);
            deleteGroupBtn.parentNode.replaceChild(newDeleteGroupBtn, deleteGroupBtn);
            
            newDeleteGroupBtn.addEventListener('click', () => {
                if (selectedGroup) {
                    showDeleteGroupConfirm(selectedGroup);
                } else {
                    alert('삭제할 그룹을 먼저 선택해주세요.');
                }
            });
        }
    }
    // setupGroupActionButtons 함수가 실행되었는지 추적
    setupGroupActionButtons.hasRun = false;

    // 9. 그룹 추가 모달 표시 (tb_con_mst 스키마 기반)
    function showAddGroupModal() {
        // 모달이 이미 열려있는지 확인
        if (isModalOpen === true) {
            console.log('모달이 이미 열려있습니다.');
            return;
        }

        isModalOpen = true;

        // 모달 폼 생성
        let formHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <h4 style="margin-bottom: 15px; color: #333;">새 그룹 추가</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">그룹 코드 (cd_cl)</label>
                        <div style="position: relative; height: 40px;">
                            <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">CD</span>
                            <input type="text" id="newGroupCdCl" placeholder="숫자만 입력하세요" 
                                   style="width: 100%; padding: 8px 8px 8px 35px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, ''); validateAddGroupModal();">
                        </div>
                        <div id="newGroupCdClError" style="color: #dc3545; font-size: 0.85rem; margin-top: 3px; display: none;">
                            기존에 존재하는 그룹 코드입니다.
                        </div>
                        <div id="newGroupCdClFormatError" style="color: #dc3545; font-size: 0.85rem; margin-top: 3px; display: none;">
                            그룹 코드는 100배수로 입력해주세요 (예: 100, 200, 300...)
                        </div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 코드 (cd)</label>
                        <div style="position: relative; height: 40px;">
                            <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">CD</span>
                            <input type="text" id="newGroupCd" placeholder="숫자만 입력하세요" 
                                   style="width: 100%; padding: 8px 8px 8px 35px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, ''); validateAddGroupModal();">
                        </div>
                        <div id="newGroupCdError" style="color: #dc3545; font-size: 0.85rem; margin-top: 3px; display: none;">
                            기존에 존재하는 데이터 코드입니다.
                        </div>
                        <div id="newGroupCdRangeError" style="color: #dc3545; font-size: 0.85rem; margin-top: 3px; display: none;">
                            데이터 코드는 그룹 코드 + 99 이내로 입력해주세요
                        </div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 명칭 (cd_nm)</label>
                        <input type="text" id="newGroupNm" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                               oninput="validateAddGroupModal();">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">활용목적 (cd_desc)</label>
                        <input type="text" id="newGroupDesc" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item1</label>
                        <input type="text" id="newGroupItem1" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item2</label>
                        <input type="text" id="newGroupItem2" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item3</label>
                        <input type="text" id="newGroupItem3" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item4</label>
                        <input type="text" id="newGroupItem4" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item5</label>
                        <input type="text" id="newGroupItem5" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item6</label>
                        <input type="text" id="newGroupItem6" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item7</label>
                        <input type="text" id="newGroupItem7" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item8</label>
                        <input type="text" id="newGroupItem8" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item9</label>
                        <input type="text" id="newGroupItem9" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item10</label>
                        <input type="text" id="newGroupItem10" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>
            </div>
        `;

        // 커스텀 모달 생성
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 800px;
            max-width: 90%;
            max-height: 80%;
            overflow: auto;
        `;
        modalContent.innerHTML = formHTML;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '추가';
        saveBtn.className = 'btn btn-primary';
        saveBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';
        saveBtn.disabled = true;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '취소';
        cancelBtn.className = 'btn';
        cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 이벤트 핸들러
        cancelBtn.addEventListener('click', () => {
            isModalOpen = false;
            document.body.removeChild(modal);
        });

        // 유효성 검증 함수 - 비밀번호 변경 창의 실시간 검증 방식 적용
        async function validateAddGroupModal() {
            const cdClInput = document.getElementById('newGroupCdCl');
            const cdInput = document.getElementById('newGroupCd');
            const cdNmInput = document.getElementById('newGroupNm');
            
            const cdClValue = cdClInput.value.trim();
            const cdValue = cdInput.value.trim();
            const cdNmValue = cdNmInput.value.trim();
            
            let isValid = true;
            
            // 1. cd_cl 필수값 체크
            if (!cdClValue) {
                isValid = false;
            } else {
                // 3. cd_cl 100배수 체크
                const cdClNum = parseInt(cdClValue);
                if (isNaN(cdClNum) || cdClNum % 100 !== 0) {
                    document.getElementById('newGroupCdClFormatError').style.display = 'block';
                    cdClInput.style.borderColor = '#dc3545';
                    isValid = false;
                } else {
                    document.getElementById('newGroupCdClFormatError').style.display = 'none';
                    // 4. cd_cl 중복 체크
                    try {
                        const allData = await callAPI('data_definition/groups');
                        const exists = allData.some(item => item.CD === 'CD' + cdClValue);
                        if (exists) {
                            document.getElementById('newGroupCdClError').style.display = 'block';
                            cdClInput.style.borderColor = '#dc3545';
                            isValid = false;
                        } else {
                            document.getElementById('newGroupCdClError').style.display = 'none';
                            cdClInput.style.borderColor = '#ddd';
                        }
                    } catch (error) {
                        console.log('중복 체크 실패:', error);
                        document.getElementById('newGroupCdClError').style.display = 'none';
                        cdClInput.style.borderColor = '#ddd';
                    }
                }
            }
            
            // 2. cd 필수값 체크
            if (!cdValue) {
                isValid = false;
            } else {
                // 6. cd 값이 cd_cl + 99 이내 체크
                if (cdClValue) {
                    const cdClNum = parseInt(cdClValue);
                    const cdNum = parseInt(cdValue);
                    if (cdNum < cdClNum || cdNum > cdClNum + 99) {
                        document.getElementById('newGroupCdRangeError').style.display = 'block';
                        cdInput.style.borderColor = '#dc3545';
                        isValid = false;
                    } else {
                        document.getElementById('newGroupCdRangeError').style.display = 'none';
                        // 5. cd 중복 체크
                        try {
                            const allData = await callAPI('data_definition/groups');
                            const exists = allData.some(item => item.CD === 'CD' + cdValue);
                            if (exists) {
                                document.getElementById('newGroupCdError').style.display = 'block';
                                cdInput.style.borderColor = '#dc3545';
                                isValid = false;
                            } else {
                                document.getElementById('newGroupCdError').style.display = 'none';
                                cdInput.style.borderColor = '#ddd';
                            }
                        } catch (error) {
                            console.log('중복 체크 실패:', error);
                            document.getElementById('newGroupCdError').style.display = 'none';
                            cdInput.style.borderColor = '#ddd';
                        }
                    }
                }
            }
            
            // 2. cd_nm 필수값 체크
            if (!cdNmValue) {
                isValid = false;
            }
            
            // 추가 버튼 활성화/비활성화
            saveBtn.disabled = !isValid;
        }
        
        // 입력 필드에 이벤트 리스너 추가 (비밀번호 변경 창의 접근 방식 적용)
        document.getElementById('newGroupCdCl').addEventListener('input', validateAddGroupModal);
        document.getElementById('newGroupCd').addEventListener('input', validateAddGroupModal);
        document.getElementById('newGroupNm').addEventListener('input', validateAddGroupModal);
        
        // 초기 상태 버튼 비활성화
        saveBtn.disabled = true;

        saveBtn.addEventListener('click', async () => {
            const cd_cl = 'CD' + document.getElementById('newGroupCdCl').value.trim();
            const cd = 'CD' + document.getElementById('newGroupCd').value.trim();
            const cd_nm = document.getElementById('newGroupNm').value.trim();
            const cd_desc = document.getElementById('newGroupDesc').value.trim();
            const item1 = document.getElementById('newGroupItem1').value.trim();
            const item2 = document.getElementById('newGroupItem2').value.trim();
            const item3 = document.getElementById('newGroupItem3').value.trim();
            const item4 = document.getElementById('newGroupItem4').value.trim();
            const item5 = document.getElementById('newGroupItem5').value.trim();
            const item6 = document.getElementById('newGroupItem6').value.trim();
            const item7 = document.getElementById('newGroupItem7').value.trim();
            const item8 = document.getElementById('newGroupItem8').value.trim();
            const item9 = document.getElementById('newGroupItem9').value.trim();
            const item10 = document.getElementById('newGroupItem10').value.trim();

            // 기존 데이터 확인 (비활성화된 그룹인지)
            const allData = await callAPI('data_definition/groups');
            const existingGroup = allData.find(item => item.CD === cd && item.use_yn === 'N');
            
            if (existingGroup) {
                // 비활성화된 그룹인 경우 활성화 여부 확인
                const confirmActivate = confirm(`이 그룹은 이미 비활성화된 상태입니다.\n그룹을 활성화하시겠습니까?`);
                if (confirmActivate) {
                    // 그룹 활성화 (수정) API 호출
                    const updateData = {
                        cd_cl: cd_cl,
                        cd: cd,
                        cd_nm: cd_nm,
                        cd_desc: cd_desc || '',
                        item1: item1 || '',
                        item2: item2 || '',
                        item3: item3 || '',
                        item4: item4 || '',
                        item5: item5 || '',
                        item6: item6 || '',
                        item7: item7 || '',
                        item8: item8 || '',
                        item9: item9 || '',
                        item10: item10 || '',
                        use_yn: 'Y'
                    };
                    
                    try {
                        await callAPI(`data_definition/group/${cd}`, 'PUT', updateData);
                        alert('그룹이 활성화되었습니다.');
                        
                        // 모달 닫기
                        isModalOpen = false;
                        document.body.removeChild(modal);
                        
                        // 화면 업데이트
                        await renderGroupCards();
                    } catch (error) {
                        console.error('그룹 활성화 실패:', error);
                        alert('그룹 활성화에 실패했습니다.');
                    }
                } else {
                    // 활성화를 선택하지 않은 경우 모달 유지
                    return;
                }
            } else {
                // 새 그룹 추가를 위한 데이터 준비
                const newGroupData = {
                    cd_cl: cd,
                    cd: cd,
                    cd_nm: cd_nm,
                    cd_desc: cd_desc || '',
                    item1: item1 || '',
                    item2: item2 || '',
                    item3: item3 || '',
                    item4: item4 || '',
                    item5: item5 || '',
                    item6: item6 || '',
                    item7: item7 || '',
                    item8: item8 || '',
                    item9: item9 || '',
                    item10: item10 || '',
                    use_yn: 'Y'
                };

                // 새 그룹 추가 API 호출
                try {
                    await callAPI('data_definition/create', 'POST', newGroupData);
                    alert('새 그룹이 추가되었습니다.');
                    
                    // 모달 닫기
                    isModalOpen = false;
                    document.body.removeChild(modal);
                    
                    // 화면 업데이트
                    await renderGroupCards();
                } catch (error) {
                    console.error('그룹 추가 실패:', error);
                    alert('그룹 추가에 실패했습니다.');
                }
            }
        });
    }

    // 10. 그룹 수정 모달 표시
    async function showEditGroupModal(group) {
        try {
            // API에서 현재 그룹의 헤더 데이터를 직접 가져오기
            const allData = await callAPI('data_definition/groups');
            const groupHeader = allData.find(item => item.cd_cl === group.cd && item.CD === group.cd);
            
            // 모달에 사용할 데이터 로그 출력 (디버깅용)
            console.log('그룹 수정 모달 사용 데이터:', {
                group: group,
                groupHeader: groupHeader,
                use_yn: group.use_yn,
                trimmed_use_yn: group.use_yn ? group.use_yn.trim() : 'undefined'
            });
            
            // 모달 폼 생성 (그룹 추가 모달과 동일한 형식)
            let formHTML = `
                <div style="max-height: 400px; overflow-y: auto;">
                    <h4 style="margin-bottom: 15px; color: #333;">그룹 수정</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">그룹 코드 (cd_cl)</label>
                            <input type="text" id="editGroupCdCl" value="${groupHeader?.cd_cl || group.cd}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 코드 (cd)</label>
                            <input type="text" id="editGroupCd" value="${group.cd}" disabled
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background-color: #f5f5f5;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 명칭 (cd_nm)</label>
                            <input type="text" id="editGroupNm" value="${group.cd_nm}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">활용목적 (cd_desc)</label>
                            <input type="text" id="editGroupDesc" value="${groupHeader?.cd_desc || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item1</label>
                            <input type="text" id="editGroupItem1" value="${groupHeader?.item1 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item2</label>
                            <input type="text" id="editGroupItem2" value="${groupHeader?.item2 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item3</label>
                            <input type="text" id="editGroupItem3" value="${groupHeader?.item3 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item4</label>
                            <input type="text" id="editGroupItem4" value="${groupHeader?.item4 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item5</label>
                            <input type="text" id="editGroupItem5" value="${groupHeader?.item5 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item6</label>
                            <input type="text" id="editGroupItem6" value="${groupHeader?.item6 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item7</label>
                            <input type="text" id="editGroupItem7" value="${groupHeader?.item7 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item8</label>
                            <input type="text" id="editGroupItem8" value="${groupHeader?.item8 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item9</label>
                            <input type="text" id="editGroupItem9" value="${groupHeader?.item9 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">item10</label>
                            <input type="text" id="editGroupItem10" value="${groupHeader?.item10 || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">사용여부</label>
                            <select id="editGroupUseYn" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                                <option value="Y" ${group.use_yn && group.use_yn.trim() === 'Y' ? 'selected' : ''}>사용중</option>
                                <option value="N" ${group.use_yn && group.use_yn.trim() === 'N' ? 'selected' : ''}>사용안함</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            
            // 모달 생성 및 표시
            createAndShowEditGroupModal(formHTML, group);
        } catch (error) {
            console.log('그룹 데이터 로드 실패:', error);
            alert('그룹 데이터를 불러오는데 실패했습니다.');
        }
    }
    
    // 그룹 수정 모달 생성 및 표시 함수
    function createAndShowEditGroupModal(formHTML, group) {
        // 커스텀 모달 생성
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 800px;
            max-width: 90%;
            max-height: 80%;
            overflow: auto;
        `;
        modalContent.innerHTML = formHTML;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '저장';
        saveBtn.className = 'btn btn-primary';
        saveBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '취소';
        cancelBtn.className = 'btn';
        cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 이벤트 핸들러
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        saveBtn.addEventListener('click', async () => {
            const cd_cl = document.getElementById('editGroupCdCl').value.trim();
            const cd_nm = document.getElementById('editGroupNm').value.trim();
            const cd_desc = document.getElementById('editGroupDesc').value.trim();
            
            // item1~10 값 수집 (모든 item 필드 포함)
            const itemValues = {};
            const itemFields = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'];
            itemFields.forEach(key => {
                const element = document.getElementById(`editGroup${key.charAt(0).toUpperCase() + key.slice(1)}`);
                if (element) {
                    itemValues[key] = element.value.trim();
                }
            });

            if (!cd_cl || !cd_nm) {
                alert('그룹 코드(cd_cl)와 데이터 명칭(cd_nm)을 모두 입력해주세요.');
                return;
            }

            // 그룹 수정을 위한 데이터 준비
            const updateData = {
                cd_cl: cd_cl,
                cd: group.cd,
                cd_nm: cd_nm,
                cd_desc: cd_desc || '',
                ...itemValues,
                use_yn: document.getElementById('editGroupUseYn').value.trim() === 'Y' ? 'Y' : 'N'
            };

            try {
                // 그룹 수정 API 호출
                await callAPI(`data_definition/group/${group.cd}`, 'PUT', updateData);
                alert('그룹이 수정되었습니다.');
                
                // 모달 닫기
                document.body.removeChild(modal);
                
                // 화면 업데이트
                await renderGroupCards();
            } catch (error) {
                console.error('그룹 수정 실패:', error);
                alert('그룹 수정에 실패했습니다.');
            }
        });
    }

    // 11. 그룹 삭제 확인 표시
    async function showDeleteGroupConfirm(group) {
        const confirmDelete = confirm(
            `그룹 코드: ${group.cd}\n그룹 명칭: ${group.cd_nm}\n\n이 그룹을 삭제하시겠습니까?\n(그룹 내 모든 데이터가 사용안함으로 변경됩니다)`
        );
        
        if (confirmDelete) {
            try {
                // 그룹 삭제 API 호출 (소프트 삭제)
                await callAPI(`data_definition/group/${group.cd}`, 'DELETE');
                alert('그룹이 사용안함으로 변경되었습니다.');
                
                // 화면 업데이트
                await renderGroupCards();
            } catch (error) {
                console.error('그룹 삭제 실패:', error);
                alert('그룹 삭제에 실패했습니다.');
            }
        }
    }

    // 8. 수정 모달 표시
    async function showEditModal(item) {
        try {
            // 그룹 헤더의 item1~10 필드 정보 가져오기
            let groupItemFields = [];
            const allData = await callAPI('data_definition/groups');
            const groupHeader = allData.find(header => header.cd_cl === item.cd_cl && header.CD === item.cd_cl);
            if (groupHeader) {
                const itemFields = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'];
                itemFields.forEach(key => {
                    const value = groupHeader[key];
                    if (value !== null && value !== undefined && value.toString().trim() !== '' && value.toString().toUpperCase() !== 'NULL') {
                        groupItemFields.push({
                            key: key,
                            label: value
                        });
                    }
                });
            }
            
            // 모달 폼 생성
            let formHTML = `
                <div style="max-height: 400px; overflow-y: auto;">
                    <h4 style="margin-bottom: 15px; color: #333;">${item.CD} - ${item.cd_nm} 수정</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 코드</label>
                            <input type="text" id="editDetailCd" value="${item.CD}" disabled
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background-color: #f5f5f5;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 명칭</label>
                            <input type="text" id="editDetailNm" value="${item.cd_nm}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">활용목적</label>
                            <input type="text" id="editDetailDesc" value="${item.cd_desc || ''}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">사용여부</label>
                            <select id="editDetailUseYn" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                                <option value="Y" ${(item.use_yn === 'T' || item.use_yn === 'Y') ? 'selected' : ''}>사용중</option>
                                <option value="N" ${item.use_yn === 'N' ? 'selected' : ''}>사용안함</option>
                            </select>
                        </div>
            `;
            
            // 그룹 설정된 필드만 표시
            groupItemFields.forEach(field => {
                formHTML += `
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">${field.label}</label>
                        <input type="text" id="editDetail${field.key}" value="${item[field.key] || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                `;
            });

            formHTML += `
                    </div>
                </div>
            `;
            
            // 모달 생성 및 표시
            createAndShowEditModal(formHTML, item, groupItemFields);
        } catch (error) {
            console.log('상세 데이터 로드 실패:', error);
            alert('상세 데이터를 불러오는데 실패했습니다.');
        }
    }
    
    // 수정 모달 생성 및 표시 함수
    function createAndShowEditModal(formHTML, item, groupItemFields) {
        // 커스텀 모달 생성
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 600px;
            max-width: 90%;
            max-height: 80%;
            overflow: auto;
        `;
        modalContent.innerHTML = formHTML;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '저장';
        saveBtn.className = 'btn btn-primary';
        saveBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '취소';
        cancelBtn.className = 'btn';
        cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 이벤트 핸들러
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        saveBtn.addEventListener('click', async () => {
            const cd_nm = document.getElementById('editDetailNm').value.trim();
            const cd_desc = document.getElementById('editDetailDesc').value.trim();
            const use_yn = document.getElementById('editDetailUseYn').value;

            if (!cd_nm) {
                alert('데이터 명칭을 입력해주세요.');
                return;
            }

            // item1~10 값 수집
            const itemValues = {};
            groupItemFields.forEach(field => {
                itemValues[field.key] = document.getElementById(`editDetail${field.key}`)?.value.trim() || '';
            });

            // 데이터 수정을 위한 데이터 준비
            const updateData = {
                cd_cl: item.cd_cl,
                cd: item.CD,
                cd_nm: cd_nm,
                cd_desc: cd_desc || '',
                ...itemValues,
                use_yn: use_yn
            };

            try {
                // 데이터 수정 API 호출
                await callAPI(`data_definition/detail/${item.CD}`, 'PUT', updateData);
                alert('데이터가 수정되었습니다.');
                
                // 모달 닫기
                document.body.removeChild(modal);
                
                // 화면 업데이트
                await loadGroupDetails(selectedGroup.cd);
            } catch (error) {
                console.error('데이터 수정 실패:', error);
                alert('데이터 수정에 실패했습니다.');
            }
        });
    }

    // 9. 삭제 확인 표시
    function showDeleteConfirm(item) {
        const confirmDelete = confirm(
            `코드: ${item.cd}\n명칭: ${item.cd_nm}\n\n이 항목을 삭제하시겠습니까?\n(사용여부가 'N'으로 변경됩니다)`
        );
        
        if (confirmDelete) {
            // Mock: 소프트 삭제 시뮬레이션
            item.use_yn = 'N';
            item.del_dt = new Date().toLocaleString('ko-KR');
            
            // 그룹 통계 업데이트
            selectedGroup.activeCount = Math.max(0, selectedGroup.activeCount - 1);
            selectedGroup.inactiveCount = selectedGroup.count - selectedGroup.activeCount;
            
            // 화면 업데이트
            loadGroupDetails(selectedGroup.cd);
            
            alert('삭제 처리가 완료되었습니다.');
        }
    }


    // 12. 상세 항목 추가 모달 표시
    async function showAddDetailModal(group) {
        try {
            // 그룹 헤더의 item1~10 필드 정보 가져오기
            let groupItemFields = [];
            const allData = await callAPI('data_definition/groups');
            const groupHeader = allData.find(item => item.cd_cl === group.cd && item.CD === group.cd);
            if (groupHeader) {
                const itemFields = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'];
                itemFields.forEach(key => {
                    const value = groupHeader[key];
                    if (value !== null && value !== undefined && value.toString().trim() !== '' && value.toString().toUpperCase() !== 'NULL') {
                        groupItemFields.push({
                            key: key,
                            label: value
                        });
                    }
                });
            }
            
            // 모달 폼 생성
            let formHTML = `
                <div style="max-height: 400px; overflow-y: auto;">
                    <h4 style="margin-bottom: 15px; color: #333;">${group.cd} - ${group.cd_nm} 추가</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 코드</label>
                            <input type="text" id="newDetailCd" placeholder="" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 명칭</label>
                            <input type="text" id="newDetailNm" placeholder="" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">활용목적</label>
                            <input type="text" id="newDetailDesc" placeholder="" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">사용여부</label>
                            <select id="newDetailUseYn" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                                <option value="Y">사용중</option>
                                <option value="N">사용안함</option>
                            </select>
                        </div>
            `;
            
            // 그룹 설정된 필드만 표시
            groupItemFields.forEach(field => {
                formHTML += `
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">${field.label}</label>
                        <input type="text" id="newDetail${field.key}" placeholder="" 
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                    </div>
                `;
            });

            formHTML += `
                    </div>
                </div>
            `;
            
            // 모달 생성 및 표시
            createAndShowModal(formHTML, group, groupItemFields);
        } catch (error) {
            console.log('상세 데이터 로드 실패:', error);
            alert('상세 데이터를 불러오는데 실패했습니다.');
        }
    }
    
    // 모달 생성 및 표시 함수
    function createAndShowModal(formHTML, group, groupItemFields) {
        // 커스텀 모달 생성
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 600px;
            max-width: 90%;
            max-height: 80%;
            overflow: auto;
        `;
        modalContent.innerHTML = formHTML;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '추가';
        saveBtn.className = 'btn btn-primary';
        saveBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '취소';
        cancelBtn.className = 'btn';
        cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';

        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(saveBtn);
        modalContent.appendChild(buttonContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // 데이터 코드 입력 필드 유효성 검증
        const cdInput = document.getElementById('newDetailCd');
        const cdError = document.createElement('div');
        cdError.id = 'newDetailCdError';
        cdError.style.cssText = 'color: #dc3545; font-size: 0.85rem; margin-top: 3px; display: none;';
        cdInput.parentNode.appendChild(cdError);
        
        cdInput.addEventListener('input', () => {
            const cdValue = cdInput.value.trim();
            const cdNum = parseInt(cdValue.replace('CD', ''));
            
            // 100의 배수 체크
            if (cdNum % 100 === 0) {
                cdError.textContent = '데이터 코드는 100의 배수 값을 사용할 수 없습니다 (그룹에서만 사용 가능).';
                cdError.style.display = 'block';
                cdInput.style.borderColor = '#dc3545';
                saveBtn.disabled = true;
            } else {
                cdError.style.display = 'none';
                cdInput.style.borderColor = '#ddd';
                validateAddModal();
            }
        });

        // 이벤트 핸들러
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // 모달 유효성 검증 함수
        async function validateAddModal() {
            const cd = document.getElementById('newDetailCd').value.trim();
            const cd_nm = document.getElementById('newDetailNm').value.trim();
            
            let isValid = true;
            
            // 필수값 체크
            if (!cd || !cd_nm) {
                isValid = false;
            }
            
            // 데이터 코드 100의 배수 체크
            const cdNum = parseInt(cd.replace('CD', ''));
            if (cdNum % 100 === 0) {
                isValid = false;
            }
            
            // 중복 체크
            const allData = await callAPI('data_definition/groups');
            const exists = allData.some(item => item.cd_cl === group.cd && item.CD === cd);
            if (exists) {
                isValid = false;
                document.getElementById('newDetailCdError').textContent = '이미 존재하는 데이터 코드입니다.';
                document.getElementById('newDetailCdError').style.display = 'block';
                cdInput.style.borderColor = '#dc3545';
            } else if (!document.getElementById('newDetailCdError').textContent.includes('이미 존재')) {
                document.getElementById('newDetailCdError').style.display = 'none';
                cdInput.style.borderColor = '#ddd';
            }
            
            saveBtn.disabled = !isValid;
        }
        
        // 입력 필드에 이벤트 리스너 추가
        document.getElementById('newDetailCd').addEventListener('input', validateAddModal);
        document.getElementById('newDetailNm').addEventListener('input', validateAddModal);

        saveBtn.addEventListener('click', async () => {
            const cd = document.getElementById('newDetailCd').value.trim();
            const cd_nm = document.getElementById('newDetailNm').value.trim();
            const cd_desc = document.getElementById('newDetailDesc').value.trim();
            const use_yn = document.getElementById('newDetailUseYn').value;

            if (!cd || !cd_nm) {
                alert('데이터 코드와 명칭을 모두 입력해주세요.');
                return;
            }

            // item1~10 값 수집
            const itemValues = {};
            groupItemFields.forEach(field => {
                itemValues[field.key] = document.getElementById(`newDetail${field.key}`)?.value.trim() || '';
            });

            // 새 데이터 추가를 위한 데이터 준비
            const newDetailData = {
                cd_cl: group.cd,
                cd: cd,
                cd_nm: cd_nm,
                cd_desc: cd_desc || '',
                ...itemValues,
                use_yn: use_yn
            };

            try {
                // 새 데이터 추가 API 호출
                await callAPI('data_definition/create', 'POST', newDetailData);
                alert('새 데이터가 추가되었습니다.');
                
                // 모달 닫기
                document.body.removeChild(modal);
                
                // 화면 업데이트
                await loadGroupDetails(group.cd);
            } catch (error) {
                console.error('데이터 추가 실패:', error);
                alert('데이터 추가에 실패했습니다.');
            }
        });
    }

// 그룹별 정의된 필드를 반환하는 함수
function getDefinedFieldsForGroup(groupCd) {
    const groupCode = groupCd.substring(0, 4); // CD100, CD200, CD1000 등 추출
    
    const fieldDefinitions = {
        'CD100': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8'],
        'CD200': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8'],
        'CD1000': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'],
        'CD2000': ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10']
    };
    
    return fieldDefinitions[groupCode] || [];
}

// 그룹 코드 중복 체크 함수
async function checkGroupCodeDuplicate(inputId) {
    const inputElement = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + 'Error');
    const code = 'CD' + inputElement.value.trim();
    
    if (!code || code === 'CD') {
        errorElement.style.display = 'none';
        inputElement.style.borderColor = '#ddd';
        return;
    }
    
    try {
        const allData = await callAPI('data_definition/groups');
        const exists = allData.some(item => item.CD === code);
        
        if (exists) {
            errorElement.style.display = 'block';
            inputElement.style.borderColor = '#dc3545';
        } else {
            errorElement.style.display = 'none';
            inputElement.style.borderColor = '#ddd';
        }
    } catch (error) {
        console.log('중복 체크 실패:', error);
        errorElement.style.display = 'none';
        inputElement.style.borderColor = '#ddd';
    }
}

// 필드 라벨을 반환하는 함수
function getFieldLabel(key) {
    const fieldLabels = {
        'cd_desc': '활용목적',
        'item1': 'Category ID',
        'item2': 'Category', 
        'item3': 'Columns',
        'item4': 'save_path',
        'item5': 'filename',
        'item6': 'duration',
        'item7': 'URL',
        'item8': 'API_KEY',
        'item9': '추가 필드 9',
        'item10': '추가 필드 10'
    };
    
    return fieldLabels[key] || key;
}
