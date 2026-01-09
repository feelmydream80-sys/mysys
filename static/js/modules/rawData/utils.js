/**
 * @module utils
 * @description 유용한 헬퍼 함수들을 제공하는 모듈
 */

/**
 * 숫자를 천 단위 콤마가 있는 문자열로 변환합니다.
 * @param {number|string} n - 변환할 숫자 또는 숫자 형식의 문자열
 * @returns {string} 포맷팅된 문자열
 * 
 * @example
 * // 사용 예시
 * import { formatNumber } from './utils.js';
 * 
 * formatNumber(1234567); // "1,234,567"
 * formatNumber('1234.5'); // "1,234.5"
 */
export function formatNumber(n) {
    if (typeof n === 'number') return n.toLocaleString();
    if (!isNaN(n) && n !== null && n !== undefined && n !== '') return Number(n).toLocaleString();
    return n;
}

/**
 * 숫자를 축약된 형태(예: 12.3만)로 변환합니다.
 * @param {number|string} n - 변환할 숫자
 * @returns {string} 포맷팅된 문자열
 */
export function formatNumberAbbreviated(n) {
    const num = Number(n);
    if (isNaN(num)) return n;

    if (num >= 100000) {
        return (num / 10000).toFixed(1) + '만';
    }
    return num.toLocaleString();
}

/**
 * 상태 코드에 따라 CSS 클래스를 반환합니다.
 * @param {string} status - 상태 코드 (e.g., 'CD901')
 * @param {object} errorCodeMap - 장애 코드 매핑 객체 (선택적)
 * @returns {string} Tailwind CSS 클래스 문자열
 *
 * @example
 * // 사용 예시
 * import { getStatusClass } from './utils.js';
 *
 * const successClass = getStatusClass('CD901'); // "text-green-600 font-semibold"
 * const failClass = getStatusClass('CD902');    // "text-red-600 font-semibold"
 */
export function getStatusClass(status, errorCodeMap = {}) {
    // 기본 색상 매핑 (CD900번대 코드용)
    const defaultColorMap = {
        'CD901': 'text-green-600 font-semibold',
        'CD902': 'text-red-600 font-semibold',
        'CD903': 'text-gray-500 font-semibold',
        'CD904': 'text-blue-600 font-semibold'
    };

    return defaultColorMap[status] || 'text-gray-700 font-semibold';
}

/**
 * 데이터를 필터링합니다.
 * @param {Object} state - 현재 애플리케이션 상태 객체
 * @returns {Array<Object>} 필터링된 데이터 배열
 * 
 * @example
 * // 사용 예시
 * import { filterData } from './utils.js';
 * 
 * const state = {
 *   allData: [{...}, {...}],
 *   selectedJobId: 'JOB001',
 *   startDate: '2023-01-01',
 *   endDate: '2023-12-31',
 *   searchTerm: 'success',
 *   errorCodeMap: { 'CD901': '성공' }
 * };
 * const filtered = filterData(state);
 */
export function filterData(state) {
    const { allData, searchTerm, errorCodeMap } = state;
    const selectedJobId = document.getElementById('job-id-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    let filtered = allData.filter(row => {
        let ok = true;
        if (selectedJobId && row.job_id !== selectedJobId) ok = false;
        if (startDate && new Date(row.start_dt) < new Date(startDate)) ok = false;
        if (endDate && new Date(row.start_dt) > new Date(endDate + 'T23:59:59')) ok = false;
        return ok;
    });
    
    // 검색어 필터링 추가
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(row => {
            const statusKey = row.status ? String(row.status).trim() : '';
            const statusLabel = errorCodeMap[statusKey] ? String(errorCodeMap[statusKey]).trim() : '';

            const values = [
                row.job_id,
                statusKey,
                statusLabel,
                row.start_dt,
                row.rqs_info
            ];

            return values.some(value => {
                if (value) {
                    return String(value).toLowerCase().includes(searchLower);
                }
                return false;
            });
        });
    }
    
    return filtered;
}

/**
 * 엑셀 다운로드 기능을 수행합니다.
 * @param {Array<Object>} filteredData - 필터링된 데이터
 * @param {object} errorCodeMap - 장애 코드 매핑 객체 (선택적)
 */
export function downloadExcel(filteredData, errorCodeMap = {}) {
    // SheetJS 라이브러리가 로드되었는지 확인
    if (typeof XLSX === 'undefined') {
        alert('엑셀 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    // 성공/실패/미수집/수집중 요약 계산
    const statusCount = {};
    let totalSuccess = 0, totalCount = 0;
    filteredData.forEach(row => {
        // 성공/총수량 계산
        let total = 0, fail = 0, success = 0;
        const match = row.rqs_info && row.rqs_info.match(/(총 요청 수|총 요청 수): (\d+), (실패|실패): (\d+)/);
        if (match) {
            total = parseInt(match[2]);
            fail = parseInt(match[4]);
            success = total - fail;
        }
        totalSuccess += success;
        totalCount += total;
        statusCount[row.status] = (statusCount[row.status] || 0) + 1;
    });
    const totalPercent = totalCount > 0 ? Math.round((totalSuccess / totalCount) * 100) : 0;

    // 상태별 요약 텍스트
    const totalRows = filteredData.length;
    let statusSummary = `전체 성공률: ${totalSuccess}/${totalCount} (${totalPercent}%) | `;

    // 모든 상태 코드에 대해 처리
    Object.keys(statusCount).forEach(code => {
        const count = statusCount[code] || 0;
        const percent = totalRows > 0 ? ((count / totalRows) * 100).toFixed(1) : '0.0';
        const label = errorCodeMap[code] || code;
        statusSummary += `${label} ${count}건(${percent}%)  `;
    });

    // 워크시트 데이터 생성
    const wsData = [
        [statusSummary.trim()]
    ];
    wsData.push(['수집시작일', '수집종료일', '연결ID', '코드명', '성공/총수량', '성공여부']);
    
    filteredData.forEach(row => {
        let total = 0, fail = 0, success = 0, percent = 0;
        const match = row.rqs_info && row.rqs_info.match(/(총 요청 수|총 요청 수): (\d+), (실패|실패): (\d+)/);
        if (match) {
            total = parseInt(match[2]);
            fail = parseInt(match[4]);
            success = total - fail;
            percent = total > 0 ? Math.round((success / total) * 100) : 0;
        }
        wsData.push([
            new Date(row.start_dt) || '',
            new Date(row.end_dt) || '',
            row.con_id || '',
            row.job_id || '',
            `${success}/${total} (${percent}%)`,
            row.status || ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '상세데이터');
    XLSX.writeFile(wb, '상세데이터.xlsx');
}
