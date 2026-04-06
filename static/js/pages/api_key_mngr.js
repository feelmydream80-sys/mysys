// API 키 관리 페이지 초기화
export async function init() {
    console.log('API 키 관리 페이지 초기화');
    
    // ui.js와 data.js가 로드될 때까지 대기
    let retries = 0;
    const maxRetries = 50; // 최대 5초 대기
    
    while (typeof window.ApiKeyMngrUI === 'undefined' && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    
    if (typeof window.ApiKeyMngrUI !== 'undefined') {
        window.ApiKeyMngrUI.init();
    } else {
        console.error('ApiKeyMngrUI is not defined after waiting');
    }
}
