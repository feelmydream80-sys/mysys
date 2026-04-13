// 데이터 정의 탭 로직
import { FIELD_DEFINITIONS, FIELD_LABELS, DEFAULT_COLUMNS, DISPLAY_OPTIONS, TOAST_TYPES } from './modules/constants.js';
import { getGroups, createItem, updateGroup, deleteGroup, updateDetail } from './modules/api.js';
import { showToast, createModal, getAddGroupModalHTML, getEditGroupModalHTML, getDetailModalHTML } from './modules/ui.js';
import { formatDateTime, toKST } from '../../modules/common/dateUtils.js';

// 전역 상태
let selectedGroup = null;
let selectedRow = null;
let isInitialized = false;
let allData = null; // 전역 데이터 저장
let detailSortState = { column: 'cd', direction: 'asc' }; // 상세 테이블 정렬 상태

// 디바운스 함수 (반복 요청 방지)
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

export async function init() {
    console.log('데이터 정의 탭 초기화');
    
    // 중복 호출 방지
    if (isInitialized) {
        console.log('데이터 정의 탭이 이미 초기화되어 있습니다.');
        return;
    }
    
    // 전역 상태 초기화
    isInitialized = true;
    selectedGroup = null;
    selectedRow = null;
    window.isModalOpen = false;
    allData = null;
    
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
    try {
        await renderGroupCards();
        console.log('데이터 정의 탭 초기화 완료');
    } catch (error) {
        console.error('데이터 정의 탭 초기화 실패:', error);
        // 오류 발생시 사용자에게 알림
        const container = document.getElementById('definitionCardContainer');
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">데이터 정의 탭 초기화에 실패했습니다. 페이지를 새로고침해 주세요.</div>';
    } finally {
        // 초기화 완료 후 (성공/실패 모두) 플래그를 false로 설정
        isInitialized = false;
    }
}

// UI 요소 초기화 함수
function setupUIElements() {
    // 기존 검색 UI가 있는지 확인하여 중복 생성 방지
    const existingSearchContainer = document.getElementById('dataDefinitionSearch')?.parentElement;
    if (existingSearchContainer) {
        console.log('검색 UI가 이미 존재하므로 중복 생성을 방지합니다.');
        return;
    }
    
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
    
    DISPLAY_OPTIONS.forEach(option => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="radio" name="displayOption" value="${option.value}" ${option.default ? 'checked' : ''}> ${option.label}`;
        displayOptions.appendChild(label);
    });
    
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
            titleElement.textContent = originalText;
            card.style.display = 'block';
        } else if (selectedOption === 'name') {
            const nameMatch = originalText.match(/- (.+)$/);
            titleElement.textContent = nameMatch ? nameMatch[1] : originalText;
            card.style.display = 'block';
        } else if (selectedOption === 'deleted') {
            const isInactive = card.classList.contains('inactive-group');
            if (isInactive) {
                const codeMatch = originalText.match(/(CD\d+)/);
                titleElement.textContent = codeMatch ? codeMatch[1] : originalText;
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

// 1. 그룹 카드 렌더링
async function renderGroupCards() {
    const container = document.getElementById('definitionCardContainer');
    container.innerHTML = '';

    try {
        // API에서 전체 데이터 가져오기
        console.log('API에서 데이터 정의 그룹 정보 가져오기');
        allData = await getGroups();
        console.log('API 응답 데이터:', allData);
        
        if (allData && allData.length > 0) {
            // 전체 데이터를 그룹별로 분류
            const groupedData = {};
            
            allData.forEach(item => {
                const cd_cl = item.cd_cl;
                if (cd_cl && /^CD\d*00$/.test(cd_cl)) {
                    if (!groupedData[cd_cl]) {
                        const groupHeader = allData.find(headerItem => 
                            headerItem.cd_cl === cd_cl && headerItem.cd === cd_cl
                        );
                        
                        const groupName = groupHeader ? groupHeader.cd_nm : item.cd_nm;
                        
                        groupedData[cd_cl] = {
                            cd: cd_cl,
                            cd_nm: groupName,
                            count: 0,
                            activeCount: 0,
                            inactiveCount: 0,
                            details: [],
                            use_yn: groupHeader ? groupHeader.use_yn : 'Y'
                        };
                    }
                }
            });
            
            allData.forEach(item => {
                const cd_cl = item.cd_cl;
                const cdValue = item.cd;
                
                if (cdValue && !/^CD\d*00$/.test(cdValue)) {
                    if (groupedData[cd_cl]) {
                        groupedData[cd_cl].details.push(item);
                        groupedData[cd_cl].count++;
                        if (item.use_yn && item.use_yn.trim() === 'Y') {
                            groupedData[cd_cl].activeCount++;
                        } else {
                            groupedData[cd_cl].inactiveCount++;
                        }
                    }
                }
            });
            
            const groups = Object.values(groupedData);
            console.log('분류된 그룹 데이터:', groups);
            
            groups.sort((a, b) => {
                const numA = parseInt(a.cd.replace('CD', ''));
                const numB = parseInt(b.cd.replace('CD', ''));
                return numA - numB;
            });
            
            groups.forEach(group => {
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.cd = group.cd; // 데이터 속성으로 그룹 코드 저장
                
                if (group.use_yn && group.use_yn.trim() === 'N') {
                    card.className = 'card inactive-group';
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
            
            updateDisplayOption();
        } else {
            container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">그룹 데이터를 불러오지 못했습니다.</div>';
        }
    } catch (error) {
        console.log('그룹 데이터 로드 실패:', error);
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">그룹 데이터를 불러오지 못했습니다.</div>';
    }
}

// 2. 그룹 선택 처리
function selectGroup(group) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    
    // 데이터 속성으로 정확한 카드 찾기
    const selectedCard = document.querySelector(`.card[data-cd="${group.cd}"]`);
    
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedGroup = group;
        loadGroupDetails(group.cd);
    } else {
        console.error('선택된 카드를 찾을 수 없습니다:', group.cd);
    }
}

// 페이징 상태 관리
let currentPage = 1;
let itemsPerPage = 10; // 페이지당 표시 수량 (기본값)
const itemsPerPageOptions = [5, 10, 20, 50, 100]; // 표시 수량 옵션

// 3. 그룹 상세 정보 로드 및 렌더링
async function loadGroupDetails(groupCd) {
    console.log(`그룹 상세 정보 로드 시작: ${groupCd}`);
    
    // selectedRow 상태 초기화 (새 그룹을 선택하면 이전 선택된 행이 초기화됨)
    selectedRow = null;
    currentPage = 1; // 페이지 초기화
    
    const detailPanel = document.getElementById('detailPanel');
    const selectedGroupTitle = document.getElementById('selectedGroupTitle');
    const detailTableBody = document.getElementById('detailTableBody');

    const totalItems = allData.filter(item => item.cd_cl === groupCd && item.cd !== groupCd).length;
    selectedGroupTitle.textContent = `${selectedGroup.cd} - ${selectedGroup.cd_nm} (${totalItems} 건)`;
    detailTableBody.innerHTML = '';

    if (!allData) {
        allData = await getGroups();
    }
    
    const groupDetails = allData.filter(item => item.cd_cl === groupCd && item.cd !== groupCd) || [];

    updateDetailTableHeader();

    // 페이징된 데이터 렌더링
    renderPagedDetails(groupDetails);

    detailPanel.style.display = 'block';
    
    const buttonContainer = document.getElementById('buttonContainer');
    if (buttonContainer) {
        buttonContainer.innerHTML = '';
        
        // 표시 수량 콤보박스
        const itemsPerPageSelect = document.createElement('select');
        itemsPerPageSelect.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 15px;';
        itemsPerPageOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = `${option} 건`;
            if (option === itemsPerPage) {
                optionElement.selected = true;
            }
            itemsPerPageSelect.appendChild(optionElement);
        });
        itemsPerPageSelect.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderPagedDetails(groupDetails);
            updatePagination(groupDetails);
        });
        
        const activateBtn = document.createElement('button');
        activateBtn.id = 'activateBtn';
        activateBtn.textContent = '활성화';
        activateBtn.className = 'btn btn-success';
        activateBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;';
        activateBtn.disabled = true;
        activateBtn.addEventListener('click', () => activateSelectedItems());
        
        const deactivateBtn = document.createElement('button');
        deactivateBtn.id = 'deactivateBtn';
        deactivateBtn.textContent = '비활성화';
        deactivateBtn.className = 'btn btn-danger';
        deactivateBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;';
        deactivateBtn.disabled = true;
        deactivateBtn.addEventListener('click', () => deactivateSelectedItems());
        
        const addDetailBtn = document.createElement('button');
        addDetailBtn.textContent = '추가';
        addDetailBtn.className = 'btn btn-primary';
        addDetailBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;';
        addDetailBtn.addEventListener('click', () => showAddDetailModal(selectedGroup));
        
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
                showToast('데이터를 선택해주세요.', TOAST_TYPES.WARNING);
            }
        });

        buttonContainer.appendChild(itemsPerPageSelect);
        buttonContainer.appendChild(activateBtn);
        buttonContainer.appendChild(deactivateBtn);
        buttonContainer.appendChild(addDetailBtn);
        buttonContainer.appendChild(editBtn);
    }
    
    // 페이징 버튼 추가 (테이블 하단)
    const detailTable = document.querySelector('#detailPanel table');
    if (detailTable && groupDetails.length > itemsPerPage) {
        // 기존 페이징 컨테이너가 있으면 제거
        const existingPagination = document.getElementById('detailPagination');
        if (existingPagination) {
            existingPagination.remove();
        }
        
        const paginationContainer = document.createElement('div');
        paginationContainer.id = 'detailPagination';
        paginationContainer.style.cssText = 'margin-top: 15px; display: flex; gap: 5px; justify-content: center;';
        
        const totalPages = Math.ceil(groupDetails.length / itemsPerPage);
        
        // 이전 페이지 버튼
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '이전';
        prevBtn.className = 'btn';
        prevBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPagedDetails(groupDetails);
                updatePagination(groupDetails);
            }
        });
        
        // 페이지 번호 버튼
        const pageNumbersContainer = document.createElement('div');
        pageNumbersContainer.style.cssText = 'display: flex; gap: 5px;';
        
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = `btn ${i === currentPage ? 'btn-primary' : ''}`;
            pageBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
            if (i === currentPage) {
                pageBtn.style.backgroundColor = '#007bff';
                pageBtn.style.color = 'white';
                pageBtn.style.borderColor = '#007bff';
            }
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderPagedDetails(groupDetails);
                updatePagination(groupDetails);
            });
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // 다음 페이지 버튼
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '다음';
        nextBtn.className = 'btn';
        nextBtn.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPagedDetails(groupDetails);
                updatePagination(groupDetails);
            }
        });
        
        paginationContainer.appendChild(prevBtn);
        paginationContainer.appendChild(pageNumbersContainer);
        paginationContainer.appendChild(nextBtn);
        detailTable.parentNode.appendChild(paginationContainer);
    }
    
    updateActionButtons();
    console.log(`그룹 상세 정보 로드 완료: ${groupCd}`);
}

// 페이징된 데이터 렌더링 함수 (정렬 상태 적용)
function renderPagedDetails(groupDetails) {
    const detailTableBody = document.getElementById('detailTableBody');
    detailTableBody.innerHTML = '';
    
    // 정렬 적용
    const sortedData = [...groupDetails].sort((a, b) => {
        const { column, direction } = detailSortState;
        let valA = a[column];
        let valB = b[column];
        
        // null/undefined 처리
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';
        
        // 날짜 필드 (update_dt)
        if (column === 'update_dt') {
            const dateA = toKST(valA);
            const dateB = toKST(valB);
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        // 문자열 비교
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pagedData = sortedData.slice(startIndex, endIndex);
    
    if (pagedData.length > 0) {
        pagedData.forEach(item => {
            const row = renderDetailRow(item);
            detailTableBody.appendChild(row);
        });
    } else {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="5" style="text-align: center; color: #94a3b8;">데이터가 없습니다.</td>';
        detailTableBody.appendChild(emptyRow);
    }
}

// 페이징 버튼 업데이트 함수
function updatePagination(groupDetails) {
    const paginationContainer = document.getElementById('detailPagination');
    if (!paginationContainer) {
        return;
    }
    
    const totalPages = Math.ceil(groupDetails.length / itemsPerPage);
    const pageNumbersContainer = paginationContainer.querySelector('div:nth-child(2)');
    
    // 페이지 번호 버튼 업데이트
    const pageButtons = pageNumbersContainer.querySelectorAll('button');
    pageButtons.forEach((btn, index) => {
        const pageNumber = index + 1;
        if (pageNumber === currentPage) {
            btn.className = 'btn btn-primary';
            btn.style.backgroundColor = '#007bff';
            btn.style.color = 'white';
            btn.style.borderColor = '#007bff';
        } else {
            btn.className = 'btn';
            btn.style.backgroundColor = 'white';
            btn.style.color = 'black';
            btn.style.borderColor = '#ddd';
        }
    });
    
    // 이전/다음 버튼 상태 업데이트
    const prevBtn = paginationContainer.querySelector('button:first-child');
    const nextBtn = paginationContainer.querySelector('button:last-child');
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// 선택된 행 비활성화 함수
async function deactivateSelectedItems() {
    const selectedCheckboxes = document.querySelectorAll('#detailTableBody input[type="checkbox"]:checked');
    const selectedItems = [];
    
    selectedCheckboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const cd = row.querySelector('td:nth-child(2)').textContent;
        selectedItems.push(cd);
    });
    
    if (selectedItems.length < 1) {
        showToast('비활성화할 항목을 선택해주세요.', TOAST_TYPES.WARNING);
        return;
    }
    
    try {
        for (const cd of selectedItems) {
            await updateDetail(cd, { use_yn: 'N', cd_cl: selectedGroup.cd });
        }
        
        showToast(`선택된 ${selectedItems.length}개의 항목이 비활성화되었습니다.`, TOAST_TYPES.SUCCESS);
        allData = await getGroups(); // 전역 데이터 재로드
        await loadGroupDetails(selectedGroup.cd);
        await renderGroupCards(); // 그룹 카드 리로드
    } catch (error) {
        console.error('비활성화 실패:', error);
        showToast('항목 비활성화에 실패했습니다.', TOAST_TYPES.ERROR);
    }
}

// 상세 테이블 헤더 업데이트 함수 (체크박스 열 추가 + 정렬 가능)
function updateDetailTableHeader() {
    const detailTable = document.querySelector('#detailPanel table');
    const thead = detailTable.querySelector('thead');
    
    thead.innerHTML = '';
    
    const headerRow = document.createElement('tr');
    
    const checkboxTh = document.createElement('th');
    const headerCheckbox = document.createElement('input');
    headerCheckbox.type = 'checkbox';
    headerCheckbox.id = 'headerCheckbox';
    headerCheckbox.addEventListener('change', toggleAllCheckboxes);
    checkboxTh.appendChild(headerCheckbox);
    headerRow.appendChild(checkboxTh);
    
    DEFAULT_COLUMNS.forEach(col => {
        const th = document.createElement('th');
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        th.style.transition = 'background-color 0.2s';
        th.addEventListener('click', () => handleDetailSort(col.key));
        
        const labelSpan = document.createElement('span');
        labelSpan.textContent = col.label;
        th.appendChild(labelSpan);
        
        const sortIcon = document.createElement('span');
        sortIcon.style.marginLeft = '4px';
        sortIcon.style.fontSize = '12px';
        sortIcon.style.color = '#94a3b8';
        
        if (detailSortState.column === col.key) {
            sortIcon.textContent = detailSortState.direction === 'asc' ? '↑' : '↓';
            sortIcon.style.color = '#007bff';
            th.style.backgroundColor = '#e6f7ee';
        } else {
            sortIcon.textContent = '↕';
        }
        
        th.appendChild(sortIcon);
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
}

// 상세 테이블 정렬 처리 함수
function handleDetailSort(column) {
    if (detailSortState.column === column) {
        detailSortState.direction = detailSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        detailSortState.column = column;
        detailSortState.direction = 'asc';
    }
    
    // 현재 그룹 데이터 다시 렌더링
    if (selectedGroup) {
        loadGroupDetails(selectedGroup.cd);
    }
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
    
    if (selectedItems.length < 1) {
        showToast('활성화할 항목을 선택해주세요.', TOAST_TYPES.WARNING);
        return;
    }
    
    try {
        for (const cd of selectedItems) {
            await updateDetail(cd, { use_yn: 'Y', cd_cl: selectedGroup.cd });
        }
        
        showToast(`선택된 ${selectedItems.length}개의 항목이 활성화되었습니다.`, TOAST_TYPES.SUCCESS);
        allData = await getGroups(); // 전역 데이터 재로드
        await loadGroupDetails(selectedGroup.cd);
        await renderGroupCards(); // 그룹 카드 리로드
    } catch (error) {
        console.error('활성화 실패:', error);
        showToast('항목 활성화에 실패했습니다.', TOAST_TYPES.ERROR);
    }
}

// 4. 상세 행 렌더링 (use_yn에 따른 시각적 구분 포함)
function renderDetailRow(item) {
    const row = document.createElement('tr');
    
    if (!item.use_yn || item.use_yn.trim() === 'N') {
        row.className = 'inactive-row';
    }
    
    row.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
            updateActionButtons();
            return;
        }
        
        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        
        selectDetailRow(row, item);
    });
    
    // 더블 클릭 이벤트: 수정 모달 직접 열기
    row.addEventListener('dblclick', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
            return;
        }
        
        showEditModal(item);
    });
    
    row.innerHTML = `
        <td><input type="checkbox" onchange="updateActionButtons()"></td>
        <td>${item.cd}</td>
        <td>${item.cd_nm}</td>
        <td>${item.cd_desc || ''}</td>
        <td>${(item.use_yn && item.use_yn.trim() === 'Y') ? '사용중' : '사용안함'}</td>
        <td>${item.update_dt ? formatDateTime(item.update_dt, 'YYYY-MM-DD HH:mm:ss') : ''}</td>
    `;
    
    console.log('DEBUG dataDefinition: item.update_dt =', item.update_dt, '-> formatDateTime result =', item.update_dt ? formatDateTime(item.update_dt, 'YYYY-MM-DD HH:mm:ss') : '');
    
    return row;
}

// 5. 상세 행 선택 처리
function selectDetailRow(row, item) {
    document.querySelectorAll('#detailTableBody tr').forEach(r => r.style.backgroundColor = '');
    
    row.style.backgroundColor = '#e6f7ee';
    selectedRow = { row, item };
    
    updateActionButtons();
}

// 6. 액션 버튼 상태 업데이트
function updateActionButtons() {
    const editBtn = document.getElementById('editBtn');
    const activateBtn = document.getElementById('activateBtn');
    const deactivateBtn = document.getElementById('deactivateBtn');
    const addDetailBtn = document.querySelector('#buttonContainer .btn-primary');
    
    // 디버그 로그 추가
    console.log('updateActionButtons 호출');
    console.log('addDetailBtn:', addDetailBtn);
    
    const selectedCheckboxes = document.querySelectorAll('#detailTableBody input[type="checkbox"]:checked');
    const selectedCount = selectedCheckboxes.length;
    
    if (selectedCount > 0) {
        activateBtn.disabled = false;
        deactivateBtn.disabled = false;
        addDetailBtn.disabled = true;
        editBtn.disabled = selectedCount > 1; // 2개 이상 선택시 수정 버튼 비활성화
    } else {
        activateBtn.disabled = true;
        deactivateBtn.disabled = true;
        addDetailBtn.disabled = false;
        
        if (selectedRow) {
            editBtn.disabled = false;
        } else {
            editBtn.disabled = true;
        }
    }
    
    // 최종 상태 로그 추가
    console.log('addDetailBtn.disabled:', addDetailBtn.disabled);
}

// 7. 이벤트 리스너 설정
function setupEventListeners() {
    if (setupEventListeners.hasRun) {
        return;
    }
    setupEventListeners.hasRun = true;

    const editBtn = document.getElementById('editBtn');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (selectedRow) {
                showEditModal(selectedRow.item);
            } else {
                showToast('데이터를 선택해주세요.', TOAST_TYPES.WARNING);
            }
        });
    }
}
setupEventListeners.hasRun = false;

// 8. 그룹 액션 버튼 설정
function setupGroupActionButtons() {
    // setupGroupActionButtons.hasRun 플래그 제거하여 항상 이벤트 리스너를 재설정하도록 변경
    console.log('setupGroupActionButtons 함수 실행');
    
    const addGroupBtn = document.getElementById('addGroupBtn');
    const editGroupBtn = document.getElementById('editGroupBtn');
    const deleteGroupBtn = document.getElementById('deleteGroupBtn');

    console.log('DOM 요소 접근 결과:');
    console.log('addGroupBtn:', addGroupBtn);
    console.log('editGroupBtn:', editGroupBtn);
    console.log('deleteGroupBtn:', deleteGroupBtn);

    if (addGroupBtn) {
        // 기존 이벤트 리스너 제거 후 새로 추가
        addGroupBtn.removeEventListener('click', handleAddGroupClick);
        addGroupBtn.addEventListener('click', handleAddGroupClick);
    }

    if (editGroupBtn) {
        // 기존 이벤트 리스너 제거 후 새로 추가
        editGroupBtn.removeEventListener('click', handleEditGroupClick);
        editGroupBtn.addEventListener('click', handleEditGroupClick);
    }

    if (deleteGroupBtn) {
        // 기존 이벤트 리스너 제거 후 새로 추가
        deleteGroupBtn.removeEventListener('click', handleDeleteGroupClick);
        deleteGroupBtn.addEventListener('click', handleDeleteGroupClick);
    }
}

// 그룹 액션 버튼 클릭 핸들러 함수들
function handleAddGroupClick() {
    console.log('addGroupBtn 버튼 클릭 감지');
    showAddGroupModal();
}

function handleEditGroupClick() {
    if (selectedGroup) {
        showEditGroupModal(selectedGroup);
    } else {
        alert('수정할 그룹을 먼저 선택해주세요.');
    }
}

function handleDeleteGroupClick() {
    if (selectedGroup) {
        showDeleteGroupConfirm(selectedGroup);
    } else {
        alert('삭제할 그룹을 먼저 선택해주세요.');
    }
}

// 9. 그룹 추가 모달 표시 (tb_con_mst 스키마 기반)
async function showAddGroupModal() {
    if (window.isModalOpen === true) {
        console.log('모달이 이미 열려있습니다.');
        return;
    }

    window.isModalOpen = true;

    if (!allData) {
        allData = await getGroups();
    }

    const { modal, modalContent, saveBtn } = createModal(getAddGroupModalHTML(), {
        title: '새 그룹 추가',
        width: '1800px',
        saveText: '추가',
        saveDisabled: true
    });

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

        const existingGroup = allData.find(item => item.cd === cd && item.use_yn === 'N');
        
        if (existingGroup) {
            const confirmActivate = confirm(`이 그룹은 이미 비활성화된 상태입니다.\n그룹을 활성화하시겠습니까?`);
            if (confirmActivate) {
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
            await updateGroup(cd, updateData);
                    alert('그룹이 활성화되었습니다.');
                    window.isModalOpen = false;
                    document.body.removeChild(modal);
                    allData = await getGroups(); // 전역 데이터 재로드
                    await renderGroupCards();
                } catch (error) {
                    console.error('그룹 활성화 실패:', error);
                    alert('그룹 활성화에 실패했습니다.');
                }
            } else {
                return;
            }
        } else {
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

            try {
                await createItem(newGroupData);
                alert('새 그룹이 추가되었습니다.');
                window.isModalOpen = false;
                document.body.removeChild(modal);
                allData = await getGroups(); // 전역 데이터 재로드
                await renderGroupCards();
            } catch (error) {
                console.error('그룹 추가 실패:', error);
                alert('그룹 추가에 실패했습니다.');
            }
        }
    });

    const validateAddGroupModal = debounce(() => {
        const cdClInput = document.getElementById('newGroupCdCl');
        const cdInput = document.getElementById('newGroupCd');
        const cdNmInput = document.getElementById('newGroupNm');
        
        const cdClValue = cdClInput.value.trim();
        const cdValue = cdInput.value.trim();
        const cdNmValue = cdNmInput.value.trim();
        
        let isValid = true;
        
        if (!cdClValue) {
            isValid = false;
        } else {
            const cdClNum = parseInt(cdClValue);
            if (isNaN(cdClNum) || cdClNum % 100 !== 0) {
                document.getElementById('newGroupCdClFormatError').style.display = 'block';
                cdClInput.style.borderColor = '#dc3545';
                isValid = false;
            } else {
                document.getElementById('newGroupCdClFormatError').style.display = 'none';
                const exists = allData.some(item => item.cd === 'CD' + cdClValue);
                if (exists) {
                    document.getElementById('newGroupCdClError').style.display = 'block';
                    cdClInput.style.borderColor = '#dc3545';
                    isValid = false;
                } else {
                    document.getElementById('newGroupCdClError').style.display = 'none';
                    cdClInput.style.borderColor = '#ddd';
                }
            }
        }
        
        if (!cdValue) {
            isValid = false;
        } else {
            if (cdClValue) {
                const cdClNum = parseInt(cdClValue);
                const cdNum = parseInt(cdValue);
                if (cdNum < cdClNum || cdNum > cdClNum + 99) {
                    document.getElementById('newGroupCdRangeError').style.display = 'block';
                    cdInput.style.borderColor = '#dc3545';
                    isValid = false;
                } else {
                    document.getElementById('newGroupCdRangeError').style.display = 'none';
                    const exists = allData.some(item => item.cd === 'CD' + cdValue);
                    if (exists) {
                        document.getElementById('newGroupCdError').style.display = 'block';
                        cdInput.style.borderColor = '#dc3545';
                        isValid = false;
                    } else {
                        document.getElementById('newGroupCdError').style.display = 'none';
                        cdInput.style.borderColor = '#ddd';
                    }
                }
            }
        }
        
        if (!cdNmValue) {
            isValid = false;
        }
        
        saveBtn.disabled = !isValid;
    }, 300);
    
    document.getElementById('newGroupCdCl').addEventListener('input', validateAddGroupModal);
    document.getElementById('newGroupCd').addEventListener('input', validateAddGroupModal);
    document.getElementById('newGroupNm').addEventListener('input', validateAddGroupModal);
}

// 10. 그룹 수정 모달 표시
async function showEditGroupModal(group) {
    try {
        if (!allData) {
            allData = await getGroups();
        }
        
        // groupHeader를 찾을 때 대소문자 구분 없이 검색하거나 더 정확한 조건 사용
        const groupHeader = allData.find(item => 
            item.cd_cl === group.cd && item.cd === group.cd
        );
        
        console.log('그룹 수정 모달 사용 데이터:', {
            group: group,
            groupHeader: groupHeader,
            use_yn: group.use_yn,
            trimmed_use_yn: group.use_yn ? group.use_yn.trim() : 'undefined'
        });
        
        // groupHeader가 없을 경우 직접 API 호출로 그룹 헤더 데이터를 가져오기
        let safeGroupHeader = groupHeader;
        if (!safeGroupHeader) {
            console.log('groupHeader가 없어 직접 API 호출로 데이터 가져오기');
            const response = await fetch(`/api/data_definition/groups`);
            if (response.ok) {
                const data = await response.json();
                console.log('API에서 가져온 데이터:', data);
                safeGroupHeader = data.find(item => item.cd_cl === group.cd && item.cd === group.cd) || {};
            } else {
                safeGroupHeader = {};
            }
        }
        
        createModal(getEditGroupModalHTML(group, safeGroupHeader), {
            title: '그룹 수정',
            width: '1800px',
            onSave: async () => {
                const cd_cl = document.getElementById('editGroupCdCl').value.trim();
                const cd_nm = document.getElementById('editGroupNm').value.trim();
                const cd_desc = document.getElementById('editGroupDesc').value.trim();
                
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

                const use_yn = document.getElementById('editGroupUseYn').value.trim() === 'Y' ? 'Y' : 'N';
                const updateData = {
                    cd_cl: cd_cl,
                    cd: group.cd,
                    cd_nm: cd_nm,
                    cd_desc: cd_desc || '',
                    ...itemValues,
                    use_yn: use_yn
                };

                try {
                    await updateGroup(group.cd, updateData);
                    
                    // 그룹을 활성화(Y)할 때 하위 데이터도 활성화(Y)로 변경
                    if (use_yn === 'Y') {
                        const groupDetails = allData.filter(item => item.cd_cl === group.cd && item.cd !== group.cd);
                        for (const detail of groupDetails) {
                            await updateDetail(detail.cd, { use_yn: 'Y', cd_cl: group.cd });
                        }
                    }
                    
                    alert('그룹이 수정되었습니다.');
                    allData = await getGroups(); // 전역 데이터 재로드
                    await renderGroupCards();
                } catch (error) {
                    console.error('그룹 수정 실패:', error);
                    alert('그룹 수정에 실패했습니다.');
                }
            }
        });
    } catch (error) {
        console.log('그룹 데이터 로드 실패:', error);
        alert('그룹 데이터를 불러오는데 실패했습니다.');
    }
}

// 11. 그룹 삭제 확인 표시
async function showDeleteGroupConfirm(group) {
    const confirmDelete = confirm(
        `그룹 코드: ${group.cd}\n그룹 명칭: ${group.cd_nm}\n\n이 그룹을 삭제하시겠습니까?\n(그룹 내 모든 데이터가 사용안함으로 변경됩니다)`
    );
    
    if (confirmDelete) {
            try {
                await deleteGroup(group.cd);
                alert('그룹이 사용안함으로 변경되었습니다.');
                allData = await getGroups(); // 전역 데이터 재로드
                await renderGroupCards();
                // 상세 패널 숨기기 (그룹이 삭제되면 상세 정보도 숨김)
                const detailPanel = document.getElementById('detailPanel');
                if (detailPanel) {
                    detailPanel.style.display = 'none';
                }
                // 선택된 그룹 상태 초기화
                selectedGroup = null;
                selectedRow = null;
            } catch (error) {
                console.error('그룹 삭제 실패:', error);
                alert('그룹 삭제에 실패했습니다.');
            }
    }
}

// 12. 수정 모달 표시
async function showEditModal(item) {
    try {
        console.log('상세 수정 모달 표시 시작:', item);
        let groupItemFields = [];
        
        // allData가 없거나 유효하지 않은 경우 API로 다시 가져오기
        if (!allData || !Array.isArray(allData) || allData.length === 0) {
            console.log('allData가 없거나 유효하지 않아 API로 다시 가져오기');
            allData = await getGroups();
        }
        
        // groupHeader 찾기
        let groupHeader = allData.find(header => header.cd_cl === item.cd_cl && header.cd === item.cd_cl);
        
        // groupHeader를 찾지 못한 경우 API로 직접 가져오기
        if (!groupHeader) {
            console.log('groupHeader를 찾지 못해 직접 API 호출로 가져오기');
            const response = await fetch(`/api/data_definition/groups`);
            if (response.ok) {
                const data = await response.json();
                groupHeader = data.find(header => header.cd_cl === item.cd_cl && header.cd === item.cd_cl);
            }
        }
        
        console.log('찾은 groupHeader:', groupHeader);
        
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
        
        console.log('groupItemFields:', groupItemFields);
        
        createModal(getDetailModalHTML(`${item.cd} - ${item.cd_nm} 수정`, item, groupItemFields), {
            title: `${item.cd} - ${item.cd_nm} 수정`,
            width: '1800px',
            onSave: async () => {
                const cd_nm = document.getElementById('editDetailNm').value.trim();
                const cd_desc = document.getElementById('editDetailDesc').value.trim();
                const use_yn = document.getElementById('editDetailUseYn').value;

                if (!cd_nm) {
                    alert('데이터 명칭을 입력해주세요.');
                    return;
                }

                const itemValues = {};
                groupItemFields.forEach(field => {
                    itemValues[field.key] = document.getElementById(`editDetail${field.key}`)?.value.trim() || '';
                });

                const updateData = {
                    cd_cl: item.cd_cl,
                    cd: item.cd,
                    cd_nm: cd_nm,
                    cd_desc: cd_desc || '',
                    ...itemValues,
                    use_yn: use_yn
                };

                try {
                    await updateDetail(item.cd, updateData);
                    alert('데이터가 수정되었습니다.');
                    allData = await getGroups(); // 전역 데이터 재로드
                    await loadGroupDetails(selectedGroup.cd);
                    await renderGroupCards(); // 그룹 카드 리로드
                } catch (error) {
                    console.error('데이터 수정 실패:', error);
                    alert('데이터 수정에 실패했습니다.');
                }
            }
        });
    } catch (error) {
        console.error('상세 데이터 로드 실패:', error);
        alert('상세 데이터를 불러오는데 실패했습니다.');
    }
}

// 14. 상세 항목 추가 모달 표시
async function showAddDetailModal(group) {
    try {
        let groupItemFields = [];
        if (!allData) {
            allData = await getGroups();
        }
        
        const groupHeader = allData.find(item => item.cd_cl === group.cd && item.cd === group.cd);
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

        // 현재 그룹의 사용 중인 CD 목록 분석
        const groupDetails = allData.filter(item => item.cd_cl === group.cd && item.cd !== group.cd);
        const groupNum = parseInt(group.cd.replace('CD', ''));
        
        // 사용 중인 CD 숫자 목록 추출 (CD 접두사 제거)
        const usedCodes = new Set();
        groupDetails.forEach(item => {
            const codeNum = parseInt(item.cd.replace('CD', ''));
            if (!isNaN(codeNum)) {
                usedCodes.add(codeNum);
            }
        });

        // 첫 번째 빈 값 찾기 (groupNum+1 ~ groupNum+99)
        let nextAvailableCode = null;
        let firstEmptyCode = null;
        let maxUsedCode = groupNum;
        
        for (let i = groupNum + 1; i <= groupNum + 99; i++) {
            if (!usedCodes.has(i)) {
                if (firstEmptyCode === null) {
                    firstEmptyCode = i;
                }
            } else {
                maxUsedCode = Math.max(maxUsedCode, i);
            }
        }

        // 빈 값이 있으면 첫 번째 빈 값, 없으면 최대값+1
        if (firstEmptyCode !== null) {
            nextAvailableCode = firstEmptyCode;
        } else if (maxUsedCode < groupNum + 99) {
            nextAvailableCode = maxUsedCode + 1;
        }

        // 모든 코드가 사용 중인지 확인 (nextAvailableCode가 null이면 모두 사용 중)
        const isAllCodesUsed = nextAvailableCode === null;

        // 모달 생성 옵션
        const modalOptions = {
            title: `${group.cd} - ${group.cd_nm} 추가`,
            width: '1800px',
            saveText: '추가',
            saveDisabled: isAllCodesUsed // 모두 사용 중이면 저장 버튼 비활성화
        };

        const { modal, modalContent, saveBtn } = createModal(
            getDetailModalHTML(`${group.cd} - ${group.cd_nm} 추가`, null, groupItemFields, isAllCodesUsed, groupNum, nextAvailableCode), 
            modalOptions
        );

        // 모든 코드가 사용 중이 아닌 경우에만 CD 입력 필드에 자동 값 설정
        if (!isAllCodesUsed && nextAvailableCode !== null) {
            const cdInput = document.getElementById('newDetailCd');
            if (cdInput) {
                cdInput.value = nextAvailableCode;
                // input 이벤트 트리거하여 검증 함수 실행
                cdInput.dispatchEvent(new Event('input'));
            }
        }

        const cdInput = document.getElementById('newDetailCd');
        // cdInput이 null일 수 있음 (모든 코드 사용 중일 때 disabled)
        if (!cdInput) {
            return;
        }
        // 데이터 코드 검증 처리
        cdInput.addEventListener('input', debounce(() => {
            const cdValue = cdInput.value.trim();
            const cdNum = parseInt(cdValue);
            const groupNum = parseInt(group.cd.replace('CD', ''));
            
            if (cdNum % 100 === 0) {
                document.getElementById('newDetailCdError').textContent = '데이터 코드는 100의 배수 값을 사용할 수 없습니다 (그룹에서만 사용 가능).';
                document.getElementById('newDetailCdError').style.display = 'block';
                cdInput.style.borderColor = '#dc3545';
                saveBtn.disabled = true;
            } else if (cdNum < groupNum || cdNum > groupNum + 99) {
                document.getElementById('newDetailCdError').textContent = `데이터 코드는 ${group.cd} ~ ${'CD' + (groupNum + 99)} 범위 내에서만 사용할 수 있습니다.`;
                document.getElementById('newDetailCdError').style.display = 'block';
                cdInput.style.borderColor = '#dc3545';
                saveBtn.disabled = true;
            } else {
                document.getElementById('newDetailCdError').style.display = 'none';
                cdInput.style.borderColor = '#ddd';
                validateAddModal();
            }
        }, 300));

        const validateAddModal = debounce(() => {
            const cdValue = document.getElementById('newDetailCd').value.trim();
            const cd_nm = document.getElementById('newDetailNm').value.trim();
            
            console.log('validateAddModal 호출:', { cdValue, cd_nm });
            
            let isValid = true;
            
            if (!cdValue || !cd_nm) {
                console.log('cdValue 또는 cd_nm이 비어있음');
                isValid = false;
            } else {
                const cdNum = parseInt(cdValue);
                const groupNum = parseInt(group.cd.replace('CD', ''));
                
                console.log('cdNum:', cdNum, 'groupNum:', groupNum);
                
                if (isNaN(cdNum) || cdNum % 100 === 0 || cdNum < groupNum || cdNum > groupNum + 99) {
                    console.log('cdNum이 유효하지 않음');
                    isValid = false;
                } else {
                    const cd = 'CD' + cdValue;
                    const exists = allData.some(item => item.cd_cl === group.cd && item.cd === cd);
                    console.log('cd exists:', exists);
                    if (exists) {
                        console.log('cd가 이미 존재함');
                        isValid = false;
                        document.getElementById('newDetailCdError').textContent = '이미 존재하는 데이터 코드입니다.';
                        document.getElementById('newDetailCdError').style.display = 'block';
                        cdInput.style.borderColor = '#dc3545';
                    } else if (!document.getElementById('newDetailCdError').textContent.includes('이미 존재')) {
                        document.getElementById('newDetailCdError').style.display = 'none';
                        cdInput.style.borderColor = '#ddd';
                    }
                }
            }
            
            console.log('최종 isValid:', isValid);
            saveBtn.disabled = !isValid;
            console.log('saveBtn.disabled:', saveBtn.disabled);
        }, 300);
        
        document.getElementById('newDetailCd').addEventListener('input', validateAddModal);
        document.getElementById('newDetailNm').addEventListener('input', validateAddModal);

        saveBtn.addEventListener('click', async () => {
            const cdValue = document.getElementById('newDetailCd').value.trim();
            const cd_nm = document.getElementById('newDetailNm').value.trim();
            const cd_desc = document.getElementById('newDetailDesc').value.trim();
            const use_yn = document.getElementById('newDetailUseYn').value;

            if (!cdValue || !cd_nm) {
                alert('데이터 코드와 명칭을 모두 입력해주세요.');
                return;
            }

            const cd = 'CD' + cdValue;
            const itemValues = {};
            groupItemFields.forEach(field => {
                itemValues[field.key] = document.getElementById(`newDetail${field.key}`)?.value.trim() || '';
            });

            const newDetailData = {
                cd_cl: group.cd,
                cd: cd,
                cd_nm: cd_nm,
                cd_desc: cd_desc || '',
                ...itemValues,
                use_yn: use_yn
            };

            try {
                console.log('=== 데이터 추가 시작 ===');
                console.log('=== newDetailData:', newDetailData);
                await createItem(newDetailData);
                alert('새 데이터가 추가되었습니다.');
                document.body.removeChild(modal);
                allData = await getGroups(); // 전역 데이터 재로드
                await loadGroupDetails(group.cd);
                await renderGroupCards(); // 그룹 카드 리로드
                
                // 관리자 설정 데이터 캐시 갱신 (CD309 추가 후 기본설정과 차트/시각화 관리에 표시되도록)
                console.log('=== 관리자 설정 데이터 캐시 갱신 시작 ===');
                try {
                    // dataManager의 refreshAdminSettings 함수를 사용하여 관리자 설정 데이터의 캐시를 갱신합니다.
                    await import('../../modules/common/dataManager.js').then(async (dataManager) => {
                        const refreshedData = await dataManager.refreshAdminSettings();
                        console.log('=== 관리자 설정 데이터 캐시 갱신 완료 ===');
                        console.log('=== 관리자 설정 데이터:', refreshedData);
                        
                        // 관리자 설정 페이지의 테이블 갱신
                        if (typeof window.loadPageData === 'function') {
                            console.log('=== 관리자 설정 테이블 갱신 시작 ===');
                            window.loadPageData();
                            console.log('=== 관리자 설정 테이블 갱신 완료 ===');
                        } else {
                            console.log('=== 관리자 설정 테이블 갱신 함수가 존재하지 않습니다. ===');
                        }
                    });
                } catch (error) {
                    console.error('=== 관리자 설정 데이터 캐시 갱신 실패 ===');
                    console.error('=== 오류:', error);
                }
            } catch (error) {
                console.error('=== 데이터 추가 실패 ===');
                console.error('=== 오류:', error);
                alert('데이터 추가에 실패했습니다.');
            }
        });
    } catch (error) {
        console.log('상세 데이터 로드 실패:', error);
        alert('상세 데이터를 불러오는데 실패했습니다.');
    }
}

// 그룹별 정의된 필드를 반환하는 함수
function getDefinedFieldsForGroup(groupCd) {
    const groupCode = groupCd.substring(0, 4);
    
    return FIELD_DEFINITIONS[groupCode] || [];
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
        if (!allData) {
            allData = await getGroups();
        }
        
        const exists = allData.some(item => item.cd === code);
        
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
    return FIELD_LABELS[key] || key;
}