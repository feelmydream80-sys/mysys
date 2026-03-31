/**
 * API 키 관리 페이지의 데이터 모듈
 */

const apiKeyMngrData = {
    // API 키 관리 데이터
    apiKeyMngrData: [],

    /**
     * API 키 관리 데이터 로드
     */
    loadApiKeyMngrData: async function() {
        try {
            const response = await axios.get('/api/api_key_mngr');
            
            if (response.status === 200 && response.data.success) {
                this.apiKeyMngrData = response.data.data;
                console.log('API 키 관리 데이터 로드 성공:', this.apiKeyMngrData);
                return true;
            } else {
                console.error('API 키 관리 데이터 로드 실패:', response.data.message);
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
            const response = await axios.post('/api/api_key_mngr/update_cds');
            
            if (response.status === 200 && response.data.success) {
                console.log('CD 업데이트 성공:', response.data.result);
                // 데이터 다시 로드
                await this.loadApiKeyMngrData();
                return true;
            } else {
                console.error('CD 업데이트 실패:', response.data.message);
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
     */
    getNormalApiKeyMngrData: function() {
        return this.apiKeyMngrData.filter(item => item.api_key && item.days_remaining > 0);
    },

    /**
     * 비정상 상태의 API 키 관리 데이터 반환
     */
    getAbnormalApiKeyMngrData: function() {
        return this.apiKeyMngrData.filter(item => !item.api_key || item.days_remaining <= 0);
    },

    /**
     * API 키 관리 데이터 업데이트
     */
    updateApiKeyMngr: async function(cd, due, start_dt, api_ownr_email_addr) {
        try {
            const response = await axios.put(`/api/api_key_mngr/${cd}`, {
                due: due,
                start_dt: start_dt,
                api_ownr_email_addr: api_ownr_email_addr
            });
            
            if (response.status === 200 && response.data.success) {
                console.log('API 키 관리 데이터 업데이트 성공');
                // 데이터 다시 로드
                await this.loadApiKeyMngrData();
                return true;
            } else {
                console.error('API 키 관리 데이터 업데이트 실패:', response.data.message);
                return false;
            }
        } catch (error) {
            console.error('API 키 관리 데이터 업데이트 오류:', error);
            return false;
        }
    }
};

export default apiKeyMngrData;