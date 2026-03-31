class ApiKeyMngApi {
    static async getApiKeyMngData() {
        try {
            const response = await fetch('/api/api_key_mng');
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

    static async getApiKeyMngByCd(cd) {
        try {
            const response = await fetch(`/api/api_key_mng/${cd}`);
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

    static async createApiKeyMng(data) {
        try {
            const response = await fetch('/api/api_key_mng', {
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

    static async updateApiKeyMng(cd, data) {
        try {
            const response = await fetch(`/api/api_key_mng/${cd}`, {
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

    static async deleteApiKeyMng(cd) {
        try {
            const response = await fetch(`/api/api_key_mng/${cd}`, {
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
            const response = await fetch('/api/api_key_mng/update_cd', {
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

    static async getApiKeyExpiryInfo() {
        try {
            const response = await fetch('/api/api_key_mng/expiry_info');
            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                console.error('API 키 유통기한 정보 조회 실패:', data.message);
                return [];
            }
        } catch (error) {
            console.error('API 키 유통기한 정보 조회 오류:', error);
            return [];
        }
    }
}