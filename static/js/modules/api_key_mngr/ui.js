/**
 * API 키 관리 페이지의 UI 진입점
 * - 모든 모듈을 통합하여 전역 ApiKeyMngrUI 객체 제공
 * - 이 파일은 반드시 core.js, table.js, chart.js, settings.js 이후에 로드되어야 함
 */

// ApiKeyMngrUI가 이미 정의되어 있는지 확인 (모듈들이 로드되었는지)
if (typeof window.ApiKeyMngrUI === 'undefined') {
    window.ApiKeyMngrUI = {};
}

// init 함수가 core.js에 정의되어 있는지 확인
if (typeof window.ApiKeyMngrUI.init === 'undefined') {
    console.error('ApiKeyMngrUI.init이 정의되지 않았습니다. core.js가 로드되었는지 확인하세요.');
}

console.log('ApiKeyMngrUI 모듈 로드 완료');