/**
 * API 키 관리 페이지의 데이터 모듈
 * axios 대신 fetch API를 사용하여 SPA 라우팅 환경에서도 안정적으로 동작합니다.
 */

// API 응답을 처리하는 헬퍼 함수
async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

window.ApiKeyMngrData = {
    // API 키 관리 데이터
    apiKeyMngrData: [],

    /**
     * API 키 관리 데이터 로드
     */
    loadApiKeyMngrData: async function() {
        try {
            const data = await apiFetch('/api/api_key_mngr');
            
            if (data.success) {
                this.apiKeyMngrData = data.data;
                console.log('API 키 관리 데이터 로드 성공:', this.apiKeyMngrData);
                return true;
            } else {
                console.error('API 키 관리 데이터 로드 실패:', data.message);
                return false;
            }
        } catch (error) {
            console.error('API 키 관리 데이터 로드 오류:', error);
            return false;
        }
    },

    /**
     * CD 업데이트
     */
    updateCdFromMngrSett: async function() {
        try {
            const data = await apiFetch('/api/api_key_mngr/update_cds', {
                method: 'POST'
            });
            
            if (data.success) {
                console.log('CD 업데이트 성공:', data.result);
                // 데이터 다시 로드
                await this.loadApiKeyMngrData();
                return true;
            } else {
                console.error('CD 업데이트 실패:', data.message);
                return false;
            }
        } catch (error) {
            console.error('CD 업데이트 오류:', error);
            return false;
        }
    },

    /**
     * API 키 관리 데이터 반환
     */
    getApiKeyMngrData: function() {
        return this.apiKeyMngrData;
    },

    /**
     * 정상 상태의 API 키 관리 데이터 반환
     * - api_key 값이 있으면 만료일 관계없이 정상으로 분류
     */
    getNormalApiKeyMngrData: function() {
        return this.apiKeyMngrData.filter(item => item.api_key);
    },

    /**
     * 비정상 상태의 API 키 관리 데이터 반환
     * - api_key 값이 없거나 만료된 데이터
     */
    getAbnormalApiKeyMngrData: function() {
        return this.apiKeyMngrData.filter(item => !item.api_key || item.days_remaining <= 0);
    },

    /**
     * 위험군 API 키 관리 데이터 반환 (1개월 이내 만료 + 만료된 키 포함)
     */
    getRiskApiKeyMngrData: function() {
        return this.apiKeyMngrData.filter(item => item.api_key && item.days_remaining <= 30);
    },

    /**
     * API 키 관리 데이터 업데이트 (API 키 포함)
     */
    updateApiKeyMngr: async function(cd, due, start_dt, api_ownr_email_addr, api_key) {
        try {
            const data = await apiFetch(`/api/api_key_mngr/${cd}`, {
                method: 'PUT',
                body: JSON.stringify({
                    due: due,
                    start_dt: start_dt,
                    api_ownr_email_addr: api_ownr_email_addr,
                    api_key: api_key
                })
            });
            
            if (data.success) {
                console.log('API 키 관리 데이터 업데이트 성공');
                // 데이터 다시 로드
                await this.loadApiKeyMngrData();
                return true;
            } else {
                console.error('API 키 관리 데이터 업데이트 실패:', data.message);
                return false;
            }
        } catch (error) {
            console.error('API 키 관리 데이터 업데이트 오류:', error);
            return false;
        }
    },

    /**
     * 알림 메일 전송 (선택된 CD 목록에 대해)
     * Following the same pattern as Airflow's ServiceMonitor.send_emails()
     */
    sendEmail: async function(cds) {
        try {
            const data = await apiFetch('/api/api_key_mngr/send_email', {
                method: 'POST',
                body: JSON.stringify({ cds: cds })
            });
            
            if (data.success) {
                console.log('메일 발송 성공:', data.results);
                return data;
            } else {
                console.error('메일 발송 실패:', data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('메일 발송 오류:', error);
            return { success: false, message: error.message };
        }
    },

    // ==========================================
    // 메일 전송 이력 관련 (신규 추가)
    // ==========================================

    /**
     * 메일 전송 이력 조회
     */
    getMailSendHistory: async function(page = 1, pageSize = 50, filters = {}) {
        try {
            const params = new URLSearchParams({
                page: page,
                page_size: pageSize,
                ...filters
            });
            const data = await apiFetch(`/api/api_key_mngr/mail_send_history?${params}`);
            
            if (data.success) {
                return data.data;
            } else {
                console.error('메일 전송 이력 조회 실패:', data.message);
                return { logs: [], pagination: {} };
            }
        } catch (error) {
            console.error('메일 전송 이력 조회 오류:', error);
            return { logs: [], pagination: {} };
        }
    },

    /**
     * 스케줄 메일 발송 (수동 실행)
     */
    sendScheduledMails: async function(targetCds = null, excludeCds = null) {
        try {
            const data = await apiFetch('/api/api_key_mngr/send_scheduled_mails', {
                method: 'POST',
                body: JSON.stringify({
                    target_cds: targetCds,
                    exclude_cds: excludeCds
                })
            });
            
            if (data.success) {
                console.log('스케줄 메일 발송 성공:', data.results);
                return data;
            } else {
                console.error('스케줄 메일 발송 실패:', data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('스케줄 메일 발송 오류:', error);
            return { success: false, message: error.message };
        }
    },

    // ==========================================
    // 스케줄 설정 관련 (신규 추가)
    // ==========================================

    /**
     * 스케줄 설정 조회
     */
    getScheduleSettings: async function() {
        try {
            const data = await apiFetch('/api/api_key_mngr/schedule_settings');
            
            if (data.success) {
                return data.settings;
            } else {
                console.error('스케줄 설정 조회 실패:', data.message);
                return [];
            }
        } catch (error) {
            console.error('스케줄 설정 조회 오류:', error);
            return [];
        }
    },

    /**
     * 스케줄 설정 저장
     */
    saveScheduleSettings: async function(settings) {
        try {
            const data = await apiFetch('/api/api_key_mngr/schedule_settings', {
                method: 'POST',
                body: JSON.stringify(settings)
            });
            
            if (data.success) {
                console.log('스케줄 설정 저장 성공');
                return true;
            } else {
                console.error('스케줄 설정 저장 실패:', data.message);
                return false;
            }
        } catch (error) {
            console.error('스케줄 설정 저장 오류:', error);
            return false;
        }
    },

    // ==========================================
    // 위험군 메일 전송 상태 관련 (신규 추가)
    // ==========================================

    /**
     * 위험군용 메일 전송 이력 조회 (CD별 최신 성공 이력)
     */
    getMailStatusForRiskGroup: async function() {
        try {
            // 모든 메일 전송 이력 조회 (페이지 크기 크게)
            const params = new URLSearchParams({
                page: 1,
                page_size: 1000
            });
            const data = await apiFetch(`/api/api_key_mngr/mail_send_history?${params}`);
            
            if (data.success) {
                const logs = data.data.logs || [];
                
                // CD별로 그룹화하여 최신 성공 이력만 추출
                const mailStatusMap = {};
                
                logs.forEach(log => {
                    const cd = log.cd;
                    if (!mailStatusMap[cd]) {
                        mailStatusMap[cd] = {
                            success: [],
                            failed: []
                        };
                    }
                    
                    if (log.success) {
                        mailStatusMap[cd].success.push({
                            sent_dt: log.sent_dt,
                            mail_tp: log.mail_tp,
                            reg_dt: log.reg_dt
                        });
                    } else {
                        mailStatusMap[cd].failed.push({
                            sent_dt: log.sent_dt,
                            mail_tp: log.mail_tp,
                            error_msg: log.error_msg,
                            reg_dt: log.reg_dt
                        });
                    }
                });
                
                // 날짜 기준으로 정렬 (최신순)
                Object.keys(mailStatusMap).forEach(cd => {
                    mailStatusMap[cd].success.sort((a, b) => new Date(b.sent_dt) - new Date(a.sent_dt));
                    mailStatusMap[cd].failed.sort((a, b) => new Date(b.sent_dt) - new Date(a.sent_dt));
                });
                
                return mailStatusMap;
            } else {
                console.error('메일 전송 이력 조회 실패:', data.message);
                return {};
            }
        } catch (error) {
            console.error('메일 전송 이력 조회 오류:', error);
            return {};
        }
    },

    /**
     * 스케줄 설정 조회 (시간 정보 포함)
     */
    getScheduleHourInfo: async function() {
        try {
            const data = await apiFetch('/api/api_key_mngr/schedule_settings');
            
            if (data.success) {
                const settings = data.data.settings || [];
                const hourInfo = {};
                
                settings.forEach(s => {
                    if (s.is_active) {
                        hourInfo[s.schd_tp] = {
                            hour: s.schd_hour,
                            cycle: s.schd_cycle
                        };
                    }
                });
                
                return hourInfo;
            }
            return {};
        } catch (error) {
            console.error('스케줄 설정 조회 오류:', error);
            return {};
        }
    },

    /**
     * 테스트 메일 발송
     */
    sendTestMail: async function(testEmail) {
        try {
            const data = await apiFetch('/api/api_key_mngr/send_test_mail', {
                method: 'POST',
                body: JSON.stringify({ test_email: testEmail })
            });
            
            if (data.success) {
                console.log('테스트 메일 발송 성공:', data.message);
                return data;
            } else {
                console.error('테스트 메일 발송 실패:', data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('테스트 메일 발송 오류:', error);
            return { success: false, message: error.message };
        }
    },

    // ==========================================
    // 메일 설정 이력 관련 (신규 추가)
    // ==========================================

    /**
     * 메일 설정 이력 조회 (과거 버전)
     * @param {string} mailTp - 메일 유형 ('30', '7', '0')
     * @param {number} version - 버전 번호 (1=최신에서 3번째 전, 2=2번째 전, 3=3번째 전)
     */
    getMailSettingHistory: async function(mailTp, version) {
        try {
            const data = await apiFetch(`/api/api_key_mngr/mail_setting_history?mail_tp=mail${mailTp}&version=${version}`);
            
            if (data.success) {
                return data;
            } else {
                console.error('메일 설정 이력 조회 실패:', data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('메일 설정 이력 조회 오류:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * 현재 메일 설정 조회
     * @param {string} mailTp - 메일 유형 ('30', '7', '0')
     */
    getCurrentMailSetting: async function(mailTp) {
        try {
            const data = await apiFetch(`/api/api_key_mngr/mail_settings`);
            
            if (data.success) {
                const settings = data.data.settings || {};
                const key = `mail${mailTp}`;
                const setting = settings[key] || {};
                
                return {
                    success: true,
                    data: {
                        subject: setting.subject || '',
                        from_email: setting.from || '',
                        body: setting.body || ''
                    }
                };
            } else {
                console.error('현재 메일 설정 조회 실패:', data.message);
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('현재 메일 설정 조회 오류:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * 메일 설정 이력 개수 조회
     * @param {string} mailTp - 메일 유형 ('30', '7', '0')
     * @returns {number} 이력 개수
     */
    getMailSettingHistoryCount: async function(mailTp) {
        try {
            const data = await apiFetch(`/api/api_key_mngr/mail_setting_history_count?mail_tp=mail${mailTp}`);
            
            if (data.success) {
                return data.count || 0;
            }
            return 0;
        } catch (error) {
            console.error('메일 설정 이력 개수 조회 오류:', error);
            return 0;
        }
    }
};
