/**
 * Popup Display Module
 * Handles displaying active popups on user pages
 * Features: Multiple popups (max 5), 1-7 days hide option, 9 positions, draggable, ESC close, X button
 */

const PopupDisplay = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_POPUPS: 5,
        Z_INDEX_BASE: 1000,  // Nav menu보다 낮게 (Nav는 1100+)
        OFFSET_STEP: 20,
        STORAGE_KEY: 'hiddenPopups',
        MAX_WIDTH: 800,
        MAX_HEIGHT: 600
    };

    // 9 Positions configuration
    const POSITIONS = {
        'TOP_LEFT': { top: '60px', left: '20px', transform: 'none' },
        'TOP_CENTER': { top: '60px', left: '50%', transform: 'translateX(-50%)' },
        'TOP_RIGHT': { top: '60px', right: '20px', transform: 'none' },
        'CENTER_LEFT': { top: '50%', left: '20px', transform: 'translateY(-50%)' },
        'CENTER': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'CENTER_RIGHT': { top: '50%', right: '20px', transform: 'translateY(-50%)' },
        'BOTTOM_LEFT': { bottom: '20px', left: '20px', transform: 'none' },
        'BOTTOM_CENTER': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
        'BOTTOM_RIGHT': { bottom: '20px', right: '20px', transform: 'none' }
    };

    // Drag state
    let dragState = {
        isDragging: false,
        popup: null,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0
    };

    // State
    let activePopups = [];

    /**
     * Initialize popup display
     */
    function init() {
        // Clean up expired hidden popups
        cleanupHiddenPopups();
        
        // Load and display popups
        loadAndDisplayPopups();
        
        // Setup ESC key listener
        setupEscListener();
    }
    
    /**
     * Setup ESC key listener to close topmost popup
     */
    function setupEscListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && activePopups.length > 0) {
                // Find the popup with highest z-index
                const topPopup = activePopups.reduce((prev, current) => {
                    return (prev.zIndex > current.zIndex) ? prev : current;
                });
                closePopup(topPopup.popup_id, false);
            }
        });
    }

    /**
     * Clean up expired hidden popups from localStorage
     */
    function cleanupHiddenPopups() {
        const hiddenPopups = getHiddenPopups();
        const now = new Date();
        let hasChanges = false;

        Object.keys(hiddenPopups).forEach(id => {
            if (new Date(hiddenPopups[id]) < now) {
                delete hiddenPopups[id];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            saveHiddenPopups(hiddenPopups);
        }
    }

    /**
     * Get hidden popups from localStorage
     */
    function getHiddenPopups() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Error reading hidden popups:', e);
            return {};
        }
    }

    /**
     * Save hidden popups to localStorage
     */
    function saveHiddenPopups(hiddenPopups) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(hiddenPopups));
        } catch (e) {
            console.error('Error saving hidden popups:', e);
        }
    }

    /**
     * Load and display active popups
     */
    async function loadAndDisplayPopups() {
        try {
            const response = await fetch('/api/popups/active');
            if (!response.ok) {
                throw new Error('Failed to load popups');
            }

            const popups = await response.json();
            
            if (!Array.isArray(popups) || popups.length === 0) {
                return; // No active popups
            }

            // Filter out hidden popups
            const hiddenPopups = getHiddenPopups();
            const now = new Date();

            activePopups = popups
                .filter(popup => {
                    const hideUntil = hiddenPopups[popup.popup_id];
                    return !hideUntil || new Date(hideUntil) < now;
                })
                .sort((a, b) => (a.disp_ord || 999) - (b.disp_ord || 999))
                .slice(0, CONFIG.MAX_POPUPS);

            // Display popups
            activePopups.forEach((popup, index) => {
                createPopupElement(popup, index);
            });

        } catch (error) {
            console.error('Error loading popups:', error);
        }
    }

    /**
     * Setup drag functionality for the title bar
     */
    function setupDraggable(titleBar, popupContent) {
        titleBar.addEventListener('mousedown', (e) => {
            // Don't drag if clicking close button
            if (e.target.classList.contains('popup-close-btn')) return;

            dragState.isDragging = true;
            dragState.popup = popupContent;
            dragState.startX = e.clientX;
            dragState.startY = e.clientY;
            
            const rect = popupContent.getBoundingClientRect();
            dragState.initialLeft = rect.left;
            dragState.initialTop = rect.top;
            
            titleBar.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragState.isDragging || !dragState.popup) return;
            
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            
            dragState.popup.style.left = (dragState.initialLeft + dx) + 'px';
            dragState.popup.style.top = (dragState.initialTop + dy) + 'px';
            dragState.popup.style.transform = 'none';
            dragState.popup.style.right = 'auto';
            dragState.popup.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (dragState.isDragging && dragState.popup) {
                titleBar.style.cursor = 'grab';
                dragState.isDragging = false;
                dragState.popup = null;
            }
        });
    }

    /**
     * Create popup DOM element
     */
    function createPopupElement(popup, index) {
        const zIndex = CONFIG.Z_INDEX_BASE + index;
        const offset = index * CONFIG.OFFSET_STEP;
        popup.zIndex = zIndex;

        // Get position from popup.loc or default to CENTER
        const positionKey = (popup.loc && POSITIONS[popup.loc]) ? popup.loc : 'CENTER';
        const position = POSITIONS[positionKey];

        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'popup-display-modal';
        modal.id = 'popup-' + popup.popup_id;
        modal.setAttribute('data-popup-id', popup.popup_id);
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:' + zIndex + ';display:flex;justify-content:center;align-items:center;pointer-events:none;';

        // Calculate dimensions with max size limit
        const width = Math.min(popup.width || 500, CONFIG.MAX_WIDTH);
        const height = popup.height ? Math.min(popup.height, CONFIG.MAX_HEIGHT) : null;

        // Build position styles from the POSITIONS config
        let positionStyles = 'position:fixed;';
        if (position.top !== undefined) positionStyles += 'top:' + position.top + ';';
        if (position.bottom !== undefined) positionStyles += 'bottom:' + position.bottom + ';';
        if (position.left !== undefined) positionStyles += 'left:' + position.left + ';';
        if (position.right !== undefined) positionStyles += 'right:' + position.right + ';';
        positionStyles += 'transform:' + position.transform + ';';
        
        // Add stacked offset for multiple popups
        if (positionKey === 'CENTER') {
            positionStyles += 'margin-left:' + offset + 'px;margin-top:' + offset + 'px;';
        }

        // Create popup content
        const content = document.createElement('div');
        content.className = 'popup-content';
        content.style.cssText = positionStyles + 'width:' + width + 'px;' + (height ? 'height:' + height + 'px;' : 'max-height:80vh;') + 'max-width:' + CONFIG.MAX_WIDTH + 'px;max-height:' + CONFIG.MAX_HEIGHT + 'px;background:' + (popup.bg_colr || '#FFFFFF') + ';border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);pointer-events:auto;display:flex;flex-direction:column;overflow:hidden;';

        // Title bar with X button
        if (popup.titl) {
            const titleBar = document.createElement('div');
            titleBar.className = 'popup-title-bar';
            titleBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid #eee;background:' + (popup.bg_colr || '#FFFFFF') + ';cursor:grab;user-select:none;';

            const titleText = document.createElement('h3');
            titleText.textContent = popup.titl;
            titleText.style.cssText = 'margin:0;font-size:18px;font-weight:600;flex:1;';

            // X close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'popup-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = 'background:none;border:none;font-size:24px;line-height:1;cursor:pointer;color:#666;padding:0;margin:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:background-color 0.2s;';
            closeBtn.onmouseover = function() { this.style.backgroundColor = '#f0f0f0'; };
            closeBtn.onmouseout = function() { this.style.backgroundColor = 'transparent'; };
            closeBtn.onclick = function() { closePopup(popup.popup_id, false); };

            titleBar.appendChild(titleText);
            titleBar.appendChild(closeBtn);
            content.appendChild(titleBar);

            // Setup draggable functionality
            setupDraggable(titleBar, content);
        } else {
            // If no title, add an X button in the top-right corner
            const closeBtn = document.createElement('button');
            closeBtn.className = 'popup-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:none;border:none;font-size:24px;line-height:1;cursor:pointer;color:#666;padding:0;margin:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:background-color 0.2s;z-index:10;';
            closeBtn.onmouseover = function() { this.style.backgroundColor = '#f0f0f0'; };
            closeBtn.onmouseout = function() { this.style.backgroundColor = 'transparent'; };
            closeBtn.onclick = function() { closePopup(popup.popup_id, false); };
            content.appendChild(closeBtn);
        }

        // Content area (scrollable)
        const body = document.createElement('div');
        body.style.cssText = 'flex:1;overflow-y:auto;padding:20px;';

        // Image
        if (popup.img_path) {
            const imgContainer = document.createElement('div');
            imgContainer.style.cssText = 'margin-bottom:15px;text-align:center;';
            
            const img = document.createElement('img');
            img.src = popup.img_path;
            img.style.cssText = 'max-width:100%;height:auto;border-radius:4px;cursor:' + (popup.lnk_url ? 'pointer' : 'default') + ';';
            
            if (popup.lnk_url) {
                img.onclick = function() { window.open(popup.lnk_url, '_blank'); };
                img.title = '클릭하여 이동';
            }
            
            imgContainer.appendChild(img);
            body.appendChild(imgContainer);
        }

        // Text content
        if (popup.cont) {
            const text = document.createElement('div');
            text.innerHTML = popup.cont;
            text.style.cssText = 'white-space:pre-wrap;line-height:1.6;';
            body.appendChild(text);
        }

        content.appendChild(body);

        // Footer with hide options
        const footer = document.createElement('div');
        footer.style.cssText = 'padding:15px 20px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.02);';

        // Hide options with Apply button
        if (popup.hide_opt_yn === 'Y') {
            const hideContainer = document.createElement('div');
            hideContainer.style.cssText = 'display:flex;align-items:center;gap:10px;';

            const label = document.createElement('label');
            label.textContent = '보지 않기:';
            label.style.fontSize = '14px';
            hideContainer.appendChild(label);

            const select = document.createElement('select');
            select.id = 'hide-days-' + popup.popup_id;
            select.style.cssText = 'padding:5px 10px;border:1px solid #ddd;border-radius:4px;font-size:14px;';

            const maxDays = Math.min(popup.hide_days_max || 7, 7);
            for (let i = 1; i <= maxDays; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i + '일';
                if (i === 1) option.selected = true;
                select.appendChild(option);
            }

            hideContainer.appendChild(select);
            
            // Apply button
            const applyButton = document.createElement('button');
            applyButton.textContent = '적용';
            applyButton.style.cssText = 'padding:5px 15px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;margin-left:5px;';
            applyButton.onclick = function() {
                const hideDays = parseInt(document.getElementById('hide-days-' + popup.popup_id).value);
                closePopup(popup.popup_id, true, hideDays);
            };
            hideContainer.appendChild(applyButton);
            
            footer.appendChild(hideContainer);
        }

        content.appendChild(footer);
        modal.appendChild(content);

        // Add to document
        document.body.appendChild(modal);

        // Close on backdrop click (without saving)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePopup(popup.popup_id, false);
            }
        });
    }

    /**
     * Close popup
     */
    function closePopup(popupId, shouldHide, days) {
        days = days || 0;
        
        // Hide popup element
        const modal = document.getElementById('popup-' + popupId);
        if (modal) {
            modal.remove();
        }

        // Remove from active popups array
        activePopups = activePopups.filter(p => p.popup_id !== popupId);

        // Save hide preference
        if (shouldHide && days > 0) {
            hidePopup(popupId, days);
        }
    }

    /**
     * Hide popup for specified days
     */
    function hidePopup(popupId, days) {
        const hiddenPopups = getHiddenPopups();
        const hideUntil = new Date();
        hideUntil.setDate(hideUntil.getDate() + days);
        hideUntil.setHours(23, 59, 59, 999); // End of the day

        hiddenPopups[popupId] = hideUntil.toISOString();
        saveHiddenPopups(hiddenPopups);

        console.log('Popup ' + popupId + ' hidden until ' + hideUntil);
    }

    /**
     * Check if popup should be shown
     */
    function shouldShowPopup(popupId) {
        const hiddenPopups = getHiddenPopups();
        const hideUntil = hiddenPopups[popupId];
        
        if (!hideUntil) return true;
        
        return new Date() > new Date(hideUntil);
    }

    /**
     * Refresh popups (reload from server)
     */
    function refresh() {
        // Remove existing popups
        document.querySelectorAll('.popup-display-modal').forEach(function(modal) {
            modal.remove();
        });
        
        activePopups = [];
        
        // Reload
        loadAndDisplayPopups();
    }

    // Public API
    return {
        init: init,
        refresh: refresh,
        closePopup: closePopup,
        shouldShowPopup: shouldShowPopup,
        POSITIONS: POSITIONS
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in (not on login page)
    const isLoginPage = window.location.pathname === '/login';
    if (!isLoginPage) {
        PopupDisplay.init();
    }
});

// Expose to global scope for debugging
window.PopupDisplay = PopupDisplay;
