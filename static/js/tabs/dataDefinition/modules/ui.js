import { TOAST_TYPES } from './constants.js';

// Toast 알림 함수
export function showToast(message, type = TOAST_TYPES.INFO) {
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
        case TOAST_TYPES.SUCCESS:
            toast.style.borderLeftColor = '#10b981';
            break;
        case TOAST_TYPES.ERROR:
            toast.style.borderLeftColor = '#ef4444';
            break;
        case TOAST_TYPES.WARNING:
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

// 모달 생성 함수
export function createModal(contentHTML, options = {}) {
    const { title, onSave, onCancel, saveText = '저장', cancelText = '취소' } = options;
    
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
        width: ${options.width || '600px'};
        max-width: 90%;
        max-height: 80%;
        overflow: auto;
    `;
    
    if (title) {
        const titleElement = document.createElement('h4');
        titleElement.style.cssText = 'margin-bottom: 15px; color: #333;';
        titleElement.textContent = title;
        modalContent.appendChild(titleElement);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = contentHTML;
    modalContent.appendChild(contentDiv);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = saveText;
    saveBtn.className = 'btn btn-primary';
    saveBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';
    if (options.saveDisabled) {
        saveBtn.disabled = true;
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
    cancelBtn.className = 'btn';
    cancelBtn.style.cssText = 'padding: 10px 20px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(saveBtn);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 이벤트 핸들러
    cancelBtn.addEventListener('click', () => {
        console.log('취소 버튼 클릭');
        if (onCancel) {
            onCancel();
        }
        window.isModalOpen = false;
        document.body.removeChild(modal);
    });

    saveBtn.addEventListener('click', async () => {
        if (onSave) {
            await onSave();
            window.isModalOpen = false;
            document.body.removeChild(modal);
        }
    });

    // 모달 외부 클릭으로 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('모달 외부 클릭');
            window.isModalOpen = false;
            document.body.removeChild(modal);
        }
    });

    return {
        modal,
        modalContent,
        saveBtn,
        cancelBtn
    };
}

// 그룹 추가 모달 HTML
export function getAddGroupModalHTML() {
    return `
        <div style="max-height: 400px; overflow-y: auto;">
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
}

// 그룹 수정 모달 HTML
export function getEditGroupModalHTML(group, groupHeader) {
    return `
        <div style="max-height: 400px; overflow-y: auto;">
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
}

// 상세 항목 추가/수정 모달 HTML
export function getDetailModalHTML(title, item = null, groupItemFields = []) {
    let html = `
        <div style="max-height: 400px; overflow-y: auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 코드</label>
                    ${!item ? `
                        <div style="position: relative; height: 40px;">
                            <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #666; font-weight: 600;">CD</span>
                            <input type="text" id="newDetailCd" 
                                   value="" 
                                   placeholder="숫자만 입력하세요"
                                   style="width: 100%; padding: 8px 8px 8px 35px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, ''); validateAddModal();">
                        </div>
                    ` : `
                        <input type="text" id="editDetailCd" 
                               value="${item?.CD || ''}" disabled
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; background-color: #f5f5f5;">
                    `}
                    ${!item ? `
                        <div id="newDetailCdError" style="color: #dc3545; font-size: 0.85rem; margin-top: 3px; display: none;"></div>
                    ` : ''}
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">데이터 명칭</label>
                    <input type="text" id="${item ? 'editDetailNm' : 'newDetailNm'}" 
                           value="${item?.cd_nm || ''}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">활용목적</label>
                    <input type="text" id="${item ? 'editDetailDesc' : 'newDetailDesc'}" 
                           value="${item?.cd_desc || ''}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">사용여부</label>
                    <select id="${item ? 'editDetailUseYn' : 'newDetailUseYn'}" 
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
                        <option value="Y" ${item && (item.use_yn === 'T' || item.use_yn === 'Y') ? 'selected' : ''}>사용중</option>
                        <option value="N" ${item && item.use_yn === 'N' ? 'selected' : ''}>사용안함</option>
                    </select>
                </div>
    `;
    
    // 그룹 설정된 필드만 표시
    groupItemFields.forEach(field => {
        html += `
            <div style="margin-bottom: 10px;">
                <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #555;">${field.label}</label>
                <input type="text" id="${item ? 'editDetail' : 'newDetail'}${field.key}" 
                       value="${item?.[field.key] || ''}" 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}