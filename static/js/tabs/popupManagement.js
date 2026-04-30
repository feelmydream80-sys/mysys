// @DOC_FILE: popupManagement.js
// @DOC_DESC: 팝업 관리 탭 모듈

import { showToast } from '../utils/toast.js';
import { popupManagementApi } from '../services/api.js';
import { getKSTNow, formatDate, formatDateTime } from '../modules/common/dateUtils.js';

/**
 * 팝업 관리 탭 클래스
 */
class PopupManagementTab {
    constructor() {
        this.elements = {
            tab: null,
            tableBody: null,
            searchInput: null,
            addPopupBtn: null,
            popupModal: null,
            popupForm: null,
            popupPreview: null
        };

        this.currentPopupId = null;
        this.uploadedImageFile = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.totalPopups = 0;
        this.debounceTimer = null;
    }

    initElements() {
        const container = document.getElementById('mngr_sett_page');
        if (!container) return false;

        this.elements.tab = container.querySelector('button[data-tab="popupManagement"]');
        this.elements.tableBody = container.querySelector('#popupTableBody');
        this.elements.searchInput = container.querySelector('#popupSearchInput');
        this.elements.addPopupBtn = container.querySelector('#addPopupBtn');
        this.elements.popupModal = document.getElementById('popupModal');
        this.elements.popupForm = document.getElementById('popupForm');
        this.elements.popupPreview = document.getElementById('popupPreviewContainer');

        return true;
    }

    initEventListeners() {
        if (this.elements.tab) {
            this.elements.tab.addEventListener('click', () => this.loadPopups());
        }

        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', () => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.currentPage = 1;
                    this.loadPopups();
                }, 300);
            });
        }

        if (this.elements.addPopupBtn) {
            this.elements.addPopupBtn.addEventListener('click', () => this.openPopupModal());
        }

        const closeModalBtn = document.getElementById('closePopupModal');
        const cancelBtn = document.getElementById('cancelPopupBtn');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closePopupModal());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closePopupModal());
        }

        if (this.elements.popupModal) {
            this.elements.popupModal.addEventListener('click', (e) => {
                if (e.target === this.elements.popupModal) {
                    this.closePopupModal();
                }
            });
        }

        const saveBtn = document.getElementById('savePopupBtn');
        if (saveBtn) {
            // 기존 이벤트 리스너 제거 후 새로 등록 (중복 방지)
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            newSaveBtn.addEventListener('click', () => this.savePopup());
        }

        const imageInput = document.getElementById('popupImageInput');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e);
                this.updateLivePreview();
            });
        }

        // 실시간 미리보기 이벤트 리스너 추가
        const liveUpdateFields = [
            'popupTitle', 'popupContent', 'popupLinkUrl',
            'popupWidth', 'popupHeight', 'popupBgColor'
        ];
        
        liveUpdateFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.updateLivePreview());
            }
        });

        this.initFormValidation();
    }

    initFormValidation() {
        const inputs = document.querySelectorAll('#popupForm input[required], #popupForm textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = '필수 입력 항목입니다.';
        }

        if (field.type === 'url' && value) {
            try {
                new URL(value);
            } catch {
                isValid = false;
                errorMessage = '유효한 URL을 입력해주세요.';
            }
        }

        if (field.type === 'number' && value) {
            const num = parseInt(value);
            if (isNaN(num) || num < 0) {
                isValid = false;
                errorMessage = '0 이상의 숫자를 입력해주세요.';
            }
        }

        if (field.id === 'popupEndDate') {
            const startDate = document.getElementById('popupStartDate')?.value;
            if (startDate && value && new Date(value) < new Date(startDate)) {
                isValid = false;
                errorMessage = '종료일은 시작일보다 이후여야 합니다.';
            }
        }

        if (!isValid) {
            field.classList.add('error');
            this.showFieldError(field, errorMessage);
        } else {
            field.classList.remove('error');
            this.clearFieldError(field);
        }

        return isValid;
    }

    showFieldError(field, message) {
        let errorEl = field.parentElement.querySelector('.field-error');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.className = 'field-error';
            errorEl.style.color = '#dc3545';
            errorEl.style.fontSize = '0.85em';
            errorEl.style.marginTop = '4px';
            errorEl.style.display = 'block';
            field.parentElement.appendChild(errorEl);
        }
        errorEl.textContent = message;
    }

    clearFieldError(field) {
        const errorEl = field.parentElement.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
        field.classList.remove('error');
    }

    validateForm() {
        const requiredFields = document.querySelectorAll('#popupForm input[required], #popupForm textarea[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async loadPopups() {
        try {
            console.log('🔍 [PIPELINE] Frontend: loadPopups() 시작');
            const searchTerm = this.elements.searchInput ? this.elements.searchInput.value : '';
            const data = await popupManagementApi.getPopups(searchTerm, this.currentPage, this.itemsPerPage);
            
            console.log('🔍 [PIPELINE] Frontend: API 응답 데이터:', data);
            console.log('🔍 [PIPELINE] Frontend: popups 개수:', data.popups?.length);
            if (data.popups && data.popups.length > 0) {
                console.log('🔍 [PIPELINE] Frontend: 첫 번째 팝업:', data.popups[0]);
            }

            this.totalPopups = data.total || 0;
            this.totalPages = Math.ceil(this.totalPopups / this.itemsPerPage);

            this.renderPopupTable(data.popups || []);
            this.renderPagination();
        } catch (error) {
            console.error('🔍 [PIPELINE] Frontend: loadPopups() 실패:', error);
            showToast('팝업 목록 로드 실패: ' + error.message, 'error');
        }
    }

    renderPopupTable(popups) {
        if (!this.elements.tableBody) return;

        this.elements.tableBody.innerHTML = '';

        if (popups.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">등록된 팝업이 없습니다.</td>';
            this.elements.tableBody.appendChild(row);
            return;
        }

        popups.forEach(popup => {
            const row = document.createElement('tr');
            const startDate = popup.start_dt ? new Date(popup.start_dt).toLocaleDateString('ko-KR') : '-';
            const endDate = popup.end_dt ? new Date(popup.end_dt).toLocaleDateString('ko-KR') : '-';
            const statusBadge = this.getStatusBadge(popup.use_yn, popup.start_dt, popup.end_dt);

            row.innerHTML = '<td>' + popup.popup_id + '</td>' +
                '<td>' + (popup.titl || '(제목 없음)') + '</td>' +
                '<td>' + startDate + ' ~ ' + endDate + '</td>' +
                '<td>' + (popup.width || 400) + 'px x ' + (popup.height || 300) + 'px</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + new Date(popup.reg_dt).toLocaleDateString('ko-KR') + '</td>' +
                '<td>' +
                    '<div class="action-buttons">' +
                        '<button class="btn btn-primary edit-btn" data-popup-id="' + popup.popup_id + '">수정</button>' +
                        '<button class="btn btn-secondary preview-btn" data-popup-id="' + popup.popup_id + '">미리보기</button>' +
                        '<button class="btn btn-danger delete-btn" data-popup-id="' + popup.popup_id + '">삭제</button>' +
                    '</div>' +
                '</td>';

            this.elements.tableBody.appendChild(row);
        });

        this.addTableEventListeners();
    }

    getStatusBadge(useYn, startDt, endDt) {
        const now = new Date();
        const start = startDt ? new Date(startDt) : null;
        const end = endDt ? new Date(endDt) : null;

        let displayStatus = useYn === 'Y' ? '활성' : '비활성';
        let badgeClass = 'badge';

        if (useYn === 'Y') {
            if (start && end && now >= start && now <= end) {
                displayStatus = '게시 중';
                badgeClass += ' badge-success';
            } else if (end && now > end) {
                displayStatus = '기간 만료';
                badgeClass += ' badge-secondary';
            } else if (start && now < start) {
                displayStatus = '예약됨';
                badgeClass += ' badge-info';
            } else {
                displayStatus = '활성';
                badgeClass += ' badge-success';
            }
        } else {
            displayStatus = '비활성';
            badgeClass += ' badge-secondary';
        }

        return '<span class="' + badgeClass + '">' + displayStatus + '</span>';
    }

    addTableEventListeners() {
        const container = document.getElementById('mngr_sett_page');
        if (!container) return;

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const popupId = e.target.dataset.popupId;
                this.openPopupModal(popupId);
            });
        });

        container.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const popupId = e.target.dataset.popupId;
                this.previewPopupById(popupId);
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const popupId = e.target.dataset.popupId;
                this.deletePopup(popupId);
            });
        });
    }

    renderPagination() {
        const container = document.getElementById('popupPagination');
        if (!container) return;

        container.innerHTML = '';

        if (this.totalPages <= 1) return;

        const itemsPerPageSelect = document.createElement('select');
        itemsPerPageSelect.style.cssText = 'padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 15px;';
        [5, 10, 20, 50].forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option + ' 건';
            if (option === this.itemsPerPage) {
                optionElement.selected = true;
            }
            itemsPerPageSelect.appendChild(optionElement);
        });
        itemsPerPageSelect.addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadPopups();
        });

        container.appendChild(itemsPerPageSelect);

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '이전';
        prevBtn.className = 'btn';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadPopups();
            }
        });
        container.appendChild(prevBtn);

        for (let i = 1; i <= this.totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = 'btn ' + (i === this.currentPage ? 'btn-primary' : '');
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.loadPopups();
            });
            container.appendChild(pageBtn);
        }

        const nextBtn = document.createElement('button');
        nextBtn.textContent = '다음';
        nextBtn.className = 'btn';
        nextBtn.disabled = this.currentPage === this.totalPages;
        nextBtn.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadPopups();
            }
        });
        container.appendChild(nextBtn);
    }

    async openPopupModal(popupId = null) {
        this.currentPopupId = popupId;
        this.uploadedImageFile = null;

        const modalTitle = document.getElementById('popupModalTitle');
        const form = this.elements.popupForm;

        if (popupId) {
            modalTitle.textContent = '팝업 수정';
            try {
                const popup = await popupManagementApi.getPopup(popupId);
                this.populateForm(popup);
            } catch (error) {
                showToast('팝업 정보 로드 실패: ' + error.message, 'error');
                return;
            }
        } else {
            modalTitle.textContent = '팝업 생성';
            form.reset();
            this.clearImagePreview();

            document.getElementById('popupWidth').value = 400;
            document.getElementById('popupHeight').value = 300;
            document.getElementById('popupBgColor').value = '#ffffff';
            document.getElementById('popupStatus').value = 'ACTIVE';
            document.getElementById('popupHideDaysMax').value = 7;

            // 기본 날짜 설정 (오늘 ~ 오늘+7일)
            document.getElementById('popupStartDate').value = this.getDefaultStartDate();
            document.getElementById('popupEndDate').value = this.getDefaultEndDate();
        }

        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.field-error').forEach(el => el.remove());

        // 초기 미리보기 업데이트
        this.updateLivePreview();

        this.elements.popupModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    populateForm(popup) {
        console.log('🔍 [PIPELINE] Frontend: populateForm() 시작 - 받은 데이터:', popup);
        document.getElementById('popupId').value = popup.popup_id || '';
        document.getElementById('popupTitle').value = popup.titl || '';
        document.getElementById('popupContent').value = popup.cont || '';
        document.getElementById('popupLinkUrl').value = popup.lnk_url || '';
        
        // 날짜 처리 - 다양한 형식 지원
        let startDateStr = '';
        let endDateStr = '';
        
        if (popup.start_dt) {
            // ISO 8601 형식(2026-04-15T00:00:00) 또는 공백 구분(2026-04-15 00:00:00)
            startDateStr = popup.start_dt.split(/[T ]/)[0];
        }
        if (popup.end_dt) {
            endDateStr = popup.end_dt.split(/[T ]/)[0];
        }
        
        console.log('🔍 [PIPELINE] Frontend: 날짜 파싱 결과:', { startDateStr, endDateStr, raw_start: popup.start_dt, raw_end: popup.end_dt });
        
        document.getElementById('popupStartDate').value = startDateStr;
        document.getElementById('popupEndDate').value = endDateStr;
        document.getElementById('popupWidth').value = popup.width || 400;
        document.getElementById('popupHeight').value = popup.height || 300;
        document.getElementById('popupBgColor').value = popup.bg_colr || '#ffffff';
        document.getElementById('popupStatus').value = popup.use_yn === 'Y' ? 'ACTIVE' : 'INACTIVE';
        document.getElementById('popupHideDaysMax').value = popup.hide_days_max || 7;
        document.getElementById('popupLocation').value = popup.loc || 'CENTER';

        if (popup.img_path) {
            this.showImagePreview(popup.img_path);
            // 이미지 URL을 미리보기에 설정
            const previewImage = document.getElementById('previewImage');
            if (previewImage) {
                previewImage.src = popup.img_path;
                previewImage.style.display = 'block';
            }
        } else {
            this.clearImagePreview();
        }
        
        // 수정 모드에서도 미리보기 업데이트
        this.updateLivePreview();
    }

    updateLivePreview() {
        const title = document.getElementById('popupTitle')?.value || '팝업 제목';
        const content = document.getElementById('popupContent')?.value || '팝업 내용이 여기에 표시됩니다.';
        const linkUrl = document.getElementById('popupLinkUrl')?.value || '';
        const width = document.getElementById('popupWidth')?.value || 400;
        const height = document.getElementById('popupHeight')?.value || 300;
        const bgColor = document.getElementById('popupBgColor')?.value || '#ffffff';
        
        const previewTitle = document.getElementById('previewTitle');
        const previewContent = document.getElementById('previewContent');
        const previewLink = document.getElementById('previewLink');
        const previewImage = document.getElementById('previewImage');
        const livePreview = document.getElementById('livePreview');
        
        if (previewTitle) previewTitle.textContent = title;
        if (previewContent) previewContent.textContent = content;
        
        if (livePreview) {
            livePreview.style.width = width + 'px';
            livePreview.style.height = height ? height + 'px' : 'auto';
            livePreview.style.backgroundColor = bgColor;
            livePreview.style.maxWidth = '100%';
        }
        
        if (previewLink) {
            if (linkUrl) {
                previewLink.style.display = 'block';
                const link = previewLink.querySelector('a');
                if (link) link.href = linkUrl;
            } else {
                previewLink.style.display = 'none';
            }
        }
        
        // 이미지 미리보기 업데이트
        if (this.uploadedImageFile && previewImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
            };
            reader.readAsDataURL(this.uploadedImageFile);
        } else if (previewImage) {
            previewImage.style.display = 'none';
        }
    }

    closePopupModal() {
        if (this.elements.popupModal) {
            this.elements.popupModal.style.display = 'none';
        }
        document.body.style.overflow = '';
        this.currentPopupId = null;
        this.uploadedImageFile = null;

        if (this.elements.popupForm) {
            this.elements.popupForm.reset();
        }
        this.clearImagePreview();

        if (this.elements.popupPreview) {
            this.elements.popupPreview.style.display = 'none';
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('이미지 파일만 업로드 가능합니다.', 'warning');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('파일 크기는 5MB 이하여야 합니다.', 'warning');
            return;
        }

        this.uploadedImageFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.showImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    showImagePreview(imageUrl) {
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImg = document.getElementById('imagePreview');

        if (previewContainer && previewImg) {
            previewImg.src = imageUrl;
            previewContainer.style.display = 'block';
        }
    }

    clearImagePreview() {
        const previewContainer = document.getElementById('imagePreviewContainer');
        const previewImg = document.getElementById('imagePreview');

        if (previewContainer && previewImg) {
            previewImg.src = '';
            previewContainer.style.display = 'none';
        }

        const fileInput = document.getElementById('popupImageInput');
        if (fileInput) {
            fileInput.value = '';
        }
    }

    /**
     * 기본 시작일 반환 (오늘 날짜)
     * @returns {string} YYYY-MM-DD
     */
    getDefaultStartDate() {
        const now = getKSTNow();
        return formatDate(now);
    }

    /**
     * 기본 종료일 반환 (오늘 + 7일)
     * @returns {string} YYYY-MM-DD
     */
    getDefaultEndDate() {
        const now = getKSTNow();
        now.setDate(now.getDate() + 7);
        return formatDate(now);
    }

    async savePopup() {
        // 저장 버튼 중복 클릭 방지
        const saveBtn = document.getElementById('savePopupBtn');
        if (saveBtn && saveBtn.disabled) {
            return;
        }
        if (saveBtn) {
            saveBtn.disabled = true;
        }

        if (!this.validateForm()) {
            showToast('필수 입력 항목을 확인해주세요.', 'warning');
            if (saveBtn) saveBtn.disabled = false;
            return;
        }

        // 제목과 내용 빈 값 검증
        const title = document.getElementById('popupTitle').value.trim();
        const content = document.getElementById('popupContent').value.trim();
        if (!title || !content) {
            showToast('제목과 내용을 입력해주세요.', 'warning');
            if (saveBtn) saveBtn.disabled = false;
            return;
        }

        const formData = new FormData();

        // 날짜 처리 - 빈 값이면 기본값 사용
        const startDateInput = document.getElementById('popupStartDate').value;
        const endDateInput = document.getElementById('popupEndDate').value;
        const startDate = startDateInput || this.getDefaultStartDate();
        const endDate = endDateInput || this.getDefaultEndDate();

        formData.append('titl', title);
        formData.append('cont', content);
        formData.append('lnk_url', document.getElementById('popupLinkUrl').value.trim());
        formData.append('start_dt', startDate + ' 00:00:00');
        formData.append('end_dt', endDate + ' 23:59:59');
        formData.append('width', document.getElementById('popupWidth').value);
        formData.append('height', document.getElementById('popupHeight').value);
        formData.append('bg_colr', document.getElementById('popupBgColor').value);
        formData.append('use_yn', document.getElementById('popupStatus').value === 'ACTIVE' ? 'Y' : 'N');
        formData.append('hide_days_max', document.getElementById('popupHideDaysMax').value);
        formData.append('loc', document.getElementById('popupLocation').value);

        if (this.uploadedImageFile) {
            formData.append('image', this.uploadedImageFile);
        }

        try {
            if (this.currentPopupId) {
                await popupManagementApi.updatePopup(this.currentPopupId, formData);
                showToast('팝업이 성공적으로 수정되었습니다.', 'success');
            } else {
                await popupManagementApi.createPopup(formData);
                showToast('팝업이 성공적으로 생성되었습니다.', 'success');
            }

            await this.closePopupModal();
            await this.loadPopups();
        } catch (error) {
            showToast('저장 실패: ' + error.message, 'error');
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    async deletePopup(popupId) {
        if (!confirm('정말로 이 팝업을 삭제하시겠습니까?')) {
            return;
        }

        try {
            await popupManagementApi.deletePopup(popupId);
            showToast('팝업이 성공적으로 삭제되었습니다.', 'success');
            this.loadPopups();
        } catch (error) {
            showToast('삭제 실패: ' + error.message, 'error');
        }
    }

    async previewPopupById(popupId) {
        try {
            const popup = await popupManagementApi.getPopup(popupId);
            
            // 모달 열고 해당 팝업 데이터로 채우기
            this.openPopupModal(popupId);
            
            // 미리보기 업데이트
            const previewTitle = document.getElementById('previewTitle');
            const previewContent = document.getElementById('previewContent');
            const previewLink = document.getElementById('previewLink');
            const previewImage = document.getElementById('previewImage');
            const livePreview = document.getElementById('livePreview');
            
            if (previewTitle) previewTitle.textContent = popup.titl || '팝업 제목';
            if (previewContent) previewContent.textContent = popup.cont || '';
            
            if (livePreview) {
                livePreview.style.width = (popup.width || 400) + 'px';
                livePreview.style.height = popup.height ? popup.height + 'px' : 'auto';
                livePreview.style.backgroundColor = popup.bg_colr || '#ffffff';
                livePreview.style.maxWidth = '100%';
            }
            
            if (previewLink) {
                if (popup.lnk_url) {
                    previewLink.style.display = 'block';
                    const link = previewLink.querySelector('a');
                    if (link) link.href = popup.lnk_url;
                } else {
                    previewLink.style.display = 'none';
                }
            }
            
            if (previewImage) {
                if (popup.img_path) {
                    previewImage.src = popup.img_path;
                    previewImage.style.display = 'block';
                } else {
                    previewImage.style.display = 'none';
                }
            }
        } catch (error) {
            showToast('미리보기 로드 실패: ' + error.message, 'error');
        }
    }

    async previewPopupById(popupId) {
        try {
            const popup = await popupManagementApi.getPopup(popupId);
            const previewContainer = document.getElementById('popupPreviewContainer');
            if (previewContainer) {
                const imageHtml = popup.img_path ? '<img src="' + popup.img_path + '" style="max-width: 100%; margin-bottom: 15px;"><br>' : '';
                const linkHtml = popup.lnk_url ? '<br><a href="' + popup.lnk_url + '" target="_blank">자세히 보기</a>' : '';
                previewContainer.innerHTML = '<div style="width: ' + (popup.width || 400) + 'px; height: ' + (popup.height || 300) + 'px; background: ' + (popup.bg_colr || '#ffffff') + '; border: 1px solid #ddd; border-radius: 8px; padding: 20px; overflow: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">' + imageHtml + '<h3 style="margin-top: 0; margin-bottom: 15px;">' + popup.titl + '</h3><div style="white-space: pre-wrap;">' + popup.cont + '</div>' + linkHtml + '</div>';
                previewContainer.style.display = 'block';
            }
        } catch (error) {
            showToast('미리보기 로드 실패: ' + error.message, 'error');
        }
    }
}

export const popupManagementTab = new PopupManagementTab();
