/**
 * API 키 관리 페이지의 Settings 모듈
 * - 메일 설정, 스케줄 설정, 이력, 알림 발송
 */

window.ApiKeyMngrUI = window.ApiKeyMngrUI || {};

// ==========================================
// 알림 메일 발송
// ==========================================

/**
 * 알림 메일 전송 (단일 CD)
 */
window.ApiKeyMngrUI.sendNotification = async function(cd) {
    if (!confirm(`선택한 API 키(CD: ${cd})의 소유자에게 만료 알림 메일을 전송하시겠습니까?`)) {
        return;
    }
    
    try {
        const result = await ApiKeyMngrData.sendEmail([cd]);
        
        if (result.success) {
            const successCount = result.results.success.length;
            const failedCount = result.results.failed.length;
            const skippedCount = result.results.skipped.length;
            
            let message = `메일 발송 완료: 성공 ${successCount}건`;
            if (failedCount > 0) message += `, 실패 ${failedCount}건`;
            if (skippedCount > 0) message += `, 건너뜀 ${skippedCount}건`;
            
            alert(message);
            
            // 실패/건너뜀 상세 정보 출력
            if (failedCount > 0) {
                console.error('실패 항목:', result.results.failed);
            }
            if (skippedCount > 0) {
                console.warn('건너뜀 항목:', result.results.skipped);
            }
        } else {
            alert(`메일 발송 실패: ${result.message}`);
        }
    } catch (error) {
        console.error('메일 전송 오류:', error);
        alert('메일 전송 중 오류가 발생했습니다.');
    }
};

/**
 * 알림 메일 전송 (선택된 여러 CD)
 */
window.ApiKeyMngrUI.sendNotificationBulk = async function(cds) {
    if (!cds || cds.length === 0) {
        alert('메일을 보낼 항목을 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택한 ${cds.length}개의 API 키 소유자에게 만료 알림 메일을 전송하시겠습니까?`)) {
        return;
    }
    
    try {
        const result = await ApiKeyMngrData.sendEmail(cds);
        
        if (result.success) {
            const successCount = result.results.success.length;
            const failedCount = result.results.failed.length;
            const skippedCount = result.results.skipped.length;
            
            let message = `메일 발송 완료: 성공 ${successCount}건`;
            if (failedCount > 0) message += `, 실패 ${failedCount}건`;
            if (skippedCount > 0) message += `, 건너뜀 ${skippedCount}건`;
            
            alert(message);
            
            // 실패/건너뜀 상세 정보 출력
            if (failedCount > 0) {
                console.error('실패 항목:', result.results.failed);
            }
            if (skippedCount > 0) {
                console.warn('건너뜀 항목:', result.results.skipped);
            }
        } else {
            alert(`메일 발송 실패: ${result.message}`);
        }
    } catch (error) {
        console.error('메일 전송 오류:', error);
        alert('메일 전송 중 오류가 발생했습니다.');
    }
};

// ==========================================
// 메일 설정
// ==========================================

/**
 * 미리보기용 샘플 데이터 로드
 */
window.ApiKeyMngrUI.loadPreviewSampleData = async function() {
    try {
        const response = await axios.get('/api/api_key_mngr');
        if (response.data.success && response.data.data.length > 0) {
            // 첫 번째 레코드를 샘플로 사용
            const item = response.data.data[0];
            const today = new Date();
            const startDate = new Date(item.start_dt);
            const expiryDate = new Date(startDate.getFullYear() + item.due, startDate.getMonth(), startDate.getDate());
            const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            window.ApiKeyMngrUI.previewSampleData = {
                cd: item.cd,
                cd_nm: item.cd_nm || '(명칭없음)',
                expiry_dt: expiryDate.toISOString().split('T')[0],
                days_remaining: daysRemaining,
                start_dt: item.start_dt,
                due: item.due,
                api_ownr_email_addr: item.api_ownr_email_addr || ''
            };
            
            // 미리보기 업데이트
            window.ApiKeyMngrUI.updatePreview('30');
            window.ApiKeyMngrUI.updatePreview('7');
            window.ApiKeyMngrUI.updatePreview('0');
        }
    } catch (error) {
        console.error('미리보기 샘플 데이터 로드 오류:', error);
    }
};

/**
 * 메일 미리보기 업데이트 (DB 실제 데이터 사용)
 */
window.ApiKeyMngrUI.updatePreview = function(type) {
    const subjectEl = document.getElementById(`mail${type}_subject`);
    const bodyEl = document.getElementById(`mail${type}_body`);
    const previewSubjectEl = document.getElementById(`mail${type}_preview_subject`);
    const previewBodyEl = document.getElementById(`mail${type}_preview_body`);
    
    if (!subjectEl || !bodyEl || !previewSubjectEl || !previewBodyEl) return;
    
    const subject = subjectEl.value || '';
    const body = bodyEl.value || '';
    
    // 샘플 데이터 (DB에서 로드한 실제 데이터)
    const sampleData = window.ApiKeyMngrUI.previewSampleData ? { ...window.ApiKeyMngrUI.previewSampleData } : {
        cd: '(CD)',
        cd_nm: '(코드명칭)',
        expiry_dt: '(만료일)',
        days_remaining: '25',
        start_dt: '(등록일)',
        due: '(기간)',
        api_ownr_email_addr: '(이메일)'
    };
    
    // 조사 처리
    sampleData.iga = window.ApiKeyMngrUI.getParticle(sampleData.cd_nm, 'iga');
    
    let previewSubject = subject;
    let previewBody = body;
    
    for (const [key, value] of Object.entries(sampleData)) {
        const placeholder = '{{' + key + '}}';
        previewSubject = previewSubject.split(placeholder).join(value);
        previewBody = previewBody.split(placeholder).join(value);
    }
    
    previewSubjectEl.textContent = previewSubject || '(제목을 입력하세요)';
    previewBodyEl.textContent = previewBody || '(내용을 입력하세요)';
};

/**
 * 기본 템플릿 값 채우기
 */
window.ApiKeyMngrUI.fillDefaultTemplate = function(type) {
    const defaultTemplates = {
        '30': {
            subject: '[빅데이터 플랫폼] {{cd_nm}} API 키 만료 알림 (D-{{days_remaining}})',
            body: 'API 키({{cd}}) {{cd_nm}}가 {{days_remaining}}일 후 만료됩니다.\n만료일: {{expiry_dt}}\n등록일: {{start_dt}}'
        },
        '7': {
            subject: '[긴급] {{cd_nm}} API 키 {{days_remaining}}일 후 만료',
            body: 'API 키({{cd}}) {{cd_nm}}가 {{days_remaining}}일 후 만료됩니다.\n만료일: {{expiry_dt}}\n등록일: {{start_dt}}'
        },
        '0': {
            subject: '[긴급] {{cd_nm}} API 키 오늘 만료!',
            body: 'API 키({{cd}}) {{cd_nm}}가 오늘 만료됩니다.\n만료일: {{expiry_dt}}\n등록일: {{start_dt}}'
        }
    };
    
    const template = defaultTemplates[type];
    if (!template) return;
    
    document.getElementById(`mail${type}_subject`).value = template.subject;
    document.getElementById(`mail${type}_body`).value = template.body;
    
    // 미리보기 업데이트
    window.ApiKeyMngrUI.updatePreview(type);
};

/**
 * 메일 설정 로드
 */
window.ApiKeyMngrUI.loadMailSettings = async function() {
    // 미리보기 샘플 데이터 먼저 로드
    await window.ApiKeyMngrUI.loadPreviewSampleData();
    
    // 기본 템플릿 값
    const defaultTemplates = {
        mail30: {
            subject: '[빅데이터 플랫폼] {{cd_nm}} API 키 만료 알림 (D-{{days_remaining}})',
            body: 'API 키 \'{{cd_nm}}({{cd}})\'가 {{days_remaining}}일 후 만료됩니다.\n\n' +
                  '만료일: {{expiry_dt}}\n' +
                  '등록일: {{start_dt}}\n' +
                  '기간: {{due}}년\n\n' +
                  '빠른 조치가 필요합니다. API 키를 갱신해 주세요.\n\n' +
                  '감사합니다.\n빅데이터 플랫폼 관리팀'
        },
        mail7: {
            subject: '[긴급] {{cd_nm}} API 키 {{days_remaining}}일 후 만료',
            body: 'API 키 \'{{cd_nm}}({{cd}})\'가 {{days_remaining}}일 후 만료됩니다.\n\n' +
                  '만료일: {{expiry_dt}}\n' +
                  '등록일: {{start_dt}}\n\n' +
                  '즉시 조치를 취해 주시기 바랍니다.\n\n' +
                  '감사합니다.\n빅데이터 플랫폼 관리팀'
        },
        mail0: {
            subject: '[긴급] {{cd_nm}} API 키 오늘 만료!',
            body: 'API 키 \'{{cd_nm}}({{cd}})\'가 오늘 만료됩니다.\n\n' +
                  '만료일: {{expiry_dt}}\n' +
                  '등록일: {{start_dt}}\n\n' +
                  '즉시 API 키를 갱신해 주시기 바랍니다.\n\n' +
                  '감사합니다.\n빅데이터 플랫폼 관리팀'
        }
    };
    
    try {
        const response = await axios.get('/api/api_key_mngr/mail_settings');
        if (response.data.success) {
            const settings = response.data.settings || {};
            
            // mail30 설정
            if (settings.mail30) {
                document.getElementById('mail30_subject').value = settings.mail30.subject || defaultTemplates.mail30.subject;
                document.getElementById('mail30_from').value = settings.mail30.from || '';
                document.getElementById('mail30_body').value = settings.mail30.body || defaultTemplates.mail30.body;
            } else {
                document.getElementById('mail30_subject').value = defaultTemplates.mail30.subject;
                document.getElementById('mail30_body').value = defaultTemplates.mail30.body;
            }
            
            // mail7 설정
            if (settings.mail7) {
                document.getElementById('mail7_subject').value = settings.mail7.subject || defaultTemplates.mail7.subject;
                document.getElementById('mail7_from').value = settings.mail7.from || '';
                document.getElementById('mail7_body').value = settings.mail7.body || defaultTemplates.mail7.body;
            } else {
                document.getElementById('mail7_subject').value = defaultTemplates.mail7.subject;
                document.getElementById('mail7_body').value = defaultTemplates.mail7.body;
            }
            
            // mail0 설정
            if (settings.mail0) {
                document.getElementById('mail0_subject').value = settings.mail0.subject || defaultTemplates.mail0.subject;
                document.getElementById('mail0_from').value = settings.mail0.from || '';
                document.getElementById('mail0_body').value = settings.mail0.body || defaultTemplates.mail0.body;
            } else {
                document.getElementById('mail0_subject').value = defaultTemplates.mail0.subject;
                document.getElementById('mail0_body').value = defaultTemplates.mail0.body;
            }
        }
    } catch (error) {
        console.error('메일 설정 로드 오류:', error);
        // 오류 시 기본값 설정
        ['30', '7', '0'].forEach(type => {
            document.getElementById(`mail${type}_subject`).value = defaultTemplates[`mail${type}`].subject;
            document.getElementById(`mail${type}_body`).value = defaultTemplates[`mail${type}`].body;
        });
    }
    
    // 미리보기 업데이트
    window.ApiKeyMngrUI.updatePreview('30');
    window.ApiKeyMngrUI.updatePreview('7');
    window.ApiKeyMngrUI.updatePreview('0');
    
    // 과거 버튼 상태 업데이트 (항상 호출)
    window.ApiKeyMngrUI.updateHistoryButtonStates();
};

/**
 * 메일 설정 저장
 */
window.ApiKeyMngrUI.saveMailSettings = async function() {
    const settings = {
        mail30: {
            subject: document.getElementById('mail30_subject')?.value || '',
            from: document.getElementById('mail30_from')?.value || '',
            body: document.getElementById('mail30_body')?.value || ''
        },
        mail7: {
            subject: document.getElementById('mail7_subject')?.value || '',
            from: document.getElementById('mail7_from')?.value || '',
            body: document.getElementById('mail7_body')?.value || ''
        },
        mail0: {
            subject: document.getElementById('mail0_subject')?.value || '',
            from: document.getElementById('mail0_from')?.value || '',
            body: document.getElementById('mail0_body')?.value || ''
        }
    };

    try {
        const response = await axios.post('/api/api_key_mngr/mail_settings', settings);
        if (response.data.success) {
            alert('메일 설정이 저장되었습니다.');
        } else {
            alert('메일 설정 저장 실패: ' + (response.data.message || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('메일 설정 저장 오류:', error);
        alert('메일 설정 저장 중 오류가 발생했습니다.');
    }
};

// ==========================================
// 스케줄 설정
// ==========================================

/**
 * 스케줄 설정 로드 (3개 스케줄: 30일전, 7일전, 당일)
 */
window.ApiKeyMngrUI.loadScheduleSettings = async function() {
    try {
        const settings = await ApiKeyMngrData.getScheduleSettings();
        
        if (settings && settings.length > 0) {
            // 스케줄 유형별 매핑
            const schdMap = {};
            settings.forEach(s => {
                schdMap[s.schd_tp] = s;
            });

            // 30일 전 스케줄
            const schd30 = schdMap['30일전'];
            if (schd30) {
                document.getElementById('schd_30_cycle').value = schd30.schd_cycle || '15';
                document.getElementById('schd_30_hour').value = schd30.schd_hour || '23';
                document.getElementById('schd_30_active').checked = schd30.is_active !== false;
            }

            // 7일 전 스케줄
            const schd7 = schdMap['7일전'];
            if (schd7) {
                document.getElementById('schd_7_cycle').value = schd7.schd_cycle || '1';
                document.getElementById('schd_7_hour').value = schd7.schd_hour || '9';
                document.getElementById('schd_7_active').checked = schd7.is_active !== false;
            }

            // 당일 스케줄
            const schd0 = schdMap['당일'];
            if (schd0) {
                document.getElementById('schd_0_cycle').value = schd0.schd_cycle || '1';
                document.getElementById('schd_0_hour').value = schd0.schd_hour || '9';
                document.getElementById('schd_0_active').checked = schd0.is_active !== false;
            }

            // 초기 실행 정보 업데이트
            window.ApiKeyMngrUI.updateScheduleInfo('30');
            window.ApiKeyMngrUI.updateScheduleInfo('7');
            window.ApiKeyMngrUI.updateScheduleInfo('0');
        }
    } catch (error) {
        console.error('스케줄 설정 로드 오류:', error);
    }
};

/**
 * 스케줄 설정 저장 (3개 스케줄)
 */
window.ApiKeyMngrUI.saveScheduleSettings = async function() {
    const schedules = [
        {
            schd_tp: '30일전',
            schd_cycle: parseInt(document.getElementById('schd_30_cycle')?.value || '15'),
            schd_hour: parseInt(document.getElementById('schd_30_hour')?.value || '23'),
            is_active: document.getElementById('schd_30_active')?.checked !== false
        },
        {
            schd_tp: '7일전',
            schd_cycle: parseInt(document.getElementById('schd_7_cycle')?.value || '1'),
            schd_hour: parseInt(document.getElementById('schd_7_hour')?.value || '9'),
            is_active: document.getElementById('schd_7_active')?.checked !== false
        },
        {
            schd_tp: '당일',
            schd_cycle: parseInt(document.getElementById('schd_0_cycle')?.value || '1'),
            schd_hour: parseInt(document.getElementById('schd_0_hour')?.value || '9'),
            is_active: document.getElementById('schd_0_active')?.checked !== false
        }
    ];

    try {
        const result = await ApiKeyMngrData.saveScheduleSettings(schedules);
        
        if (result) {
            alert('스케줄 설정이 저장되었습니다.');
            window.ApiKeyMngrUI.loadScheduleSettings();
        } else {
            alert('스케줄 설정 저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('스케줄 설정 저장 오류:', error);
        alert('스케줄 설정 저장 중 오류가 발생했습니다.');
    }
};

// ==========================================
// 테스트 메일
// ==========================================

/**
 * 테스트 메일 발송
 */
window.ApiKeyMngrUI.sendTestMail = async function() {
    const emailInput = document.getElementById('test-email-input');
    const testEmail = emailInput?.value?.trim() || '';
    
    if (!testEmail) {
        alert('테스트 수신 Email을 입력해주세요.');
        emailInput?.focus();
        return;
    }

    // 이메일 형식 간단 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
        alert('올바른 이메일 형식을 입력해주세요.');
        emailInput?.focus();
        return;
    }

    window.ApiKeyMngrUI.showLoading(true);
    try {
        const result = await ApiKeyMngrData.sendTestMail(testEmail);
        
        if (result.success) {
            alert(`테스트 메일이 발송되었습니다.\n\n수신: ${testEmail}\n결과: ${result.message || '성공'}`);
        } else {
            alert(`테스트 메일 발송 실패: ${result.message || '알 수 없는 오류'}`);
        }
    } catch (error) {
        console.error('테스트 메일 발송 오류:', error);
        alert('테스트 메일 발송 중 오류가 발생했습니다.');
    } finally {
        window.ApiKeyMngrUI.hideLoading();
    }
};

// ==========================================
// 메일 전송 이력
// ==========================================

/**
 * 메일 전송 이력 로드
 */
window.ApiKeyMngrUI.loadMailSendHistory = async function(page = 1, filters = {}) {
    const tableBody = document.getElementById('mail-send-history-table-body');
    const paginationDiv = document.getElementById('mail-send-history-pagination');
    if (!tableBody) return;

    window.ApiKeyMngrUI.mailSendHistoryPage = page;
    if (Object.keys(filters).length > 0) {
        window.ApiKeyMngrUI.mailSendHistoryFilters = filters;
    }

    try {
        const result = await ApiKeyMngrData.getMailSendHistory(
            page, 
            window.ApiKeyMngrUI.mailSendHistoryPageSize, 
            window.ApiKeyMngrUI.mailSendHistoryFilters
        );
        
        const logs = result.logs || [];
        const pagination = result.pagination || {};
        
        tableBody.innerHTML = '';
        
        if (logs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 px-6 text-center text-gray-500">
                        메일 전송 이력이 없습니다.
                    </td>
                </tr>
            `;
            if (paginationDiv) paginationDiv.innerHTML = '';
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition';
            
            const resultClass = log.success ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
            const resultText = log.success ? '성공' : '실패';
            const mailTpText = log.mail_tp === 'mail30' ? '30일전' : log.mail_tp === 'mail7' ? '7일전' : '당일';
            
            row.innerHTML = `
                <td class="py-4 px-6 text-gray-700">${log.reg_dt || '-'}</td>
                <td class="py-4 px-6 font-medium text-gray-800">${log.cd || '-'}</td>
                <td class="py-4 px-6 text-gray-700">${mailTpText}</td>
                <td class="py-4 px-6 text-gray-700">${log.sent_dt || '-'}</td>
                <td class="py-4 px-6 ${resultClass}">${resultText}</td>
                <td class="py-4 px-6 text-gray-500">${log.error_msg || '-'}</td>
            `;
            tableBody.appendChild(row);
        });

        // 페이지네이션 렌더링
        if (paginationDiv) {
            window.ApiKeyMngrUI.renderMailSendHistoryPagination(paginationDiv, pagination);
        }
    } catch (error) {
        console.error('메일 전송 이력 로드 오류:', error);
    }
};

/**
 * 메일 전송 이력 페이지네이션 렌더링
 */
window.ApiKeyMngrUI.renderMailSendHistoryPagination = function(container, pagination) {
    const currentPage = pagination.page || 1;
    const totalPages = pagination.total_pages || 1;
    
    container.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // 이전 버튼
    const prevBtn = document.createElement('button');
    prevBtn.className = 'px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition';
    prevBtn.innerHTML = '이전';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => window.ApiKeyMngrUI.loadMailSendHistory(currentPage - 1);
    container.appendChild(prevBtn);
    
    // 페이지 번호
    const visiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let endPage = Math.min(totalPages, startPage + visiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `px-3 py-1 rounded-lg text-sm font-medium ${i === currentPage ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'} transition`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => window.ApiKeyMngrUI.loadMailSendHistory(i);
        container.appendChild(pageBtn);
    }
    
    // 다음 버튼
    const nextBtn = document.createElement('button');
    nextBtn.className = 'px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition';
    nextBtn.innerHTML = '다음';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => window.ApiKeyMngrUI.loadMailSendHistory(currentPage + 1);
    container.appendChild(nextBtn);
};

/**
 * 메일 전송 이력 필터 적용
 */
window.ApiKeyMngrUI.filterMailSendHistory = function() {
    const cd = document.getElementById('mail-history-filter-cd')?.value || '';
    const mailTp = document.getElementById('mail-history-filter-tp')?.value || '';
    const success = document.getElementById('mail-history-filter-result')?.value || '';
    
    const filters = {};
    if (cd) filters.cd = cd;
    if (mailTp) filters.mail_tp = mailTp;
    if (success) filters.success = success === 'true' ? 'true' : success === 'false' ? 'false' : undefined;
    
    window.ApiKeyMngrUI.loadMailSendHistory(1, filters);
};

/**
 * 스케줄 메일 발송 (수동 실행)
 */
window.ApiKeyMngrUI.sendScheduledMails = async function() {
    if (!confirm('스케줄 규칙에 따라 메일 발송을 실행하시겠습니까?\n\n- 30일 전: 1회 발송\n- 7일 전~1일 전: 매일 발송\n- 당일: 1회 발송')) {
        return;
    }

    window.ApiKeyMngrUI.showLoading(true);
    try {
        const result = await ApiKeyMngrData.sendScheduledMails();
        
        if (result.success) {
            const successCount = result.results.success?.length || 0;
            const failedCount = result.results.failed?.length || 0;
            const skippedCount = result.results.skipped?.length || 0;
            
            let message = `스케줄 메일 발송 완료\n\n`;
            message += `✅ 성공: ${successCount}건\n`;
            if (failedCount > 0) message += `❌ 실패: ${failedCount}건\n`;
            message += `⏭️ 건너뜀: ${skippedCount}건`;
            
            alert(message);
            
            // 발송 이력 새로고침
            window.ApiKeyMngrUI.loadMailSendHistory();
        } else {
            alert(`스케줄 메일 발송 실패: ${result.message}`);
        }
    } catch (error) {
        console.error('스케줄 메일 발송 오류:', error);
        alert('스케줄 메일 발송 중 오류가 발생했습니다.');
    } finally {
        window.ApiKeyMngrUI.hideLoading();
    }
};

// ==========================================
// 이벤트 이력
// ==========================================

/**
 * 이벤트 이력 로드
 */
window.ApiKeyMngrUI.loadEventLog = async function() {
    const tableBody = document.getElementById('event-log-table-body');
    if (!tableBody) return;

    try {
        const response = await axios.get('/api/api_key_mngr/event_log');
        if (response.data.success) {
            const logs = response.data.logs || [];
            tableBody.innerHTML = '';
            
            if (logs.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="py-8 px-6 text-center text-gray-500">
                            전송 이력이 없습니다.
                        </td>
                    </tr>
                `;
                return;
            }

            logs.forEach(log => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition';
                
                const resultClass = log.success ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
                const resultText = log.success ? '성공' : '실패';
                
                row.innerHTML = `
                    <td class="py-4 px-6 text-gray-700">${log.sent_at || '-'}</td>
                    <td class="py-4 px-6 font-medium text-gray-800">${log.cd || '-'}</td>
                    <td class="py-4 px-6 text-gray-700">${log.to_email || '-'}</td>
                    <td class="py-4 px-6 ${resultClass}">${resultText}</td>
                    <td class="py-4 px-6 text-gray-500">${log.error_msg || '-'}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('이벤트 이력 로드 오류:', error);
    }
};

// ==========================================
// 메일 설정 이력
// ==========================================

/**
 * 과거 버전 데이터 로드
 */
window.ApiKeyMngrUI.loadHistoryVersion = async function(mailTp, version) {
    try {
        const result = await ApiKeyMngrData.getMailSettingHistory(mailTp, version);
        
        if (result && result.success) {
            const data = result.data;
            // 폼에 데이터 채우기
            document.getElementById(`mail${mailTp}_subject`).value = data.subject || '';
            document.getElementById(`mail${mailTp}_from`).value = data.from_email || '';
            document.getElementById(`mail${mailTp}_body`).value = data.body || '';
            window.ApiKeyMngrUI.updatePreview(mailTp);
            console.log(`과거 버전 ${version} 로드 성공 (mail${mailTp})`);
        } else {
            alert(`과거 버전 ${version}을 불러오지 못했습니다.`);
        }
    } catch (error) {
        console.error('과거 버전 로드 오류:', error);
        alert('과거 버전 로드 중 오류가 발생했습니다.');
    }
};

/**
 * 현재 데이터 로드
 */
window.ApiKeyMngrUI.loadCurrentVersion = async function(mailTp) {
    try {
        const result = await ApiKeyMngrData.getCurrentMailSetting(mailTp);
        
        if (result && result.success) {
            const data = result.data;
            // 폼에 데이터 채우기
            document.getElementById(`mail${mailTp}_subject`).value = data.subject || '';
            document.getElementById(`mail${mailTp}_from`).value = data.from_email || '';
            document.getElementById(`mail${mailTp}_body`).value = data.body || '';
            window.ApiKeyMngrUI.updatePreview(mailTp);
            console.log(`현재 데이터 로드 성공 (mail${mailTp})`);
        } else {
            alert('현재 데이터를 불러오지 못했습니다.');
        }
    } catch (error) {
        console.error('현재 데이터 로드 오류:', error);
        alert('현재 데이터 로드 중 오류가 발생했습니다.');
    }
};

/**
 * 과거 버튼 및 현재 데이터 버튼 상태 업데이트
 */
window.ApiKeyMngrUI.updateHistoryButtonStates = async function() {
    const mailTypes = ['30', '7', '0'];
    
    for (const mailTp of mailTypes) {
        const count = await ApiKeyMngrData.getMailSettingHistoryCount(mailTp);
        
        // 버전 1, 2, 3 버튼 상태 업데이트
        for (let v = 1; v <= 3; v++) {
            const btn = document.getElementById(`history-btn-${mailTp}-${v}`);
            if (btn) {
                if (v <= count) {
                    // 데이터 있음 - 활성화
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed', 'line-through');
                    btn.style.textDecoration = 'none';
                    btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                } else {
                    // 데이터 없음 - 비활성화 (취소선 적용, 색상은 유지)
                    btn.disabled = true;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    btn.classList.add('bg-gray-200', 'text-gray-700', 'line-through');
                    btn.style.textDecoration = 'line-through';
                }
            }
        }
        
        // 현재 데이터 버튼 상태 업데이트
        const currentBtn = document.getElementById(`history-btn-${mailTp}-current`);
        if (currentBtn) {
            try {
                const result = await ApiKeyMngrData.getCurrentMailSetting(mailTp);
                if (result && result.success && result.data) {
                    // 현재 데이터 있음 - 활성화
                    currentBtn.disabled = false;
                    currentBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'line-through');
                    currentBtn.style.textDecoration = 'none';
                    currentBtn.classList.add('bg-blue-500', 'text-white', 'hover:bg-blue-600');
                } else {
                    // 현재 데이터 없음 - 비활성화 (취소선 적용, 색상은 유지)
                    currentBtn.disabled = true;
                    currentBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    currentBtn.classList.add('bg-blue-500', 'text-white', 'line-through');
                    currentBtn.style.textDecoration = 'line-through';
                }
            } catch (error) {
                console.error(`현재 데이터 확인 오류 (mail${mailTp}):`, error);
                currentBtn.disabled = true;
                currentBtn.classList.add('bg-blue-500', 'text-white', 'line-through');
                currentBtn.style.textDecoration = 'line-through';
                currentBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }
};