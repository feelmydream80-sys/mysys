/**
 * 날짜 및 시간 유틸리티 모듈 (KST 기준)
 * 모든 시간 관련 처리는 이 모듈을 통해统一적으로管理
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9 (KST)

/**
 * 현재 시간을 KST 기준으로 반환합니다.
 * @returns {Date} KST 기준 현재 시간
 */
export function getKSTNow() {
    return new Date(Date.now() + KST_OFFSET_MS);
}

/**
 * Date 객체를 KST 시간대로 변환합니다.
 * @param {Date|string} date - 변환할 Date 객체 또는 날짜 문자열
 * @returns {Date} KST 시간대 Date 객체
 */
export function toKST(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return null;
    }
    return new Date(d.getTime() + KST_OFFSET_MS);
}

/**
 * 날짜를 YYYY-MM-DD 형식의 문자열로 변환합니다.
 * @param {Date} date - 변환할 Date 객체
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 날짜와 시간을 KST 기준으로 포맷팅합니다.
 * @param {Date|string} date - 포맷팅할 날짜 (Date 객체 또는 문자열)
 * @param {string} format - 포맷 형식 (기본값: 'YYYY-MM-DD')
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDateTime(date, format = 'YYYY-MM-DD') {
    // 문자열이 들어온 경우
    if (typeof date === 'string') {
        // 시간대 정보가 포함된 경우 (+09:00 = KST)
        if (date.includes('+09:00')) {
            return date.replace('+09:00', '');
        }
        // GMT/UTC가 포함된 경우 - UTC → KST 변환 필요
        if (date.includes('GMT') || date.includes('UTC')) {
            // GMT 제거하고 수동 파싱
            const dateStr = date.replace('GMT', '').replace('UTC', '').trim();
            // RFC 2822 형식 파싱: "Mon, 13 Apr 2026 08:35:35"
            const parts = dateStr.match(/(\d+)\s+(\w+)\s+(\d+)\s+(\d+):(\d+):(\d+)/);
            if (parts) {
                const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
                const year = parseInt(parts[3]);
                const month = months[parts[2]];
                const day = parseInt(parts[1]);
                const hours = parseInt(parts[4]) + 9; // UTC → KST (시간 더하기)
                const minutes = parseInt(parts[5]);
                const seconds = parseInt(parts[6]);
                
                // 날짜Overflow 처리
                let newDay = day;
                let newMonth = month;
                let newYear = year;
                let newHours = hours;
                
                if (hours >= 24) {
                    newHours = hours - 24;
                    newDay = day + 1;
                    //月末 처리
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    if (newDay > daysInMonth) {
                        newDay = 1;
                        newMonth = month + 1;
                        if (newMonth > 11) {
                            newMonth = 0;
                            newYear = year + 1;
                        }
                    }
                }
                
                return `${newYear}-${String(newMonth + 1).padStart(2, '0')}-${String(newDay).padStart(2, '0')} ${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
            return date;
        }
        // 시간대 정보 없으면 그대로 반환
        return date;
    }
    
    const d = toKST(date);
    
    if (!d) {
        return 'Invalid Date';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

/**
 * 지정된 일수 이전부터 오늘까지의 날짜 범위를 가져옵니다.
 * @param {number} daysAgo - 오늘로부터 며칠 전을 시작일로 할지 지정합니다.
 * @returns {{startDate: string, endDate: string}} 시작일과 종료일(오늘)
 */
export function getDateRange(daysAgo) {
    const today = getKSTNow();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysAgo);

    return {
        startDate: formatDate(startDate),
        endDate: formatDate(today)
    };
}

/**
 * 기본 날짜 범위를 가져옵니다.
 * @returns {{startDateValue: string, todayDate: string}} 2024년 2월 7일부터 오늘 날짜
 */
export function getDefaultDateRange() {
    const today = getKSTNow();

    const startDate = new Date(2024, 1, 7); // 2월은 1, 7일

    const todayDate = formatDate(today);
    const startDateValue = formatDate(startDate);

    return { startDateValue, todayDate };
}

/**
 * 페이지의 날짜 입력 필드에 기본값을 설정합니다.
 * 'start-date'와 'end-date' ID를 가진 요소를 찾아 값을 설정합니다.
 */
export function setDefaultDates() {
    const { startDateValue, todayDate } = getDefaultDateRange();

    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    if (startDateInput) {
        startDateInput.value = startDateValue;
    }
    if (endDateInput) {
        endDateInput.value = todayDate;
    }
}

/**
 * 페이지의 날짜 입력 필드에 '올해 1월 1일'부터 '오늘'까지의 값을 설정합니다.
 * 'start-date'와 'end-date' ID를 가진 요소를 찾아 값을 설정합니다.
 */
export function setYearToDate() {
    const today = getKSTNow();
    const year = today.getFullYear();
    const startDate = new Date(year, 0, 1);

    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    if (startDateInput) {
        startDateInput.value = formatDate(startDate);
    }
    if (endDateInput) {
        endDateInput.value = formatDate(today);
    }
}
