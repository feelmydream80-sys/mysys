/**
 * Popup Management Module for mngr_sett.html
 * Handles CRUD operations for popup management
 */

const PopupManagement = (function() {
    'use strict';

    // State
    let popups = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let editingPopupId = null;

    // DOM Elements
    let elements = {};

    /**
     * Initialize the popup management module
     */
    function init() {
        cacheElements();
        bindEvents();
        loadPopups();
    }

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements = {
            searchInput: document.getElementById('popupSearchInput'),
            addBtn: document.getElementById('addPopupBtn'),
            tableBody: document.getElementById('popupTableBody'),
            pagination: document.getElementById('popupPagination'),
            modal: document.getElementById('popupModal'),
            modalTitle: document.getElementById('popupModalTitle'),
            closeModal: document.getElementById('closePopupModal'),
            cancelBtn: document.getElementById('cancelPopupBtn'),
            saveBtn: document.getElementById('savePopupBtn'),
            previewBtn: document.getElementById('previewPopupBtn'),
            form: document.getElementById('popupForm'),
            // Form fields
            popupId: document.getElementById('popupId'),
            title: document.getElementById('popupTitle'),
            content: document.getElementById('popupContent'),
            imageInput: document.getElementById('popupImageInput'),
            imagePreview: document.getElementById('imagePreview'),
            imagePreviewContainer: document.getElementById('imagePreviewContainer'),
            linkUrl: document.getElementById('popupLinkUrl'),
            startDate: document.getElementById('popupStartDate'),
            endDate: document.getElementById('popupEndDate'),
            width: document.getElementById('popupWidth'),
            height: document.getElementById('popupHeight'),
            bgColor: document.getElementById('popupBgColor'),
            status: document.getElementById('popupStatus'),
            hideDaysMax: document.getElementById('popupHideDaysMax'),
            targetPages: document.querySelectorAll('input[name="target_pages"]'),
            previewContainer: document.getElementById('popupPreviewContainer')
        };
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        // Search
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(loadPopups, 300));
        }

        // Add button
        if (elements.addBtn) {
            elements.addBtn.addEventListener('click', openCreateModal);
        }

        // Modal controls
        if (elements.closeModal) {
            elements.closeModal.addEventListener('click', closeModal);
        }
        if (elements.cancelBtn) {
            elements.cancelBtn.addEventListener('click', closeModal);
        }
        if (elements.saveBtn) {
            elements.saveBtn.addEventListener('click', savePopup);
        }
        if (elements.previewBtn) {
            elements.previewBtn.addEventListener('click', previewPopup);
        }

        // Image upload
        if (elements.imageInput) {
            elements.imageInput.addEventListener('change', handleImageUpload);
        }

        // Close modal on outside click
        if (elements.modal) {
            elements.modal.addEventListener('click', function(e) {
                if (e.target === elements.modal) {
                    closeModal();
                }
            });
        }
    }

    /**
     * Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Load popups from API
     */
    async function loadPopups() {
        try {
            showLoading();
            
            const searchTerm = elements.searchInput ? elements.searchInput.value : '';
            const response = await fetch('/api/popups?include_inactive=true');
            
            if (!response.ok) {
                throw new Error('Failed to load popups');
            }
            
            popups = await response.json();
            
            // Filter by search term
            if (searchTerm) {
                popups = popups.filter(p => 
                    (p.TITL || '').toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            
            renderTable();
            renderPagination();
        } catch (error) {
            console.error('Error loading popups:', error);
            alert('팝업 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            hideLoading();
        }
    }

    /**
     * Show loading state
     */
    function showLoading() {
        if (elements.tableBody) {
            elements.tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">로딩 중...</td></tr>';
        }
    }

    /**
     * Hide loading state
     */
    function hideLoading() {
        // Loading will be replaced by render
    }

    /**
     * Render popup table
     */
    function renderTable() {
        if (!elements.tableBody) return;

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pagePopups = popups.slice(start, end);

        if (pagePopups.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">등록된 팝업이 없습니다.</td></tr>';
            return;
        }

        elements.tableBody.innerHTML = pagePopups.map(popup => `
            <tr data-popup-id="${popup.POPUP_ID}">
                <td>${popup.POPUP_ID}</td>
                <td>${escapeHtml(popup.TITL || '')}</td>
                <td>${formatDate(popup.START_DT)} ~ ${formatDate(popup.END_DT)}</td>
                <td>${popup.WIDTH || 500}x${popup.HEIGHT || 'auto'}</td>
                <td>${formatTargetPages(popup.TARGET_PAGES)}</td>
                <td>
                    <span class="status-badge ${popup.USE_YN === 'Y' ? 'active' : 'inactive'}">
                        ${popup.USE_YN === 'Y' ? '활성' : '비활성'}
                    </span>
                </td>
                <td>${formatDate(popup.REG_DT)}</td>
                <td>
                    <button class="edit-btn" onclick="PopupManagement.editPopup(${popup.POPUP_ID})">수정</button>
                    <button class="delete-btn" onclick="PopupManagement.deletePopup(${popup.POPUP_ID})">삭제</button>
                    <button class="preview-btn" onclick="PopupManagement.previewExisting(${popup.POPUP_ID})">미리보기</button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Render pagination
     */
    function renderPagination() {
        if (!elements.pagination) return;

        const totalPages = Math.ceil(popups.length / itemsPerPage);
        
        if (totalPages <= 1) {
            elements.pagination.innerHTML = '';
            return;
        }

        let html = '';
        
        // Previous button
        html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="PopupManagement.goToPage(${currentPage - 1})">이전</button>`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                html += `<button class="active">${i}</button>`;
            } else {
                html += `<button onclick="PopupManagement.goToPage(${i})">${i}</button>`;
            }
        }
        
        // Next button
        html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="PopupManagement.goToPage(${currentPage + 1})">다음</button>`;
        
        elements.pagination.innerHTML = html;
    }

    /**
     * Go to specific page
     */
    function goToPage(page) {
        const totalPages = Math.ceil(popups.length / itemsPerPage);
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        renderTable();
        renderPagination();
    }

    /**
     * Open create modal
     */
    function openCreateModal() {
        editingPopupId = null;
        elements.modalTitle.textContent = '팝업 생성';
        resetForm();
        openModal();
    }

    /**
     * Open edit modal
     */
    async function editPopup(popupId) {
        editingPopupId = popupId;
        elements.modalTitle.textContent = '팝업 수정';
        
        try {
            const response = await fetch(`/api/popups/${popupId}`);
            if (!response.ok) throw new Error('Failed to load popup');
            
            const popup = await response.json();
            fillForm(popup);
            openModal();
        } catch (error) {
            console.error('Error loading popup:', error);
            alert('팝업 정보를 불러오는 중 오류가 발생했습니다.');
        }
    }

    /**
     * Open modal
     */
    function openModal() {
        if (elements.modal) {
            elements.modal.style.display = 'block';
        }
    }

    /**
     * Close modal
     */
    function closeModal() {
        if (elements.modal) {
            elements.modal.style.display = 'none';
        }
        resetForm();
        editingPopupId = null;
    }

    /**
     * Reset form
     */
    function resetForm() {
        if (elements.form) elements.form.reset();
        if (elements.popupId) elements.popupId.value = '';
        if (elements.imagePreviewContainer) elements.imagePreviewContainer.style.display = 'none';
        if (elements.imagePreview) elements.imagePreview.src = '';
        
        // Reset checkboxes
        if (elements.targetPages) {
            elements.targetPages.forEach(cb => {
                cb.checked = cb.value === 'dashboard';
            });
        }
    }

    /**
     * Fill form with popup data
     */
    function fillForm(popup) {
        if (elements.popupId) elements.popupId.value = popup.POPUP_ID || '';
        if (elements.title) elements.title.value = popup.TITL || '';
        if (elements.content) elements.content.value = popup.CONT || '';
        if (elements.linkUrl) elements.linkUrl.value = popup.LNK_URL || '';
        
        // Dates
        if (elements.startDate) {
            elements.startDate.value = popup.START_DT ? popup.START_DT.split('T')[0] : '';
        }
        if (elements.endDate) {
            elements.endDate.value = popup.END_DT ? popup.END_DT.split('T')[0] : '';
        }
        
        // Dimensions
        if (elements.width) elements.width.value = popup.WIDTH || 500;
        if (elements.height) elements.height.value = popup.HEIGHT || '';
        if (elements.bgColor) elements.bgColor.value = popup.BG_COLR || '#FFFFFF';
        
        // Status
        if (elements.status) {
            elements.status.value = popup.USE_YN === 'Y' ? 'ACTIVE' : 'INACTIVE';
        }
        
        // Hide days max
        if (elements.hideDaysMax) {
            elements.hideDaysMax.value = popup.HIDE_DAYS_MAX || 7;
        }
        
        // Target pages
        if (popup.TARGET_PAGES && elements.targetPages) {
            const pages = popup.TARGET_PAGES.split(',');
            elements.targetPages.forEach(cb => {
                cb.checked = pages.includes(cb.value) || popup.TARGET_PAGES === 'ALL';
            });
        }
        
        // Image preview
        if (popup.IMG_PATH && elements.imagePreview) {
            elements.imagePreview.src = popup.IMG_PATH;
            if (elements.imagePreviewContainer) {
                elements.imagePreviewContainer.style.display = 'block';
            }
        }
    }

    /**
     * Handle image upload
     */
    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = function(event) {
            if (elements.imagePreview) {
                elements.imagePreview.src = event.target.result;
            }
            if (elements.imagePreviewContainer) {
                elements.imagePreviewContainer.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Get form data
     */
    function getFormData() {
        const targetPages = [];
        if (elements.targetPages) {
            elements.targetPages.forEach(cb => {
                if (cb.checked) targetPages.push(cb.value);
            });
        }

        return {
            TITL: elements.title ? elements.title.value : '',
            CONT: elements.content ? elements.content.value : '',
            LNK_URL: elements.linkUrl ? elements.linkUrl.value : '',
            START_DT: elements.startDate ? `${elements.startDate.value} 00:00:00` : '',
            END_DT: elements.endDate ? `${elements.endDate.value} 23:59:59` : '',
            WIDTH: elements.width ? parseInt(elements.width.value) || 500 : 500,
            HEIGHT: elements.height ? parseInt(elements.height.value) || null : null,
            BG_COLR: elements.bgColor ? elements.bgColor.value : '#FFFFFF',
            USE_YN: elements.status && elements.status.value === 'ACTIVE' ? 'Y' : 'N',
            HIDE_DAYS_MAX: elements.hideDaysMax ? parseInt(elements.hideDaysMax.value) || 7 : 7,
            TARGET_PAGES: targetPages.length > 0 ? targetPages.join(',') : 'ALL',
            TARGET_ROLE: 'ALL',
            DISP_TYPE: 'MODAL',
            DISP_ORD: 999
        };
    }

    /**
     * Save popup (create or update)
     */
    async function savePopup() {
        try {
            // Validate
            if (!elements.title || !elements.title.value.trim()) {
                alert('제목을 입력해주세요.');
                return;
            }
            if (!elements.content || !elements.content.value.trim()) {
                alert('내용을 입력해주세요.');
                return;
            }
            if (!elements.startDate || !elements.startDate.value) {
                alert('시작일을 선택해주세요.');
                return;
            }
            if (!elements.endDate || !elements.endDate.value) {
                alert('종료일을 선택해주세요.');
                return;
            }

            // Upload image if selected
            let imagePath = '';
            if (elements.imageInput && elements.imageInput.files && elements.imageInput.files[0]) {
                const formData = new FormData();
                formData.append('file', elements.imageInput.files[0]);

                const uploadResponse = await fetch('/api/popups/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const error = await uploadResponse.json();
                    throw new Error(error.message || 'Image upload failed');
                }

                const uploadResult = await uploadResponse.json();
                imagePath = uploadResult.image_path;
            } else if (editingPopupId && elements.imagePreview && elements.imagePreview.src) {
                // Keep existing image
                const existingPopup = popups.find(p => p.POPUP_ID === editingPopupId);
                if (existingPopup) {
                    imagePath = existingPopup.IMG_PATH || '';
                }
            }

            // Prepare data
            const data = getFormData();
            if (imagePath) {
                data.IMG_PATH = imagePath;
            }

            // Save
            const url = editingPopupId ? `/api/popups/${editingPopupId}` : '/api/popups';
            const method = editingPopupId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Save failed');
            }

            alert(editingPopupId ? '팝업이 수정되었습니다.' : '팝업이 생성되었습니다.');
            closeModal();
            loadPopups();

        } catch (error) {
            console.error('Error saving popup:', error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
        }
    }

    /**
     * Delete popup
     */
    async function deletePopup(popupId) {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/popups/${popupId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            alert('팝업이 삭제되었습니다.');
            loadPopups();
        } catch (error) {
            console.error('Error deleting popup:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }

    /**
     * Preview popup
     */
    function previewPopup() {
        const data = getFormData();
        
        // Get image
        let imageHtml = '';
        if (elements.imagePreview && elements.imagePreview.src && elements.imagePreviewContainer.style.display !== 'none') {
            imageHtml = `<img src="${elements.imagePreview.src}" style="max-width:100%;margin-bottom:10px;">`;
        }

        const previewHtml = `
            <div style="
                width: ${data.WIDTH}px;
                height: ${data.HEIGHT ? data.HEIGHT + 'px' : 'auto'};
                background: ${data.BG_COLR};
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h3 style="margin-top:0;">${escapeHtml(data.TITL)}</h3>
                ${imageHtml}
                <div style="white-space:pre-wrap;">${escapeHtml(data.CONT)}</div>
                ${data.LNK_URL ? `<p style="color:#007bff;">링크: ${data.LNK_URL}</p>` : ''}
            </div>
        `;

        if (elements.previewContainer) {
            elements.previewContainer.innerHTML = previewHtml;
            elements.previewContainer.style.display = 'block';
        }
    }

    /**
     * Preview existing popup
     */
    function previewExisting(popupId) {
        const popup = popups.find(p => p.POPUP_ID === popupId);
        if (!popup) return;

        let imageHtml = '';
        if (popup.IMG_PATH) {
            imageHtml = `<img src="${popup.IMG_PATH}" style="max-width:100%;margin-bottom:10px;">`;
        }

        const previewHtml = `
            <div style="
                width: ${popup.WIDTH || 500}px;
                height: ${popup.HEIGHT ? popup.HEIGHT + 'px' : 'auto'};
                background: ${popup.BG_COLR || '#FFFFFF'};
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <h3 style="margin-top:0;">${escapeHtml(popup.TITL || '')}</h3>
                ${imageHtml}
                <div style="white-space:pre-wrap;">${escapeHtml(popup.CONT || '')}</div>
            </div>
        `;

        if (elements.previewContainer) {
            elements.previewContainer.innerHTML = previewHtml;
            elements.previewContainer.style.display = 'block';
        }
    }

    /**
     * Format date
     */
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    }

    /**
     * Format target pages
     */
    function formatTargetPages(pagesStr) {
        if (!pagesStr || pagesStr === 'ALL') return '전체';
        
        const pageMap = {
            'dashboard': '대시보드',
            'schedule': '스케줄',
            'analytics': '분석',
            'settings': '설정'
        };
        
        return pagesStr.split(',').map(p => pageMap[p] || p).join(', ');
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    return {
        init: init,
        editPopup: editPopup,
        deletePopup: deletePopup,
        goToPage: goToPage,
        previewExisting: previewExisting
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the popup management tab
    const popupTab = document.getElementById('popupManagement');
    if (popupTab) {
        PopupManagement.init();
    }
});
