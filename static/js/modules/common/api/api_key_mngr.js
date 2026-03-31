class ApiKeyMngrApi {
    static async getApiKeyMngrData() {
        try {
            const response = await fetch('/api/api_key_mngr');
            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                console.error('API 키 관리 데이터 조회 실패:', data.message);
                return [];
            }
        } catch (error) {
            console.error('API 키 관리 데이터 조회 오류:', error);
            return [];
        }
    }

    static async getApiKeyMngrByCd(cd) {
        try {
            const response = await fetch(`/api/api_key_mngr/${cd}`);
            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                console.error('API 키 관리 데이터 조회 실패:', data.message);
                return null;
            }
        } catch (error) {
            console.error('API 키 관리 데이터 조회 오류:', error);
            return null;
        }
    }

    static async createApiKeyMngr(data) {
        try {
            const response = await fetch('/api/api_key_mngr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (result.success) {
                return result;
            } else {
                console.error('API 키 관리 데이터 생성 실패:', result.message);
                return null;
            }
        } catch (error) {
            console.error('API 키 관리 데이터 생성 오류:', error);
            return null;
        }
    }

    static async updateApiKeyMngr(cd, data) {
        try {
            const response = await fetch(`/api/api_key_mngr/${cd}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (result.success) {
                return result;
            } else {
                console.error('API 키 관리 데이터 업데이트 실패:', result.message);
                return null;
            }
        } catch (error) {
            console.error('API 키 관리 데이터 업데이트 오류:', error);
            return null;
        }
    }

    static async deleteApiKeyMngr(cd) {
        try {
            const response = await fetch(`/api/api_key_mngr/${cd}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (result.success) {
                return result;
            } else {
                console.error('API 키 관리 데이터 삭제 실패:', result.message);
                return null;
            }
        } catch (error) {
            console.error('API 키 관리 데이터 삭제 오류:', error);
            return null;
        }
    }

    static async updateCdFromMngrSett() {
        try {
            const response = await fetch('/api/api_key_mngr/update_cds', {
                method: 'POST',
            });
            const result = await response.json();
            if (result.success) {
                return result;
            } else {
                console.error('CD 업데이트 실패:', result.message);
                return null;
            }
        } catch (error) {
            console.error('CD 업데이트 오류:', error);
            return null;
        }
    }
}