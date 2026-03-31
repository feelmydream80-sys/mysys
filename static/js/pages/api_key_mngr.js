document.addEventListener('DOMContentLoaded', () => {
    // 초기 데이터 로드
    loadApiKeyMngrData();

    // 탭 전환 이벤트
    setupTabNavigation();

    // CD 업데이트 버튼 이벤트
    setupUpdateCdButton();
});

async function loadApiKeyMngrData() {
    ApiKeyMngrUI.showLoading(true);
    try {
        const data = await ApiKeyMngrData.loadApiKeyMngrData();
        ApiKeyMngrUI.renderApiKeyMngrTable(data);
    } catch (error) {
        ApiKeyMngrUI.showErrorMessage('API 키 관리 데이터를 불러오는 데 실패했습니다.');
    } finally {
        ApiKeyMngrUI.showLoading(false);
    }
}

async function loadApiKeyExpiryInfo() {
    ApiKeyMngrUI.showLoading(true);
    try {
        const data = await ApiKeyMngrData.loadApiKeyExpiryInfo();
        ApiKeyMngrUI.renderApiKeyExpiryChart(data);
    } catch (error) {
        console.error('API 키 유통기한 정보 조회 실패:', error);
        ApiKeyMngrUI.showErrorMessage('API 키 유통기한 정보를 불러오는 데 실패했습니다.');
    } finally {
        ApiKeyMngrUI.showLoading(false);
    }
}

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = tab.dataset.tab;

            // 모든 탭과 내용 숨기기
            tabs.forEach(t => t.classList.remove('active', 'bg-indigo-50', 'text-indigo-700'));
            tabContents.forEach(c => c.classList.add('hidden'));

            // 선택된 탭 활성화
            tab.classList.add('active', 'bg-indigo-50', 'text-indigo-700');
            const contentId = `content${tabId}`;
            const content = document.getElementById(contentId);
            if (content) {
                content.classList.remove('hidden');
            }

            // 탭에 따라 데이터 로드
            if (tabId === '1') {
                console.log('기간 차트 탭 선택');
                loadApiKeyExpiryInfo();
            }
        });
    });
}

function setupUpdateCdButton() {
    const updateCdButton = document.getElementById('update-cd-button');
    if (updateCdButton) {
        updateCdButton.addEventListener('click', async () => {
            ApiKeyMngrUI.showLoading(true);
            try {
                const result = await ApiKeyMngrData.updateCdFromMngrSett();
                if (result) {
                    ApiKeyMngrUI.showSuccessMessage(`성공적으로 ${result.added_count}개의 CD 값을 추가했습니다.`);
                    // 데이터 다시 로드
                    loadApiKeyMngrData();
                } else {
                    ApiKeyMngrUI.showErrorMessage('CD 업데이트에 실패했습니다.');
                }
            } catch (error) {
                ApiKeyMngrUI.showErrorMessage('CD 업데이트 중 오류가 발생했습니다.');
            } finally {
                ApiKeyMngrUI.showLoading(false);
            }
        });
    }
}
