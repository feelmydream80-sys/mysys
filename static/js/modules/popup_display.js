/**
 * Popup Display Module
 * Handles displaying active popups on user pages
 * Features: Multiple popups (max 5), 1-7 days hide option
 */

const PopupDisplay = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        MAX_POPUPS: 5,
        Z_INDEX_BASE: 1050,
        OFFSET_STEP: 20,
        STORAGE_KEY: 'hiddenPopups'
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
                    const hideUntil = hiddenPopups[popup.POPUP_ID];
                    return !hideUntil || new Date(hideUntil) < now;
                })
                .sort((a, b) => (a.DISP_ORD || 999) - (b.DISP_ORD || 999))
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
     * Create popup DOM element
     */
    function createPopupElement(popup, index) {
        const zIndex = CONFIG.Z_INDEX_BASE + index;
        const offset = index * CONFIG.OFFSET_STEP;

        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'popup-display-modal';
        modal.id = `popup-${popup.POPUP_ID}`;
        modal.setAttribute('data-popup-id', popup.POPUP_ID);
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: ${zIndex};
            display: flex;
            justify-content: center;
            align-items: center;
            pointer-events: none;
        `;

        // Create popup content
        const content = document.createElement('div');
        content.className = 'popup-content';
        content.style.cssText = `
            position: relative;
            width: ${popup.WIDTH || 500}px;
            ${popup.HEIGHT ? `height: ${popup.HEIGHT}px;` : 'max-height: 80vh;'}
            background: ${popup.BG_COLR || '#FFFFFF'};
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transform: translate(${offset}px, ${offset}px);
            pointer-events: auto;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            border: none;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.onclick = () => closePopup(popup.POPUP_ID, false);
        content.appendChild(closeBtn);

        // Title
        if (popup.TITL) {
            const title = document.createElement('h3');
            title.textContent = popup.TITL;
            title.style.cssText = `
                margin: 0;
                padding: 15px 20px;
                border-bottom: 1px solid #eee;
                font-size: 18px;
                font-weight: 600;
            `;
            content.appendChild(title);
        }

        // Content area (scrollable)
        const body = document.createElement('div');
        body.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        `;

        // Image
        if (popup.IMG_PATH) {
            const imgContainer = document.createElement('div');
            imgContainer.style.cssText = 'margin-bottom: 15px; text-align: center;';
            
            const img = document.createElement('img');
            img.src = popup.IMG_PATH;
            img.style.cssText = `
                max-width: 100%;
                height: auto;
                border-radius: 4px;
                cursor: ${popup.LNK_URL ? 'pointer' : 'default'};
            `;
            
            if (popup.LNK_URL) {
                img.onclick = () => window.open(popup.LNK_URL, '_blank');
                img.title = '클릭하여 이동';
            }
            
            imgContainer.appendChild(img);
            body.appendChild(imgContainer);
        }

        // Text content
        if (popup.CONT) {
            const text = document.createElement('div');
            text.innerHTML = popup.CONT;
            text.style.cssText = `
                white-space: pre-wrap;
                line-height: 1.6;
            `;
            body.appendChild(text);
        }

        content.appendChild(body);

        // Footer with hide options
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0, 0, 0, 0.02);
        `;

        // Hide options
        if (popup.HIDE_OPT_YN === 'Y') {
            const hideContainer = document.createElement('div');
            hideContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';

            const label = document.createElement('label');
            label.textContent = '보지 않기:';
            label.style.fontSize = '14px';
            hideContainer.appendChild(label);

            const select = document.createElement('select');
            select.id = `hide-days-${popup.POPUP_ID}`;
            select.style.cssText = `
                padding: 5px 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            `;

            const maxDays = Math.min(popup.HIDE_DAYS_MAX || 7, 7);
            for (let i = 1; i <= maxDays; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}일`;
                if (i === 1) option.selected = true;
                select.appendChild(option);
            }

            hideContainer.appendChild(select);
            footer.appendChild(hideContainer);
        }

        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '닫기';
        closeButton.style.cssText = `
            padding: 8px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeButton.onclick = () => {
            const hideDays = popup.HIDE_OPT_YN === 'Y' ? 
                parseInt(document.getElementById(`hide-days-${popup.POPUP_ID}`).value) : 0;
            closePopup(popup.POPUP_ID, hideDays > 0, hideDays);
        };
        footer.appendChild(closeButton);

        content.appendChild(footer);
        modal.appendChild(content);

        // Add to document
        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePopup(popup.POPUP_ID, false);
            }
        });
    }

    /**
     * Close popup
     */
    function closePopup(popupId, shouldHide = false, days = 0) {
        // Hide popup element
        const modal = document.getElementById(`popup-${popupId}`);
        if (modal) {
            modal.remove();
        }

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

        console.log(`Popup ${popupId} hidden until ${hideUntil}`);
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
        document.querySelectorAll('.popup-display-modal').forEach(modal => {
            modal.remove();
        });
        
        // Reload
        loadAndDisplayPopups();
    }

    // Public API
    return {
        init: init,
        refresh: refresh,
        closePopup: closePopup,
        shouldShowPopup: shouldShowPopup
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
