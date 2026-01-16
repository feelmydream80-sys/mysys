/**
 * 엑셀 템플릿 다운로드 공통 함수
 * 모든 메뉴에서 수집 요청서 양식 다운로드를 위해 사용
 */

export async function downloadExcelTemplate() {
    try {
        // console.log('Excel template download - Starting download request');
        const response = await fetch('/api/excel_template/download');
        // console.log('Excel template download - Response status:', response.status);
        // console.log('Excel template download - Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            if (response.status === 404) {
                showToast('다운로드할 엑셀 템플릿이 없습니다.', 'warning');
            } else {
                throw new Error('다운로드에 실패했습니다.');
            }
            return;
        }

        // Content-Disposition 헤더 확인
        const contentDisposition = response.headers.get('Content-Disposition');
        // console.log('Excel template download - Content-Disposition header:', contentDisposition);

        // Content-Disposition에서 filename 추출
        let filename = 'excel_template.xlsx'; // 기본값
        if (contentDisposition) {
            // filename* 파라미터 우선 처리 (한글 지원)
            const filenameStarMatch = contentDisposition.match(/filename\*=([^;]+)/);
            if (filenameStarMatch) {
                const filenameStar = filenameStarMatch[1].trim();
                // filename*=UTF-8''encoded-string
                const parts = filenameStar.split("''");
                if (parts.length === 2) {
                    const encodedFilename = parts[1];
                    try {
                        filename = decodeURIComponent(encodedFilename);
                    } catch (e) {
                        console.warn('Failed to decode filename*:', e);
                        filename = encodedFilename; // fallback
                    }
                }
            } else {
                // 기존 filename 파라미터 처리
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
        }
        // console.log('Excel template download - Extracted filename:', filename);

        // 파일 다운로드 처리
        const blob = await response.blob();
        // console.log('Excel template download - Blob size:', blob.size);
        const url = window.URL.createObjectURL(blob);
        // console.log('Excel template download - Blob URL:', url);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename; // 추출된 filename 설정
        // console.log('Excel template download - a.download after setting:', a.download);
        document.body.appendChild(a);
        a.click();
        // console.log('Excel template download - Download triggered');
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // console.log('Excel template download - Success');
    } catch (error) {
        // console.error('Excel template download - Error:', error);
        throw error; // 에러를 다시 던져서 각 파일에서 처리하도록 함
    }
}
