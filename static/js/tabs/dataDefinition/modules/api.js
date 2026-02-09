import { API_ENDPOINTS } from './constants.js';

// API 호출 함수
export async function callAPI(endpoint, method = 'GET', data = null) {
    try {
        const url = `/api/${endpoint}`;
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        console.log(`HTTP 요청: ${method} ${url}`, options);
        
        const response = await fetch(url, options);
        
        console.log(`HTTP 응답: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`API 응답 성공: ${endpoint}`, result);
        
        return result;
    } catch (error) {
        console.log(`API 호출 실패: ${endpoint}`, error);
        throw error;
    }
}

// 그룹 데이터 가져오기
export async function getGroups() {
    return callAPI(API_ENDPOINTS.GROUPS);
}

// 그룹/데이터 생성
export async function createItem(data) {
    return callAPI(API_ENDPOINTS.CREATE, 'POST', data);
}

// 그룹 수정
export async function updateGroup(cd, data) {
    return callAPI(`${API_ENDPOINTS.GROUP_UPDATE}/${cd}`, 'PUT', data);
}

// 그룹 삭제
export async function deleteGroup(cd) {
    return callAPI(`${API_ENDPOINTS.GROUP_UPDATE}/${cd}`, 'DELETE');
}

// 상세 데이터 수정
export async function updateDetail(cd, data) {
    return callAPI(`${API_ENDPOINTS.DETAIL_UPDATE}/${cd}`, 'PUT', data);
}